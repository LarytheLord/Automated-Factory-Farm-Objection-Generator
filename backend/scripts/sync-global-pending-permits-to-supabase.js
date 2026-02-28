#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const LEGACY_PAYLOAD_MARKER = 'Original Payload JSON:';
const DEFAULT_LOOKBACK_DAYS = Number.parseInt(process.env.GLOBAL_PENDING_LOOKBACK_DAYS || '120', 10);

const SOURCE_DEFS = {
  uk: {
    key: 'uk_gov_environment_agency_notice',
    name: 'GOV.UK Environment Agency Permit Application Notices',
  },
  us_nc: {
    key: 'us_nc_deq_application_tracker',
    name: 'North Carolina DEQ Application Tracker',
  },
  us_ar: {
    key: 'us_arkansas_deq_pds',
    name: 'Arkansas DEQ Permit Data System',
  },
  au: {
    key: 'au_epbc_referrals',
    name: 'Australian EPBC Referrals Public Register',
  },
  ie: {
    key: 'ie_epa_leap',
    name: 'Ireland EPA LEAP Licensing API',
  },
  ca_on: {
    key: 'ca_on_ero_instruments',
    name: 'Ontario Environmental Registry (ERO) Instruments',
  },
};

const PENDING_STATUS_RE = /\b(pending|application pending|in review|under review|in process|processing|applied|application received|submitted|publish pending)\b/i;
const FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|intensive farming|factory farm)\b/i;
const INTENSIVE_KEYWORDS_RE = /\b(intensive farming|rearing of poultry intensively|section\s*6\.9|6\.9\s*a\(1\)|animal operations)\b/i;
const AU_NOT_PENDING_RE = /\b(completed|post-approval|lapsed|withdrawn|refused|approval decision made|referral decision made)\b/i;
const ONTARIO_FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|intensive farming|factory farm|feedlot|fish farm|aquaculture)\b/i;

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeGovPath(pathOrUrl) {
  const input = normalizeText(pathOrUrl);
  if (!input) return null;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const parsed = new URL(input);
      return parsed.pathname || null;
    } catch (_error) {
      return null;
    }
  }
  return input.startsWith('/') ? input : `/${input}`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateCandidate(raw) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function stripTags(html) {
  return normalizeText(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value) {
  return normalizeText(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function toSafeJson(value, maxChars = 50000) {
  const raw = JSON.stringify(value, null, 2);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n...TRUNCATED...`;
}

async function fetchJson(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  values.push(current);
  return values;
}

function parseCsvTable(rawCsv) {
  const lines = rawCsv.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const obj = {};
    for (let j = 0; j < header.length; j += 1) {
      obj[header[j]] = row[j];
    }
    rows.push(obj);
  }
  return rows;
}

function buildLegacyNotes({
  sourceKey,
  sourceName,
  sourceUrl,
  externalId,
  publishedAt,
  consultationDeadline,
  summary,
  payload,
}) {
  const lines = [
    'Official pending permit record (trusted source).',
    `Source Key: ${sourceKey}`,
    `Source Name: ${sourceName}`,
    `Source URL: ${sourceUrl}`,
    `External ID: ${externalId || ''}`,
    `Published at: ${publishedAt || ''}`,
    `Consultation deadline: ${consultationDeadline || ''}`,
    summary ? `Summary: ${summary}` : '',
    LEGACY_PAYLOAD_MARKER,
    toSafeJson(payload),
  ].filter(Boolean);
  return lines.join('\n');
}

function extractAttachmentPaths(content) {
  const urls = new Set();
  const directAttachments = Array.isArray(content?.details?.attachments) ? content.details.attachments : [];
  for (const attachment of directAttachments) {
    const url = normalizeText(attachment?.url);
    if (url) urls.add(url);
  }

  const documents = Array.isArray(content?.details?.documents) ? content.details.documents : [];
  for (const documentItem of documents) {
    const attachments = Array.isArray(documentItem?.attachments) ? documentItem.attachments : [];
    for (const attachment of attachments) {
      const url = normalizeText(attachment?.url || attachment?.document_url || attachment?.preview_url);
      if (url) urls.add(url);
    }
  }

  return Array.from(urls).slice(0, 3);
}

function findConsultationDeadline(text) {
  const cleaned = normalizeText(text).replace(/\s+/g, ' ');
  const regex = /\b(?:by|before|until|deadline(?:\s+for\s+comments)?|comments\s+by|representations\s+by)\b[^.:\n]{0,120}?(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi;
  let match = regex.exec(cleaned);
  while (match) {
    const parsed = parseDateCandidate(match[1]);
    if (parsed) return parsed;
    match = regex.exec(cleaned);
  }
  return null;
}

function buildUpsertRecord(record, useSourceMetadataColumns, nowIso) {
  const sourcePayload = record.source_payload || {};
  const common = {
    project_title: record.project_title,
    location: record.location,
    country: record.country,
    activity: record.activity,
    status: 'pending',
    category: record.category || 'Red',
    updated_at: nowIso,
  };

  if (useSourceMetadataColumns) {
    return {
      ...common,
      ingest_key: record.ingest_key,
      source_key: record.source_key,
      source_name: record.source_name,
      source_url: record.source_url,
      external_id: record.external_id,
      notes: record.notes,
      published_at: record.published_at || null,
      consultation_deadline: record.consultation_deadline || null,
      source_payload: sourcePayload,
    };
  }

  return {
    ...common,
    notes: buildLegacyNotes({
      sourceKey: record.source_key,
      sourceName: record.source_name,
      sourceUrl: record.source_url,
      externalId: record.external_id,
      publishedAt: record.published_at || '',
      consultationDeadline: record.consultation_deadline || '',
      summary: record.notes,
      payload: sourcePayload,
    }),
  };
}

function buildLegacyPermitKey(permit) {
  return [
    normalizeText(permit?.project_title).toLowerCase(),
    normalizeText(permit?.location).toLowerCase(),
    normalizeText(permit?.country).toLowerCase(),
  ].join('::');
}

async function supportsSourceMetadataColumns() {
  const { error } = await supabase.from('permits').select('id,ingest_key,source_payload').limit(1);
  if (!error) return true;
  const message = String(error.message || '');
  if (message.includes('column permits.ingest_key does not exist')) return false;
  if (message.includes('column permits.source_payload does not exist')) return false;
  throw error;
}

async function upsertPermits(records, useSourceMetadataColumns) {
  if (!records.length) return { inserted: 0, updated: 0 };
  const nowIso = new Date().toISOString();
  const payload = records.map((record) => buildUpsertRecord(record, useSourceMetadataColumns, nowIso));

  if (useSourceMetadataColumns) {
    const { error } = await supabase
      .from('permits')
      .upsert(payload, { onConflict: 'ingest_key' });
    if (error) throw error;
    return { inserted: payload.length, updated: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('permits')
    .select('id,project_title,location,country')
    .range(0, 15000);
  if (existingError) throw existingError;

  const existingByKey = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    existingByKey.set(buildLegacyPermitKey(row), row.id);
  }

  let inserted = 0;
  let updated = 0;

  for (const record of payload) {
    const key = buildLegacyPermitKey(record);
    const existingId = existingByKey.get(key);
    if (existingId) {
      const { error } = await supabase
        .from('permits')
        .update(record)
        .eq('id', existingId);
      if (error) throw error;
      updated += 1;
    } else {
      const { data, error } = await supabase
        .from('permits')
        .insert(record)
        .select('id')
        .single();
      if (error) throw error;
      existingByKey.set(key, data?.id);
      inserted += 1;
    }
  }

  return { inserted, updated };
}

function buildIngestKey(sourceKey, externalId, title, location, country) {
  const stableExternal = normalizeText(externalId);
  if (stableExternal) return `${sourceKey}:${stableExternal}`.replace(/\s+/g, '_').toLowerCase();
  const fallback = `${normalizeText(title)}:${normalizeText(location)}:${normalizeText(country)}`
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
    .slice(0, 140);
  return `${sourceKey}:${fallback}`;
}

async function fetchUkPendingPermits(now, lookbackDays) {
  const GOV_BASE = 'https://www.gov.uk';
  const SEARCH_ENDPOINT = `${GOV_BASE}/api/search.json`;
  const CONTENT_ENDPOINT = `${GOV_BASE}/api/content`;
  const source = SOURCE_DEFS.uk;

  const q = encodeURIComponent('"environmental permit application advertisement"');
  const url = `${SEARCH_ENDPOINT}?q=${q}&count=200&order=-public_timestamp`;
  const payload = await fetchJson(url);
  const rows = Array.isArray(payload?.results) ? payload.results.filter((row) => row.format === 'notice') : [];
  const results = [];

  for (const row of rows) {
    try {
      const noticePath = normalizeGovPath(row.link);
      if (!noticePath) continue;
      const content = await fetchJson(`${CONTENT_ENDPOINT}${noticePath}`);

      const attachmentPaths = extractAttachmentPaths(content);
      const attachments = [];
      for (const attachmentPath of attachmentPaths) {
        try {
          const attachment = await fetchJson(`${CONTENT_ENDPOINT}${attachmentPath}`);
          attachments.push(attachment);
        } catch (_error) {
          // Ignore attachment failures.
        }
      }

      const title = normalizeText(content?.title || row.title);
      const description = normalizeText(content?.description || row.description);
      const body = stripTags(content?.details?.body || '');
      const attachmentText = attachments.map((item) => stripTags(item?.details?.body || '')).join('\n');
      const text = `${title}\n${description}\n${body}\n${attachmentText}`;
      if (!FARM_KEYWORDS_RE.test(text) || !INTENSIVE_KEYWORDS_RE.test(text)) continue;

      const publishedAtDate = parseDateCandidate(content?.public_updated_at || row?.public_timestamp);
      if (!publishedAtDate) continue;
      const oldestAllowed = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
      if (publishedAtDate < oldestAllowed) continue;

      const deadline = findConsultationDeadline(text);
      if (!deadline) continue;
      if (deadline < new Date(now.toISOString().slice(0, 10))) continue;

      const refMatch = title.match(/EPR\/[A-Z0-9]+\/[A-Z0-9]+/i);
      const externalId = refMatch ? refMatch[0].toUpperCase() : (content?.content_id || noticePath);
      const sourceUrl = `${GOV_BASE}${noticePath}`;

      results.push({
        ingest_key: buildIngestKey(source.key, externalId, title, title.split(':')[0], 'United Kingdom'),
        source_key: source.key,
        source_name: source.name,
        source_url: sourceUrl,
        external_id: externalId,
        project_title: title,
        location: normalizeText(title.split(':')[0], 'United Kingdom'),
        country: 'United Kingdom',
        activity: /pig|swine|sow|hog/i.test(text)
          ? 'Intensive Pig Farm Permit Application'
          : 'Intensive Poultry Farm Permit Application',
        category: 'Red',
        notes: `Official EA permit application notice. Consultation deadline: ${toIsoDate(deadline)}.`,
        published_at: publishedAtDate.toISOString(),
        consultation_deadline: toIsoDate(deadline),
        source_payload: { notice: content, attachments },
      });
    } catch (_error) {
      // Skip rows with malformed content.
    }
  }

  return results;
}

async function fetchNcPendingPermits() {
  const source = SOURCE_DEFS.us_nc;
  const endpoint = 'https://maps.deq.nc.gov/arcgis/rest/services/DEQ/ApplicationTracker/MapServer/2/query';
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'APP_ID,NAME,ADDRESS,CITY,STATE,COUNTY,PROG_CAT,STATUS,PERMIT_TYPE,RECV_DT',
    orderByFields: 'RECV_DT DESC',
    resultRecordCount: '1200',
    returnGeometry: 'false',
    f: 'json',
  });
  const payload = await fetchJson(`${endpoint}?${params.toString()}`, 60000);
  const rows = Array.isArray(payload?.features) ? payload.features.map((f) => f.attributes || {}) : [];

  return rows
    .filter((row) => PENDING_STATUS_RE.test(row.STATUS || '') && FARM_KEYWORDS_RE.test([row.NAME, row.PROG_CAT, row.PERMIT_TYPE].join(' ')))
    .map((row) => {
      const title = normalizeText(row.NAME, 'NC DEQ Permit');
      const location = [row.ADDRESS, row.CITY, row.STATE].map((v) => normalizeText(v)).filter(Boolean).join(', ') || normalizeText(row.COUNTY, 'North Carolina');
      const publishedAt = row.RECV_DT ? new Date(row.RECV_DT).toISOString() : null;
      const externalId = normalizeText(row.APP_ID);
      return {
        ingest_key: buildIngestKey(source.key, externalId, title, location, 'United States'),
        source_key: source.key,
        source_name: source.name,
        source_url: 'https://maps.deq.nc.gov/arcgis/rest/services/DEQ/ApplicationTracker/MapServer/2/query',
        external_id: externalId,
        project_title: title,
        location,
        country: 'United States',
        activity: normalizeText(row.PROG_CAT, 'Animal Operations Permit Application'),
        category: 'Red',
        notes: `Official NC DEQ application tracker pending entry (status: ${normalizeText(row.STATUS, 'Pending')}).`,
        published_at: publishedAt,
        consultation_deadline: null,
        source_payload: row,
      };
    });
}

function isArkansasFactoryFarmRow(row) {
  const status = normalizeText(row.PmtStatusDesc).toLowerCase();
  if (!PENDING_STATUS_RE.test(status)) return false;

  const naics = normalizeText(row.FacPrimaryNAICSCode);
  const name = normalizeText(row.FacName).toLowerCase();
  const naicsDesc = normalizeText(row.FacPrimaryNAICSDesc).toLowerCase();
  const activity = `${name} ${naicsDesc}`;

  const naicsFactoryFarm = naics.startsWith('1121') || naics.startsWith('1122') || naics.startsWith('1123');
  const hasFarmSignal = /\b(poultry|broiler|pig|swine|hog|dairy|livestock|egg|farm)\b/i.test(activity);
  if (!naicsFactoryFarm && !hasFarmSignal) return false;

  if (/\b(kennel|shelter|humane|pet)\b/i.test(activity)) return false;
  if (naics.startsWith('1125')) return false; // Aquaculture is excluded.
  return true;
}

async function fetchArkansasPendingPermits() {
  const source = SOURCE_DEFS.us_ar;
  const csvUrl = 'https://www.adeq.state.ar.us/downloads/WebDatabases/PDS/FacAndPmtSummary.csv';
  const csvRaw = await fetchText(csvUrl, 120000);
  const rows = parseCsvTable(csvRaw);

  return rows
    .filter((row) => isArkansasFactoryFarmRow(row))
    .map((row) => {
      const title = normalizeText(row.FacName, 'Arkansas Permit');
      const location = [row.FacSiteCity, row.FacCountyName, 'AR'].map((v) => normalizeText(v)).filter(Boolean).join(', ') || 'Arkansas';
      const externalId = normalizeText(row.PmtNbr);
      const publishedAt = parseDateCandidate(row.PmtStatusDate || row.RecModifiedDate || row.RecCreatedDate);
      const activity = normalizeText(row.FacPrimaryNAICSDesc, 'Animal Production Permit');
      return {
        ingest_key: buildIngestKey(source.key, externalId, title, location, 'United States'),
        source_key: source.key,
        source_name: source.name,
        source_url: 'https://www.adeq.state.ar.us/home/pdssql/pds.aspx',
        external_id: externalId,
        project_title: title,
        location,
        country: 'United States',
        activity,
        category: 'Red',
        notes: `Official Arkansas DEQ permit record pending entry (status: ${normalizeText(row.PmtStatusDesc, 'Pending')}).`,
        published_at: publishedAt ? publishedAt.toISOString() : null,
        consultation_deadline: null,
        source_payload: row,
      };
    });
}

function isAustralianPendingFactoryFarm(row) {
  const text = `${normalizeText(row.NAME)} ${normalizeText(row.STATUS_DESCRIPTION)} ${normalizeText(row.STAGE_NAME)}`;
  if (!FARM_KEYWORDS_RE.test(text)) return false;
  if (AU_NOT_PENDING_RE.test(text)) return false;
  return /\b(pending|assessment|decision)\b/i.test(text);
}

async function fetchAustraliaPendingPermits() {
  const source = SOURCE_DEFS.au;
  const endpoint = 'https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/EPBC_Referrals/MapServer/0/query';
  const where = [
    "UPPER(NAME) LIKE '%POULTRY%'",
    "UPPER(NAME) LIKE '%PIG%'",
    "UPPER(NAME) LIKE '%BROILER%'",
    "UPPER(NAME) LIKE '%SWINE%'",
    "UPPER(NAME) LIKE '%HOG%'",
    "UPPER(NAME) LIKE '%LIVESTOCK%'",
    "UPPER(NAME) LIKE '%DAIRY%'",
  ].join(' OR ');
  const params = new URLSearchParams({
    where,
    outFields: 'REFERENCE_NUMBER,NAME,PRIMARY_JURISDICTION,STATUS_DESCRIPTION,STAGE_NAME,REFERRAL_URL,YEAR,REFERRAL_TYPE',
    returnGeometry: 'false',
    resultRecordCount: '500',
    f: 'json',
  });
  const payload = await fetchJson(`${endpoint}?${params.toString()}`, 60000);
  const rows = Array.isArray(payload?.features) ? payload.features.map((f) => f.attributes || {}) : [];

  return rows
    .filter((row) => isAustralianPendingFactoryFarm(row))
    .map((row) => {
      const externalId = normalizeText(row.REFERENCE_NUMBER);
      const title = normalizeText(row.NAME, 'EPBC Referral');
      const location = normalizeText(row.PRIMARY_JURISDICTION, 'Australia');
      const rawUrl = normalizeText(row.REFERRAL_URL).replace(/\\/g, '/');
      const sourceUrl = rawUrl.startsWith('http') ? rawUrl : 'https://epbcnotices.environment.gov.au/referralslist/';
      const year = Number.parseInt(String(row.YEAR || ''), 10);
      const publishedAt = Number.isFinite(year) ? `${year}-01-01T00:00:00.000Z` : null;
      return {
        ingest_key: buildIngestKey(source.key, externalId, title, location, 'Australia'),
        source_key: source.key,
        source_name: source.name,
        source_url: sourceUrl,
        external_id: externalId,
        project_title: title,
        location,
        country: 'Australia',
        activity: 'EPBC Referral - Intensive Animal Agriculture',
        category: 'Red',
        notes: `Official EPBC referral pending status (${normalizeText(row.STATUS_DESCRIPTION, 'Pending')}; stage: ${normalizeText(row.STAGE_NAME, 'Unknown')}).`,
        published_at: publishedAt,
        consultation_deadline: null,
        source_payload: row,
      };
    });
}

async function fetchIrelandPendingPermits() {
  const source = SOURCE_DEFS.ie;
  const baseUrl = 'https://data.epa.ie/leap/api/v1/Licence/licencesearchlistfilters';
  const perPage = 100;
  const maxPages = 20;
  const rows = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      status_filter: 'Application Pending',
      sector_filter: 'Intensive Agriculture',
      type_filter: 'Industrial Emissions Licence',
    });
    const payload = await fetchJson(`${baseUrl}?${params.toString()}`);
    const batch = Array.isArray(payload?.list) ? payload.list : [];
    rows.push(...batch);
    if (batch.length < perPage) break;
  }

  return rows.map((row) => {
    const title = normalizeText(row.authorisationname, 'Ireland EPA Pending Application');
    const location = normalizeText(row.county, 'Ireland');
    const externalId = normalizeText(row.authorisationnumber || row.licenceid);
    return {
      ingest_key: buildIngestKey(source.key, externalId, title, location, 'Ireland'),
      source_key: source.key,
      source_name: source.name,
      source_url: 'https://leap.epa.ie/',
      external_id: externalId,
      project_title: title,
      location,
      country: 'Ireland',
      activity: 'Industrial Emissions Licence - Intensive Agriculture',
      category: 'Red',
      notes: `Official Ireland EPA LEAP application pending record (sector: ${normalizeText(row.sector, 'Intensive Agriculture')}).`,
      published_at: null,
      consultation_deadline: null,
      source_payload: row,
    };
  });
}

async function fetchOntarioPendingPermits(now) {
  const source = SOURCE_DEFS.ca_on;
  const baseUrl = 'https://ero.ontario.ca';
  const todayStart = new Date(now.toISOString().slice(0, 10));
  const maxPages = Math.max(1, Math.min(10, Number.parseInt(process.env.ONTARIO_ERO_MAX_PAGES || '4', 10)));
  const keywords = String(
    process.env.ONTARIO_ERO_KEYWORDS || 'poultry,broiler,pig,swine,hog,dairy,livestock,feedlot,fish farm,aquaculture',
  )
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const seen = new Set();
  const rows = [];

  for (const keyword of keywords) {
    for (let page = 0; page < maxPages; page += 1) {
      const params = new URLSearchParams({ search: keyword, page: String(page) });
      params.append('f[0]', 'ero_notice_type:d');
      const searchUrl = `${baseUrl}/search?${params.toString()}`;
      const html = await fetchText(searchUrl, 60000);
      const articles = html.match(/<article class="row"[\s\S]*?<\/article>/gi) || [];
      if (articles.length === 0) break;

      for (const article of articles) {
        if (!/comment-period-open/i.test(article)) continue;

        const stageMatch = article.match(/Notice stage[\s\S]*?<span class="ero-status-indicator[^"]*">\s*([^<]+)\s*<\/span>/i);
        const stage = normalizeText(decodeHtmlEntities(stageMatch?.[1]));
        if (!/proposal/i.test(stage)) continue;

        const noticeMatch = article.match(/<h3 class="node-title">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const noticePath = normalizeText(decodeHtmlEntities(noticeMatch?.[1]));
        if (!noticePath.startsWith('/notice/')) continue;
        const title = normalizeText(stripTags(decodeHtmlEntities(noticeMatch?.[2])));

        const instrumentMatch = article.match(/<p class="field-instrument-type">([\s\S]*?)<\/p>/i);
        const instrumentType = normalizeText(
          stripTags(decodeHtmlEntities(instrumentMatch?.[1])).replace(/^Instrument type:\s*/i, ''),
        );

        const eroMatch = article.match(/ERO(?:<\/abbr>)?\s*number[\s\S]*?<div class="field-items[^"]*">\s*([0-9]{3}-[0-9]{4})\s*</i);
        const externalId = normalizeText(eroMatch?.[1], noticePath.replace('/notice/', '').trim());
        if (!externalId || seen.has(externalId)) continue;

        const commentPeriodMatch = article.match(/Comment period<\/div>\s*<div class="field-items[^"]*">([\s\S]*?)<\/div>/i);
        const commentPeriod = normalizeText(stripTags(decodeHtmlEntities(commentPeriodMatch?.[1])));
        const dates = commentPeriod.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
        const consultationDeadlineDate = dates ? parseDateCandidate(dates[2]) : null;
        if (consultationDeadlineDate && consultationDeadlineDate < todayStart) continue;

        const proposalPostedMatch = article.match(/Proposal posted[\s\S]*?<time[^>]*datetime="([^"]+)"/i);
        const publishedAt = normalizeText(proposalPostedMatch?.[1], null);

        const summaryMatch = article.match(/<div class="field-item"><p>([\s\S]*?)<\/p><\/div>/i);
        const summary = normalizeText(stripTags(decodeHtmlEntities(summaryMatch?.[1])));

        const textForFilter = `${title} ${instrumentType} ${summary} ${commentPeriod}`;
        if (!ONTARIO_FARM_KEYWORDS_RE.test(textForFilter)) continue;

        seen.add(externalId);
        const sourceUrl = `${baseUrl}${noticePath}`;
        rows.push({
          ingest_key: buildIngestKey(source.key, externalId, title, 'Ontario', 'Canada'),
          source_key: source.key,
          source_name: source.name,
          source_url: sourceUrl,
          external_id: externalId,
          project_title: title,
          location: 'Ontario',
          country: 'Canada',
          activity: instrumentType
            ? `Instrument proposal (${instrumentType})`
            : 'Instrument proposal (Environmental Registry of Ontario)',
          category: 'Red',
          notes: `Official Ontario ERO instrument proposal with open comment period${consultationDeadlineDate ? ` (deadline: ${toIsoDate(consultationDeadlineDate)})` : ''}.`,
          published_at: publishedAt,
          consultation_deadline: consultationDeadlineDate ? toIsoDate(consultationDeadlineDate) : null,
          source_payload: {
            keyword,
            page,
            stage,
            comment_period: commentPeriod,
            instrument_type: instrumentType,
            summary,
            source_url: sourceUrl,
          },
        });
      }
    }
  }

  return rows;
}

function dedupeRecords(records) {
  const seen = new Set();
  const deduped = [];
  for (const record of records) {
    const key = record.ingest_key || buildLegacyPermitKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }
  return deduped;
}

async function run() {
  const startTs = Date.now();
  const now = new Date();
  const lookbackDays = Number.isFinite(DEFAULT_LOOKBACK_DAYS) ? DEFAULT_LOOKBACK_DAYS : 120;
  const useSourceMetadataColumns = await supportsSourceMetadataColumns();

  const [ukRows, ncRows, arRows, auRows, ieRows, onRows] = await Promise.all([
    fetchUkPendingPermits(now, lookbackDays),
    fetchNcPendingPermits(),
    fetchArkansasPendingPermits(),
    fetchAustraliaPendingPermits(),
    fetchIrelandPendingPermits(),
    fetchOntarioPendingPermits(now),
  ]);

  const combined = dedupeRecords([
    ...ukRows,
    ...ncRows,
    ...arRows,
    ...auRows,
    ...ieRows,
    ...onRows,
  ]);

  const result = await upsertPermits(combined, useSourceMetadataColumns);
  const byCountry = combined.reduce((acc, row) => {
    const country = normalizeText(row.country, 'Unknown');
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Global pending permit sync complete');
  console.log(`   Schema mode: ${useSourceMetadataColumns ? 'source metadata columns' : 'legacy permits schema fallback'}`);
  console.log(`   UK records: ${ukRows.length}`);
  console.log(`   US NC records: ${ncRows.length}`);
  console.log(`   US Arkansas records: ${arRows.length}`);
  console.log(`   Australia records: ${auRows.length}`);
  console.log(`   Ireland records: ${ieRows.length}`);
  console.log(`   Canada (Ontario ERO) records: ${onRows.length}`);
  console.log(`   Total deduped records: ${combined.length}`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Updated: ${result.updated}`);
  console.log(`   Country breakdown: ${JSON.stringify(byCountry)}`);
  if (combined[0]) {
    console.log(`   Sample: ${combined[0].project_title}`);
    console.log(`   Sample URL: ${combined[0].source_url}`);
  }
  console.log(`   Duration: ${Math.round((Date.now() - startTs) / 1000)}s`);
}

run().catch((error) => {
  console.error('❌ Global pending permit sync failed:', error.message);
  process.exit(1);
});

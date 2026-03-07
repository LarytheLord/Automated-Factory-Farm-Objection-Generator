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
const INCLUDE_NON_FARM = String(process.env.GLOBAL_PENDING_INCLUDE_NON_FARM || 'false').toLowerCase() !== 'false';

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
  in_ec: {
    key: 'in_parivesh_seiaa_pending_ec',
    name: 'India PARIVESH State EC Pending Proposals',
  },
};

const PENDING_STATUS_RE = /\b(pending|application pending|in review|under review|in process|processing|applied|application received|submitted|publish pending)\b/i;
const FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|piggery|hatchery|abattoir|slaughter|meat processing|animal feeding|intensive farming|factory farm|cafo|feedlot)\b/i;
const INTENSIVE_KEYWORDS_RE = /\b(intensive farming|rearing of poultry intensively|section\s*6\.9|6\.9\s*a\(1\)|animal operations)\b/i;
const INFRA_KEYWORDS_RE = /\b(infrastructure|construction|road|highway|rail|metro|airport|port|mining|quarry|energy|thermal|solar|wind|transmission|power|data centre|data center|industrial plant|factory|manufacturing|refinery|cement|steel|chemical)\b/i;
const POLLUTION_KEYWORDS_RE = /\b(industrial emissions|permit to operate|effluent|discharge|air pollution|water pollution|waste management|landfill|incinerator|pollution control|environmental permit)\b/i;
const AU_NOT_PENDING_RE = /\b(completed|post-approval|lapsed|withdrawn|refused|approval decision made|referral decision made)\b/i;
const ONTARIO_FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|intensive farming|factory farm|feedlot|fish farm|aquaculture)\b/i;
const INDIA_PENDING_LABEL_RE = /\b(awaiting|pending|under examination|accepted by seiaa and forwarded to seac|recommended by seac and forwarded to seiaa)\b/i;
const INDIA_NON_PENDING_LABEL_RE = /\b(granted|rejected|withdraw|delisted|not recommended|transferred|site visit|ads by)\b/i;

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

function parseIndiaDate(raw) {
  const value = normalizeText(raw);
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = normalized.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const monthToken = match[2].slice(0, 3).toLowerCase();
  const year = Number.parseInt(match[3], 10);
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const month = months[monthToken];
  if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) return null;
  const dt = new Date(Date.UTC(year, month, day));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function extractLastIndiaSubmissionDate(importantDatesText) {
  const text = normalizeText(importantDatesText);
  if (!text) return null;

  const ecMatch = text.match(/Date of Submission for EC\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4})/i);
  const torMatch = text.match(/Date of Submission for TOR\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4})/i);

  const ecDate = ecMatch ? parseIndiaDate(ecMatch[1]) : null;
  const torDate = torMatch ? parseIndiaDate(torMatch[1]) : null;

  if (ecDate && torDate) return ecDate > torDate ? ecDate : torDate;
  return ecDate || torDate || null;
}

function toSafeJson(value, maxChars = 50000) {
  const raw = JSON.stringify(value, null, 2);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n...TRUNCATED...`;
}

function limitSourcePayload(value, maxChars = 18000) {
  try {
    const raw = JSON.stringify(value || {});
    if (raw.length <= maxChars) return value || {};
    return {
      truncated: true,
      raw_preview: raw.slice(0, maxChars),
      raw_length: raw.length,
    };
  } catch (_error) {
    return { truncated: true, raw_preview: 'unserializable payload' };
  }
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

function classifyPermitDomain(text) {
  const haystack = normalizeText(text).toLowerCase();
  if (!haystack) return 'other';
  if (FARM_KEYWORDS_RE.test(haystack) || INTENSIVE_KEYWORDS_RE.test(haystack)) return 'farm_animal';
  if (POLLUTION_KEYWORDS_RE.test(haystack)) return 'pollution_industrial';
  if (INFRA_KEYWORDS_RE.test(haystack)) return 'industrial_infra';
  return 'other';
}

function inferPermitSubtype(text, fallback = 'general_permit') {
  const haystack = normalizeText(text).toLowerCase();
  if (!haystack) return fallback;
  if (/\b(poultry|broiler|layer|chicken|turkey)\b/.test(haystack)) return 'poultry';
  if (/\b(pig|swine|hog|sow|farrow)\b/.test(haystack)) return 'swine';
  if (/\b(dairy|livestock)\b/.test(haystack)) return 'livestock';
  if (/\b(industrial emissions|emissions|air pollution|discharge|effluent)\b/.test(haystack)) return 'industrial_emissions';
  if (/\b(waste|landfill|incinerator)\b/.test(haystack)) return 'waste_management';
  if (/\b(energy|solar|wind|transmission|power)\b/.test(haystack)) return 'energy_infrastructure';
  if (/\b(road|highway|rail|metro|airport|port)\b/.test(haystack)) return 'transport_infrastructure';
  if (/\b(mining|quarry)\b/.test(haystack)) return 'resource_extraction';
  return fallback;
}

function buildUpsertRecord(record, useSourceMetadataColumns, useDomainColumns, nowIso) {
  const sourcePayload = limitSourcePayload(record.source_payload || {});
  const common = {
    project_title: record.project_title,
    location: record.location,
    country: record.country,
    activity: record.activity,
    status: 'pending',
    category: record.category || 'Red',
    updated_at: nowIso,
  };

  const domainFields = useDomainColumns
    ? {
        permit_domain: record.permit_domain || null,
        permit_subtype: record.permit_subtype || null,
        jurisdiction_region: record.jurisdiction_region || null,
        recipient_status: record.recipient_status || 'missing',
      }
    : {};

  if (useSourceMetadataColumns) {
    return {
      ...common,
      ...domainFields,
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
    ...domainFields,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(fn, label, maxAttempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = normalizeText(error?.message, '');
      const isRetryable = /fetch failed|network|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND/i.test(message);
      if (!isRetryable || attempt >= maxAttempts) {
        throw error;
      }
      const waitMs = Math.min(8000, 600 * attempt * attempt);
      console.warn(`⚠️ ${label} attempt ${attempt} failed (${message}); retrying in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
  throw lastError || new Error(`Failed after retries: ${label}`);
}

async function supportsSourceMetadataColumns() {
  const { error } = await withRetries(
    () => supabase.from('permits').select('id,ingest_key,source_payload').limit(1),
    'schema-check-source-columns',
  );
  if (!error) return true;
  const message = String(error.message || '');
  if (message.includes('column permits.ingest_key does not exist')) return false;
  if (message.includes('column permits.source_payload does not exist')) return false;
  throw error;
}

async function supportsDomainColumns() {
  const { error } = await withRetries(
    () =>
      supabase
        .from('permits')
        .select('id,permit_domain,permit_subtype,jurisdiction_region,recipient_status')
        .limit(1),
    'schema-check-domain-columns',
  );
  if (!error) return true;
  const message = String(error.message || '');
  if (message.includes('column permits.permit_domain does not exist')) return false;
  if (message.includes('column permits.permit_subtype does not exist')) return false;
  if (message.includes('column permits.jurisdiction_region does not exist')) return false;
  if (message.includes('column permits.recipient_status does not exist')) return false;
  throw error;
}

async function upsertPermits(records, useSourceMetadataColumns, useDomainColumns) {
  if (!records.length) return { inserted: 0, updated: 0 };
  const nowIso = new Date().toISOString();
  const payload = records.map((record) =>
    buildUpsertRecord(record, useSourceMetadataColumns, useDomainColumns, nowIso),
  );

  if (useSourceMetadataColumns) {
    const batchSize = Math.max(20, Math.min(200, Number.parseInt(process.env.GLOBAL_PENDING_UPSERT_BATCH_SIZE || '80', 10)));
    for (let i = 0; i < payload.length; i += batchSize) {
      const chunk = payload.slice(i, i + batchSize);
      const { error } = await withRetries(
        () =>
          supabase
            .from('permits')
            .upsert(chunk, { onConflict: 'ingest_key' }),
        `upsert-chunk-${Math.floor(i / batchSize) + 1}`,
      );
      if (error) throw error;
    }
    return { inserted: payload.length, updated: 0 };
  }

  const { data: existing, error: existingError } = await withRetries(
    () =>
      supabase
        .from('permits')
        .select('id,project_title,location,country')
        .range(0, 15000),
    'load-existing-legacy',
  );
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
      const { error } = await withRetries(
        () =>
          supabase
            .from('permits')
            .update(record)
            .eq('id', existingId),
        `legacy-update-${existingId}`,
      );
      if (error) throw error;
      updated += 1;
    } else {
      const { data, error } = await withRetries(
        () =>
          supabase
            .from('permits')
            .insert(record)
            .select('id')
            .single(),
        'legacy-insert',
      );
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
      const domain = classifyPermitDomain(text);
      if (!INCLUDE_NON_FARM) {
        if (!FARM_KEYWORDS_RE.test(text)) continue;
      } else if (domain === 'other') {
        continue;
      }

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
        activity:
          domain === 'farm_animal'
            ? /pig|swine|sow|hog/i.test(text)
              ? 'Intensive Pig Farm Permit Application'
              : 'Intensive Poultry Farm Permit Application'
            : domain === 'pollution_industrial'
              ? 'Industrial Environmental Permit Application'
              : 'Infrastructure Development Permit Application',
        category: 'Red',
        permit_domain: domain,
        permit_subtype: inferPermitSubtype(text, 'uk_environmental_permit'),
        jurisdiction_region: 'United Kingdom',
        recipient_status: 'missing',
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
    .filter((row) => {
      if (!PENDING_STATUS_RE.test(row.STATUS || '')) return false;
      const text = [row.NAME, row.PROG_CAT, row.PERMIT_TYPE].join(' ');
      const domain = classifyPermitDomain(text);
      if (!INCLUDE_NON_FARM) return domain === 'farm_animal';
      return domain !== 'other';
    })
    .map((row) => {
      const title = normalizeText(row.NAME, 'NC DEQ Permit');
      const location = [row.ADDRESS, row.CITY, row.STATE].map((v) => normalizeText(v)).filter(Boolean).join(', ') || normalizeText(row.COUNTY, 'North Carolina');
      const publishedAt = row.RECV_DT ? new Date(row.RECV_DT).toISOString() : null;
      const externalId = normalizeText(row.APP_ID);
      const text = [row.NAME, row.PROG_CAT, row.PERMIT_TYPE].join(' ');
      const domain = classifyPermitDomain(text);
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
        permit_domain: domain,
        permit_subtype: inferPermitSubtype(text, 'nc_deq_permit'),
        jurisdiction_region: normalizeText(row.STATE, 'NC'),
        recipient_status: 'missing',
        notes: `Official NC DEQ application tracker pending entry (status: ${normalizeText(row.STATUS, 'Pending')}).`,
        published_at: publishedAt,
        consultation_deadline: null,
        source_payload: row,
      };
    });
}

function isArkansasPendingRow(row) {
  const status = normalizeText(row.PmtStatusDesc).toLowerCase();
  if (!PENDING_STATUS_RE.test(status)) return false;

  const naics = normalizeText(row.FacPrimaryNAICSCode);
  const name = normalizeText(row.FacName).toLowerCase();
  const naicsDesc = normalizeText(row.FacPrimaryNAICSDesc).toLowerCase();
  const activity = `${name} ${naicsDesc}`;

  const naicsFactoryFarm = naics.startsWith('1121') || naics.startsWith('1122') || naics.startsWith('1123');
  const hasFarmSignal = /\b(poultry|broiler|pig|swine|hog|dairy|livestock|egg|farm)\b/i.test(activity);
  const isFarm = naicsFactoryFarm || hasFarmSignal;
  if (!INCLUDE_NON_FARM && !isFarm) return false;
  if (/\b(kennel|shelter|humane|pet)\b/i.test(activity)) return false;
  if (naics.startsWith('1125')) return false; // Aquaculture is excluded.

  if (INCLUDE_NON_FARM) {
    const domain = classifyPermitDomain(activity);
    return isFarm || domain === 'industrial_infra' || domain === 'pollution_industrial';
  }

  return isFarm;
}

async function fetchArkansasPendingPermits() {
  const source = SOURCE_DEFS.us_ar;
  const csvUrl = 'https://www.adeq.state.ar.us/downloads/WebDatabases/PDS/FacAndPmtSummary.csv';
  const csvRaw = await fetchText(csvUrl, 120000);
  const rows = parseCsvTable(csvRaw);

  return rows
    .filter((row) => isArkansasPendingRow(row))
    .map((row) => {
      const title = normalizeText(row.FacName, 'Arkansas Permit');
      const location = [row.FacSiteCity, row.FacCountyName, 'AR'].map((v) => normalizeText(v)).filter(Boolean).join(', ') || 'Arkansas';
      const externalId = normalizeText(row.PmtNbr);
      const publishedAt = parseDateCandidate(row.PmtStatusDate || row.RecModifiedDate || row.RecCreatedDate);
      const activity = normalizeText(row.FacPrimaryNAICSDesc, 'Animal Production Permit');
      const text = `${title} ${activity}`;
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
        permit_domain: classifyPermitDomain(text),
        permit_subtype: inferPermitSubtype(text, 'arkansas_permit'),
        jurisdiction_region: 'AR',
        recipient_status: 'missing',
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
        permit_domain: 'farm_animal',
        permit_subtype: inferPermitSubtype(title, 'epbc_referral'),
        jurisdiction_region: location,
        recipient_status: 'missing',
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
    const text = `${title} ${normalizeText(row.sector)} ${normalizeText(row.type)}`;
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
      permit_domain: classifyPermitDomain(text),
      permit_subtype: inferPermitSubtype(text, 'ie_epa_licence'),
      jurisdiction_region: location,
      recipient_status: 'missing',
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
    process.env.ONTARIO_ERO_KEYWORDS || (
      INCLUDE_NON_FARM
        ? 'industrial,emission,waste,landfill,construction,infrastructure,poultry,broiler,pig,swine,hog,dairy,livestock,feedlot,fish farm,aquaculture'
        : 'poultry,broiler,pig,swine,hog,dairy,livestock,feedlot,fish farm,aquaculture'
    ),
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
        const domain = classifyPermitDomain(textForFilter);
        if (!INCLUDE_NON_FARM) {
          if (!ONTARIO_FARM_KEYWORDS_RE.test(textForFilter)) continue;
        } else if (domain === 'other') {
          continue;
        }

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
          permit_domain: domain,
          permit_subtype: inferPermitSubtype(textForFilter, 'ontario_ero_instrument'),
          jurisdiction_region: 'Ontario',
          recipient_status: 'missing',
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

function extractIndiaStateNames(portalHtml) {
  const names = new Set();
  const matches = portalHtml.matchAll(/Staterecord\.aspx\?State_Name=([^"'&>]+)/gi);
  for (const match of matches) {
    const raw = normalizeText(match[1]).replace(/\+/g, ' ');
    if (!raw) continue;
    try {
      names.add(decodeURIComponent(raw));
    } catch (_error) {
      names.add(raw);
    }
  }
  return Array.from(names);
}

function parseIndiaStateMetadata(stateHtml) {
  const stateCode =
    normalizeText((stateHtml.match(/id="StateId"\s+value="([^"]+)"/i) || [])[1]) ||
    normalizeText((stateHtml.match(/id="hdnstateid"\s+value="([^"]+)"/i) || [])[1]);
  const stateNumericId = normalizeText((stateHtml.match(/state_id=(\d+)/i) || [])[1]);
  return { stateCode, stateNumericId };
}

function extractIndiaPendingStatusLinks(homeHtml) {
  const links = [];
  const seen = new Set();
  const anchorMatches = homeHtml.matchAll(/<a[^>]+href='(online_track_proposal_state\.aspx\?[^']+)'[^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of anchorMatches) {
    const hrefRaw = normalizeText(match[1]).replace(/&amp;/g, '&');
    if (!hrefRaw || seen.has(hrefRaw)) continue;
    const count = Number.parseInt((stripTags(match[2]).match(/\d+/) || ['0'])[0], 10);
    if (!Number.isFinite(count) || count <= 0) continue;

    const before = homeHtml.slice(Math.max(0, (match.index || 0) - 900), match.index || 0);
    const labels = Array.from(before.matchAll(/<li class="arrow[^"]*">([\s\S]*?)<\/li>/gi)).map((item) =>
      stripTags(item[1])
    );
    let label = normalizeText(labels[labels.length - 1]);
    if (!label) {
      const fallbackText = stripTags(before).replace(/\s+/g, ' ').trim();
      const fallbackMatch = fallbackText.match(/([A-Za-z][A-Za-z\s,&/()-]{6,90})\s*$/);
      label = normalizeText(fallbackMatch?.[1]);
    }
    if (!label) label = `Pending bucket ${links.length + 1}`;
    if (INDIA_NON_PENDING_LABEL_RE.test(label)) continue;

    seen.add(hrefRaw);
    links.push({ href: hrefRaw, label, count });
  }

  return links.sort((a, b) => b.count - a.count);
}

function parseIndiaProposalRows(statusHtml) {
  const tableStart = statusHtml.indexOf('id="ctl00_ContentPlaceHolder1_GridView1"');
  if (tableStart === -1) return [];
  const detailMarker = statusHtml.indexOf('id="ctl00_ContentPlaceHolder1_detail_td"', tableStart);
  const gridFragment = detailMarker > tableStart
    ? statusHtml.slice(tableStart, detailMarker)
    : statusHtml.slice(tableStart);
  if (/No Records Found/i.test(gridFragment)) return [];

  const rows = [];
  const rowSegments = gridFragment.split(/<tr bgcolor="White">/gi).slice(1);
  for (const rowHtml of rowSegments) {
    if (/No Records Found/i.test(rowHtml)) continue;

    const proposalNo = normalizeText((rowHtml.match(/_std"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_std"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const fileNo = normalizeText((rowHtml.match(/_fn"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_fn"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const title = normalizeText((rowHtml.match(/_Label2"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_Label2"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    if (!title) continue;

    const state = normalizeText((rowHtml.match(/_stdname1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_stdname1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const district = normalizeText((rowHtml.match(/_lbldis1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_lbldis1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const locality = normalizeText((rowHtml.match(/_lblvill1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_lblvill1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const category = normalizeText((rowHtml.match(/_dst"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_dst"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const company = normalizeText((rowHtml.match(/_uag"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_uag"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const currentStatus = normalizeText((rowHtml.match(/_Label1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_Label1"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const importantDatesRaw = normalizeText((rowHtml.match(/_datehtml"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ? stripTags((rowHtml.match(/_datehtml"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]) : '');
    const attachmentLinks = Array.from(rowHtml.matchAll(/href='([^']+)'/gi))
      .map((item) => normalizeText(item[1]).replace(/&amp;/g, '&'))
      .filter((href) => href && !href.toLowerCase().startsWith('javascript:'));

    rows.push({
      proposal_no: proposalNo,
      file_no: fileNo,
      title,
      state,
      district,
      locality,
      category,
      company,
      current_status: currentStatus,
      important_dates: importantDatesRaw,
      attachment_links: attachmentLinks,
    });
  }

  return rows;
}

async function fetchIndiaPendingPermits(now, lookbackDays) {
  const source = SOURCE_DEFS.in_ec;
  const maxStates = Math.max(1, Math.min(36, Number.parseInt(process.env.INDIA_PENDING_MAX_STATES || '12', 10)));
  const maxStatusLinksPerState = Math.max(1, Math.min(12, Number.parseInt(process.env.INDIA_PENDING_MAX_LINKS_PER_STATE || '4', 10)));
  const maxRecords = Math.max(20, Math.min(1500, Number.parseInt(process.env.INDIA_PENDING_MAX_RECORDS || '180', 10)));
  const indiaLookbackDays = Math.max(
    90,
    Number.parseInt(process.env.INDIA_PENDING_LOOKBACK_DAYS || String(Math.max(lookbackDays, 730)), 10),
  );
  const oldestAllowed = new Date(now.getTime() - indiaLookbackDays * 24 * 60 * 60 * 1000);

  const portalHtml = await fetchText('https://environmentclearance.nic.in/state_portal1.aspx', 90000);
  const priorityStates = [
    'Maharashtra',
    'Tamil Nadu',
    'Karnataka',
    'Gujarat',
    'Rajasthan',
    'Andhra Pradesh',
    'Telangana',
    'Uttar Pradesh',
    'Madhya Pradesh',
    'Kerala',
    'Punjab',
    'Haryana',
    'Orissa',
    'West Bengal',
    'Bihar',
  ];
  const priorityIndex = new Map(priorityStates.map((name, index) => [name.toLowerCase(), index]));
  const stateNames = extractIndiaStateNames(portalHtml)
    .sort((a, b) => {
      const aIndex = priorityIndex.has(a.toLowerCase()) ? priorityIndex.get(a.toLowerCase()) : 999;
      const bIndex = priorityIndex.has(b.toLowerCase()) ? priorityIndex.get(b.toLowerCase()) : 999;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b);
    })
    .slice(0, maxStates);
  const records = [];

  for (const stateName of stateNames) {
    try {
      const encodedState = encodeURIComponent(stateName);
      const stateUrl = `https://environmentclearance.nic.in/Staterecord.aspx?State_Name=${encodedState}`;
      const stateHtml = await fetchText(stateUrl, 90000);
      const { stateCode, stateNumericId } = parseIndiaStateMetadata(stateHtml);
      if (!stateCode) continue;

      const homeUrl = `https://environmentclearance.nic.in/HomeStateEC.aspx?state_name=${encodedState}&state_id=${encodeURIComponent(stateCode)}`;
      const homeHtml = await fetchText(homeUrl, 90000);
      const statusLinks = extractIndiaPendingStatusLinks(homeHtml).slice(0, maxStatusLinksPerState);

      for (const statusLink of statusLinks) {
        const statusUrl = `https://environmentclearance.nic.in/${statusLink.href}`;
        const statusHtml = await fetchText(statusUrl, 90000);
        const rows = parseIndiaProposalRows(statusHtml);
        for (const row of rows) {
          if (records.length >= maxRecords) break;

          const externalId = normalizeText(row.proposal_no || row.file_no);
          if (!externalId) continue;

          const location = [row.locality, row.district || stateName, stateName].filter(Boolean).join(', ');
          const text = `${row.title} ${row.category} ${row.company} ${row.current_status}`.trim();
          const domain = classifyPermitDomain(text);
          if (!INCLUDE_NON_FARM && !FARM_KEYWORDS_RE.test(text)) continue;

          const submittedDate = extractLastIndiaSubmissionDate(row.important_dates);
          if (submittedDate && submittedDate < oldestAllowed) continue;

          const attachments = row.attachment_links.slice(0, 5).map((href) => {
            if (href.startsWith('http://') || href.startsWith('https://')) return href;
            return `https://environmentclearance.nic.in/${href.replace(/^\//, '')}`;
          });

          records.push({
            ingest_key: buildIngestKey(source.key, externalId, row.title, location, 'India'),
            source_key: source.key,
            source_name: source.name,
            source_url: statusUrl,
            external_id: externalId,
            project_title: row.title,
            location: location || stateName,
            country: 'India',
            activity: row.category
              ? `Environmental Clearance Proposal - ${row.category}`
              : 'Environmental Clearance Proposal',
            category: 'Red',
            permit_domain: domain,
            permit_subtype: inferPermitSubtype(text, 'india_state_ec_proposal'),
            jurisdiction_region: stateName,
            recipient_status: 'missing',
            notes: `Official PARIVESH pending EC proposal (${statusLink.label})${row.current_status ? `; current status: ${row.current_status}` : ''}.`,
            published_at: submittedDate ? submittedDate.toISOString() : null,
            consultation_deadline: null,
            source_payload: {
              state_name: stateName,
              state_code: stateCode,
              state_numeric_id: stateNumericId || null,
              pending_bucket: statusLink.label,
              proposal_no: row.proposal_no,
              file_no: row.file_no,
              company: row.company,
              category: row.category,
              current_status: row.current_status,
              important_dates: row.important_dates,
              attachments,
            },
          });
        }
        if (records.length >= maxRecords) break;
      }
      if (records.length >= maxRecords) break;
    } catch (_error) {
      // Continue with remaining states on individual failures.
    }
  }

  return records;
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

async function resolveSourceRows(label, loader) {
  try {
    const rows = await loader();
    return { rows: Array.isArray(rows) ? rows : [], error: null, label };
  } catch (error) {
    return { rows: [], error: String(error?.message || 'unknown error'), label };
  }
}

async function run() {
  const startTs = Date.now();
  const now = new Date();
  const lookbackDays = Number.isFinite(DEFAULT_LOOKBACK_DAYS) ? DEFAULT_LOOKBACK_DAYS : 120;
  const useSourceMetadataColumns = await supportsSourceMetadataColumns();
  const useDomainColumns = await supportsDomainColumns();

  const [ukSource, ncSource, arSource, auSource, ieSource, onSource, indiaSource] = await Promise.all([
    resolveSourceRows('UK', () => fetchUkPendingPermits(now, lookbackDays)),
    resolveSourceRows('US NC', () => fetchNcPendingPermits()),
    resolveSourceRows('US Arkansas', () => fetchArkansasPendingPermits()),
    resolveSourceRows('Australia', () => fetchAustraliaPendingPermits()),
    resolveSourceRows('Ireland', () => fetchIrelandPendingPermits()),
    resolveSourceRows('Canada (Ontario ERO)', () => fetchOntarioPendingPermits(now)),
    resolveSourceRows('India (PARIVESH State EC)', () => fetchIndiaPendingPermits(now, lookbackDays)),
  ]);

  const ukRows = ukSource.rows;
  const ncRows = ncSource.rows;
  const arRows = arSource.rows;
  const auRows = auSource.rows;
  const ieRows = ieSource.rows;
  const onRows = onSource.rows;
  const indiaRows = indiaSource.rows;

  const combined = dedupeRecords([
    ...ukRows,
    ...ncRows,
    ...arRows,
    ...auRows,
    ...ieRows,
    ...onRows,
    ...indiaRows,
  ]);

  const result = await upsertPermits(combined, useSourceMetadataColumns, useDomainColumns);
  const byCountry = combined.reduce((acc, row) => {
    const country = normalizeText(row.country, 'Unknown');
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});
  const byDomain = combined.reduce((acc, row) => {
    const domain = normalizeText(row.permit_domain, 'other');
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Global pending permit sync complete');
  console.log(
    `   Schema mode: ${useSourceMetadataColumns ? 'source metadata columns' : 'legacy permits schema fallback'} | domain columns: ${useDomainColumns ? 'enabled' : 'missing'}`
  );
  console.log(`   Include non-farm domains: ${INCLUDE_NON_FARM}`);
  console.log(`   UK records: ${ukRows.length}`);
  console.log(`   US NC records: ${ncRows.length}`);
  console.log(`   US Arkansas records: ${arRows.length}`);
  console.log(`   Australia records: ${auRows.length}`);
  console.log(`   Ireland records: ${ieRows.length}`);
  console.log(`   Canada (Ontario ERO) records: ${onRows.length}`);
  console.log(`   India (PARIVESH State EC) records: ${indiaRows.length}`);
  const sourceErrors = [ukSource, ncSource, arSource, auSource, ieSource, onSource, indiaSource].filter((item) => item.error);
  if (sourceErrors.length > 0) {
    console.log(`   Source errors: ${sourceErrors.length}`);
    for (const sourceError of sourceErrors) {
      console.log(`   - ${sourceError.label}: ${sourceError.error}`);
    }
  }
  console.log(`   Total deduped records: ${combined.length}`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Updated: ${result.updated}`);
  console.log(`   Country breakdown: ${JSON.stringify(byCountry)}`);
  console.log(`   Domain breakdown: ${JSON.stringify(byDomain)}`);
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

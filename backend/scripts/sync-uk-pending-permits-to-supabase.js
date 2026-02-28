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

const GOV_BASE = 'https://www.gov.uk';
const SEARCH_ENDPOINT = `${GOV_BASE}/api/search.json`;
const CONTENT_ENDPOINT = `${GOV_BASE}/api/content`;
const SOURCE_KEY = 'uk_gov_environment_agency_notice';
const SOURCE_NAME = 'GOV.UK Environment Agency Permit Application Notices';
const EA_CONSULT_BASE = 'https://consult.environment-agency.gov.uk';
const EA_CONSULT_SOURCE_KEY = 'uk_ea_citizenspace_permit_consultations';
const EA_CONSULT_SOURCE_NAME = 'Environment Agency Citizen Space Permit Consultations';
const LEGACY_PAYLOAD_MARKER = 'Original Payload JSON:';

const FACTORY_FARM_ANIMAL_PATTERN = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|sow|hog|livestock|dairy|farrowing|fish farm|aquaculture)\b/i;
const FACTORY_FARM_INTENSIVE_PATTERN = /\b(intensive farming|rearing of poultry intensively|rearing of poultry|section\s*6\.9|6\.9\s*a\(1\)|part\s*c3\.5|part-c35)\b/i;
const HTTP_TIMEOUT_MS = Number.parseInt(process.env.UK_PENDING_PERMIT_HTTP_TIMEOUT_MS || '15000', 10);
const HTTP_MAX_RETRIES = Number.parseInt(process.env.UK_PENDING_PERMIT_HTTP_RETRIES || '1', 10);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

function parseDateCandidate(raw) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

function isFactoryFarmNotice(text) {
  const haystack = normalizeText(text);
  return FACTORY_FARM_ANIMAL_PATTERN.test(haystack) && FACTORY_FARM_INTENSIVE_PATTERN.test(haystack);
}

function inferActivity(text) {
  const haystack = normalizeText(text).toLowerCase();
  if (haystack.includes('broiler') || haystack.includes('poultry') || haystack.includes('chicken')) {
    return 'Intensive Poultry Farm Permit Application';
  }
  if (haystack.includes('pig') || haystack.includes('swine') || haystack.includes('sow')) {
    return 'Intensive Pig Farm Permit Application';
  }
  if (haystack.includes('dairy') || haystack.includes('livestock')) {
    return 'Intensive Livestock Farm Permit Application';
  }
  return 'Factory Farm Permit Application';
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

function extractPermitReference(title, path) {
  const titleRef = title.match(/EPR\/[A-Z0-9]+\/[A-Z0-9]+/i);
  if (titleRef) return titleRef[0].toUpperCase();
  const pathRef = path.match(/epr([a-z0-9]+)/i);
  if (!pathRef) return null;
  return `EPR/${pathRef[1].toUpperCase()}`;
}

function extractLocation(title) {
  const prefix = normalizeText(title).split(':')[0];
  return prefix || 'United Kingdom';
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function mapWithConcurrency(items, limit, mapper) {
  const safeLimit = Math.max(1, Math.min(20, Number.parseInt(String(limit || 1), 10) || 1));
  const values = Array.isArray(items) ? items : [];
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) break;
      results[index] = await mapper(values[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(safeLimit, values.length || 1) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 0; attempt <= Math.max(0, HTTP_MAX_RETRIES); attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(3000, HTTP_TIMEOUT_MS));
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpenPermitPermitSync/1.0 (+https://openpermit.org)',
          Accept: 'application/json,text/plain,*/*',
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }
  throw lastError || new Error(`Failed to fetch JSON from ${url}`);
}

async function fetchText(url) {
  let lastError = null;
  for (let attempt = 0; attempt <= Math.max(0, HTTP_MAX_RETRIES); attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(3000, HTTP_TIMEOUT_MS));
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpenPermitPermitSync/1.0 (+https://openpermit.org)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return response.text();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }
  throw lastError || new Error(`Failed to fetch text from ${url}`);
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

function normalizeConsultationUrl(url) {
  const raw = normalizeText(url);
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${EA_CONSULT_BASE}${raw}`;
  return `${EA_CONSULT_BASE}/${raw.replace(/^\/+/, '')}`;
}

function parseCitizenSpaceCloseDate(raw) {
  const parsed = parseDateCandidate(raw);
  if (parsed) return parsed;
  const monthMap = {
    jan: 'January',
    feb: 'February',
    mar: 'March',
    apr: 'April',
    jun: 'June',
    jul: 'July',
    aug: 'August',
    sep: 'September',
    oct: 'October',
    nov: 'November',
    dec: 'December',
  };
  const expanded = normalizeText(raw).replace(
    /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
    (m) => monthMap[m.slice(0, 3).toLowerCase()] || m,
  );
  return parseDateCandidate(expanded);
}

function extractCitizenSpaceCards(html) {
  const cards = [];
  const cardRegex = /<li[^>]*class="[^"]*dss-card[^"]*"[\s\S]*?<\/li>/gi;
  const matches = html.match(cardRegex) || [];
  for (const cardHtml of matches) {
    const linkMatch = cardHtml.match(/<h2>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const closeMatch =
      cardHtml.match(/<span>\s*Closes\s*<\/span>\s*([^<]+)/i) ||
      cardHtml.match(/\bCloses\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
    const summaryMatch = cardHtml.match(/<span>\s*([\s\S]*?)<\/span>\s*<\/p>/i);

    cards.push({
      url: normalizeConsultationUrl(linkMatch[1]),
      title: stripTags(decodeHtmlEntities(linkMatch[2])),
      closes_raw: normalizeText(decodeHtmlEntities(closeMatch?.[1] || '')),
      summary: stripTags(decodeHtmlEntities(summaryMatch?.[1] || '')),
    });
  }
  return cards;
}

function extractCitizenSpaceNextPageUrl(html) {
  const nextMatch = html.match(
    /class="cs-pagination-widget-next"[\s\S]*?<a[^>]+href="([^"]+)"/i,
  );
  if (!nextMatch) return null;
  return normalizeConsultationUrl(decodeHtmlEntities(nextMatch[1]));
}

async function loadRecentPermitNoticeSearch(limit = 200) {
  const q = encodeURIComponent('"environmental permit application advertisement"');
  const url = `${SEARCH_ENDPOINT}?q=${q}&count=${Math.max(1, Math.min(limit, 200))}&order=-public_timestamp`;
  const payload = await fetchJson(url);
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows.filter((row) => row.format === 'notice');
}

async function loadNoticeContent(basePath) {
  const safePath = normalizeGovPath(basePath);
  if (!safePath) {
    throw new Error(`Invalid GOV.UK path: ${String(basePath)}`);
  }
  return fetchJson(`${CONTENT_ENDPOINT}${safePath}`);
}

async function loadOpenPermitConsultationCards(maxPages = 6) {
  let nextUrl = `${EA_CONSULT_BASE}/consultation_finder/?st=open&in=Permit+pages&sort_on=iconsultable_enddate&sort_order=ascending`;
  const cards = [];
  const seenUrls = new Set();
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    pages += 1;
    const html = await fetchText(nextUrl);
    const pageCards = extractCitizenSpaceCards(html);
    for (const card of pageCards) {
      if (!card?.url || seenUrls.has(card.url)) continue;
      seenUrls.add(card.url);
      cards.push(card);
    }
    nextUrl = extractCitizenSpaceNextPageUrl(html);
  }

  return cards;
}

function extractPermitReferenceFromText(text, fallback = null) {
  const ref = normalizeText(text).match(/EPR\/[A-Z0-9]+\/[A-Z0-9]+/i);
  if (ref) return ref[0].toUpperCase();
  return fallback;
}

function buildLegacyNotes({
  consultationDeadline,
  content,
  permitReference,
  publishedAt,
  sourceUrl,
}) {
  return [
    'Official EA permit application notice (GOV.UK).',
    `Consultation deadline: ${toIsoDate(consultationDeadline)}.`,
    `Published at: ${publishedAt.toISOString()}.`,
    `Reference: ${permitReference}.`,
    `Source URL: ${sourceUrl}`,
    LEGACY_PAYLOAD_MARKER,
    toSafeJson(content),
  ].join('\n');
}

function buildPermitPayload({
  row,
  content,
  attachmentContents = [],
  now,
  lookbackDays,
  useSourceMetadataColumns,
}) {
  const title = normalizeText(content?.title || row?.title);
  const normalizedPath = normalizeGovPath(content?.base_path || row?.link);
  const basePath = normalizeText(normalizedPath);
  const description = normalizeText(content?.description || row?.description);
  const bodyHtml = normalizeText(content?.details?.body);
  const bodyText = stripTags(bodyHtml);
  const attachmentText = attachmentContents
    .map((entry) => stripTags(entry?.details?.body || ''))
    .filter(Boolean)
    .join('\n');
  const fullText = `${title}\n${description}\n${bodyText}\n${attachmentText}`;

  if (!title || !basePath) return null;
  if (!isFactoryFarmNotice(fullText)) return null;

  const publishedAt = parseDateCandidate(content?.public_updated_at || row?.public_timestamp);
  if (!publishedAt) return null;
  const oldestAllowed = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  if (publishedAt < oldestAllowed) return null;

  const consultationDeadline = findConsultationDeadline(fullText);
  if (!consultationDeadline) return null;
  if (consultationDeadline < new Date(now.toISOString().slice(0, 10))) return null;

  const permitReference = extractPermitReference(title, basePath) || content?.content_id || basePath;
  const ingestKey = `${SOURCE_KEY}:${permitReference}`.replace(/\s+/g, '_').toLowerCase();
  const sourceUrl = `${GOV_BASE}${basePath}`;

  const common = {
    project_title: title,
    location: extractLocation(title),
    country: 'United Kingdom',
    activity: inferActivity(fullText),
    status: 'pending',
    category: 'Red',
  };

  if (useSourceMetadataColumns) {
    return {
      ...common,
      ingest_key: ingestKey,
      source_key: SOURCE_KEY,
      source_name: SOURCE_NAME,
      source_url: sourceUrl,
      external_id: permitReference,
      notes: `Official EA permit application notice. Consultation deadline: ${toIsoDate(consultationDeadline)}.`,
      published_at: publishedAt.toISOString(),
      consultation_deadline: toIsoDate(consultationDeadline),
      source_payload: {
        notice: content,
        attachments: attachmentContents,
      },
      updated_at: now.toISOString(),
    };
  }

  return {
    ...common,
    notes: buildLegacyNotes({
      consultationDeadline,
      content: {
        notice: content,
        attachments: attachmentContents,
      },
      permitReference,
      publishedAt,
      sourceUrl,
    }),
    updated_at: now.toISOString(),
  };
}

function buildCitizenSpaceLegacyNotes({
  consultationDeadline,
  permitReference,
  sourceUrl,
  detailPayload,
}) {
  return [
    'Official EA permit consultation (Citizen Space).',
    `Consultation deadline: ${toIsoDate(consultationDeadline)}.`,
    `Reference: ${permitReference}.`,
    `Source URL: ${sourceUrl}`,
    LEGACY_PAYLOAD_MARKER,
    toSafeJson(detailPayload),
  ].join('\n');
}

function buildCitizenSpacePermitPayload({
  card,
  detailHtml,
  detailText,
  now,
  useSourceMetadataColumns,
}) {
  const consultationDeadline = parseCitizenSpaceCloseDate(card.closes_raw);
  if (!consultationDeadline) return null;
  if (consultationDeadline < new Date(now.toISOString().slice(0, 10))) return null;

  const hasAnimalSignal = FACTORY_FARM_ANIMAL_PATTERN.test(`${card.title}\n${card.summary}\n${detailText}`);
  const hasIntensiveSignal = FACTORY_FARM_INTENSIVE_PATTERN.test(`${card.title}\n${card.summary}\n${detailText}`);
  const hasPartC35Signal = /part[\s-]*c3\.5|part-c35/i.test(detailHtml);
  if (!hasAnimalSignal && !hasPartC35Signal) return null;
  if (!hasPartC35Signal && hasAnimalSignal && !hasIntensiveSignal) return null;

  const permitReference =
    extractPermitReferenceFromText(card.title) ||
    extractPermitReferenceFromText(detailText) ||
    extractPermitReference(card.title, card.url) ||
    card.url;

  const ingestKey = `${EA_CONSULT_SOURCE_KEY}:${permitReference}`.replace(/\s+/g, '_').toLowerCase();
  const activity = inferActivity(`${card.title}\n${card.summary}\n${detailText}`);
  const detailPayload = {
    listing: card,
    farmSignals: {
      animal: hasAnimalSignal,
      intensive: hasIntensiveSignal,
      part_c35: hasPartC35Signal,
    },
  };
  const common = {
    project_title: card.title,
    location: extractLocation(card.title),
    country: 'United Kingdom',
    activity: activity || 'Intensive Farm Permit Consultation',
    status: 'pending',
    category: 'Red',
    updated_at: now.toISOString(),
  };

  if (useSourceMetadataColumns) {
    return {
      ...common,
      ingest_key: ingestKey,
      source_key: EA_CONSULT_SOURCE_KEY,
      source_name: EA_CONSULT_SOURCE_NAME,
      source_url: card.url,
      external_id: permitReference,
      notes: `Official EA Citizen Space permit consultation. Consultation deadline: ${toIsoDate(consultationDeadline)}.`,
      published_at: null,
      consultation_deadline: toIsoDate(consultationDeadline),
      source_payload: detailPayload,
    };
  }

  return {
    ...common,
    notes: buildCitizenSpaceLegacyNotes({
      consultationDeadline,
      permitReference,
      sourceUrl: card.url,
      detailPayload,
    }),
  };
}

async function fetchCitizenSpacePendingFarmPermits(now, useSourceMetadataColumns, maxPages = 8) {
  const cards = await loadOpenPermitConsultationCards(maxPages);
  const results = [];
  let fetchFailures = 0;

  for (const card of cards) {
    if (!card?.url || !card?.title) continue;
    try {
      const detailHtml = await fetchText(card.url);
      const detailText = stripTags(detailHtml);
      const permit = buildCitizenSpacePermitPayload({
        card,
        detailHtml,
        detailText,
        now,
        useSourceMetadataColumns,
      });
      if (!permit) continue;
      results.push(permit);
    } catch (_error) {
      fetchFailures += 1;
    }
  }

  return { permits: results, fetchFailures, scanned: cards.length };
}

function buildLegacyPermitKey(permit) {
  const notes = normalizeText(permit?.notes);
  const referenceMatch =
    notes.match(/Reference:\s*(EPR\/[A-Z0-9]+\/[A-Z0-9]+)/i) ||
    normalizeText(permit?.project_title).match(/EPR\/[A-Z0-9]+\/[A-Z0-9]+/i);
  const ref = normalizeText(referenceMatch?.[1] || referenceMatch?.[0], '').toUpperCase();
  if (ref) return `ref:${ref}`;

  return [
    normalizeText(permit?.project_title).toLowerCase(),
    normalizeText(permit?.location).toLowerCase(),
    normalizeText(permit?.country).toLowerCase(),
  ].join('::');
}

async function supportsSourceMetadataColumns() {
  const { error } = await supabase.from('permits').select('id,ingest_key,source_payload').limit(1);
  if (!error) return true;
  if (String(error.message || '').includes('column permits.ingest_key does not exist')) {
    return false;
  }
  if (String(error.message || '').includes('column permits.source_payload does not exist')) {
    return false;
  }
  throw error;
}

async function upsertPermits(records, useSourceMetadataColumns) {
  if (!records.length) return { inserted: 0, updated: 0 };

  if (useSourceMetadataColumns) {
    const { error } = await supabase
      .from('permits')
      .upsert(records, { onConflict: 'ingest_key' });
    if (error) throw error;
    return { inserted: records.length, updated: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('permits')
    .select('id,project_title,location,country')
    .eq('country', 'United Kingdom')
    .range(0, 5000);
  if (existingError) throw existingError;

  const existingByKey = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    existingByKey.set(buildLegacyPermitKey(row), row.id);
  }

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const key = buildLegacyPermitKey(record);
    const existingId = existingByKey.get(key);

    if (existingId) {
      const { error } = await supabase
        .from('permits')
        .update(record)
        .eq('id', existingId);
      if (error) throw error;
      updated += 1;
      continue;
    }

    const { data, error } = await supabase
      .from('permits')
      .insert(record)
      .select('id')
      .single();
    if (error) throw error;
    existingByKey.set(key, data?.id);
    inserted += 1;
  }

  return { inserted, updated };
}

async function cleanupLegacyIngestedRows(records) {
  const activeKeys = new Set(records.map((record) => buildLegacyPermitKey(record)));
  const { data: existing, error } = await supabase
    .from('permits')
    .select('id,project_title,location,country,notes')
    .eq('country', 'United Kingdom')
    .like('notes', 'Official EA permit application notice%')
    .range(0, 5000);
  if (error) throw error;

  const staleIds = [];
  for (const row of Array.isArray(existing) ? existing : []) {
    const key = buildLegacyPermitKey(row);
    if (!activeKeys.has(key)) staleIds.push(row.id);
  }

  if (staleIds.length === 0) return 0;
  const { error: deleteError } = await supabase.from('permits').delete().in('id', staleIds);
  if (deleteError) throw deleteError;
  return staleIds.length;
}

async function cleanupLegacyDuplicateRows() {
  const { data: existing, error } = await supabase
    .from('permits')
    .select('id,project_title,location,country,notes,updated_at')
    .eq('country', 'United Kingdom')
    .range(0, 8000);
  if (error) throw error;

  const groups = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const note = normalizeText(row?.notes);
    if (!note.startsWith('Official EA permit')) continue;
    const key = buildLegacyPermitKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicateIds = [];
  for (const rows of groups.values()) {
    if (!Array.isArray(rows) || rows.length <= 1) continue;
    rows.sort((a, b) => {
      const aTs = new Date(a?.updated_at || 0).getTime();
      const bTs = new Date(b?.updated_at || 0).getTime();
      return bTs - aTs;
    });
    for (let i = 1; i < rows.length; i += 1) duplicateIds.push(rows[i].id);
  }

  if (duplicateIds.length === 0) return 0;
  const { error: deleteError } = await supabase.from('permits').delete().in('id', duplicateIds);
  if (deleteError) throw deleteError;
  return duplicateIds.length;
}

async function run() {
  const now = new Date();
  const lookbackDays = Number.parseInt(process.env.UK_PENDING_PERMIT_LOOKBACK_DAYS || '60', 10);
  const searchLimit = Number.parseInt(process.env.UK_PENDING_PERMIT_SEARCH_LIMIT || '200', 10);
  const consultationPages = Number.parseInt(process.env.UK_PENDING_PERMIT_CONSULTATION_PAGES || '8', 10);
  const contentConcurrency = Number.parseInt(process.env.UK_PENDING_PERMIT_CONTENT_CONCURRENCY || '8', 10);
  const pruneLegacyRows = String(process.env.UK_PENDING_PERMIT_PRUNE || 'false').toLowerCase() === 'true';
  const useSourceMetadataColumns = await supportsSourceMetadataColumns();
  const searchRows = await loadRecentPermitNoticeSearch(Math.max(1, Math.min(200, searchLimit)));
  const citizenSpaceResult = await fetchCitizenSpacePendingFarmPermits(
    now,
    useSourceMetadataColumns,
    Math.max(1, Math.min(12, consultationPages)),
  );

  const candidates = [...citizenSpaceResult.permits];
  let skipped = 0;
  let fetchFailures = citizenSpaceResult.fetchFailures;

  const noticeResults = await mapWithConcurrency(
    searchRows,
    contentConcurrency,
    async (row) => {
      try {
        const content = await loadNoticeContent(row.link);
        const attachmentPaths = extractAttachmentPaths(content);
        const attachmentContents = [];
        for (const attachmentPath of attachmentPaths) {
          try {
            const attachmentContent = await loadNoticeContent(attachmentPath);
            attachmentContents.push(attachmentContent);
          } catch (_error) {
            // Continue; primary notice is still authoritative.
          }
        }
        const permit = buildPermitPayload({
          row,
          content,
          attachmentContents,
          now,
          lookbackDays: Number.isFinite(lookbackDays) ? lookbackDays : 60,
          useSourceMetadataColumns,
        });
        if (!permit) return { kind: 'skipped' };
        return { kind: 'permit', permit };
      } catch (_error) {
        return { kind: 'failed' };
      }
    },
  );

  for (const rowResult of noticeResults) {
    if (rowResult?.kind === 'permit' && rowResult.permit) {
      candidates.push(rowResult.permit);
    } else if (rowResult?.kind === 'failed') {
      skipped += 1;
      fetchFailures += 1;
    } else {
      skipped += 1;
    }
  }

  // Keep only high-quality, deduplicated records.
  const deduped = [];
  const seen = new Set();
  for (const row of candidates) {
    const dedupKey = useSourceMetadataColumns
      ? row.ingest_key
      : buildLegacyPermitKey(row);
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    deduped.push(row);
  }

  const result = await upsertPermits(deduped, useSourceMetadataColumns);
  let pruned = 0;
  let duplicatePruned = 0;
  if (!useSourceMetadataColumns && pruneLegacyRows) {
    pruned = await cleanupLegacyIngestedRows(deduped);
  }
  if (!useSourceMetadataColumns) {
    duplicatePruned = await cleanupLegacyDuplicateRows();
  }
  console.log('✅ UK pending permit sync complete');
  console.log(`   Schema mode: ${useSourceMetadataColumns ? 'source metadata columns' : 'legacy permits schema fallback'}`);
  console.log(`   Search notices scanned: ${searchRows.length}`);
  console.log(`   Citizen Space consultations scanned: ${citizenSpaceResult.scanned}`);
  console.log(`   Citizen Space farm consultations matched: ${citizenSpaceResult.permits.length}`);
  console.log(`   Eligible pending farm permits: ${deduped.length}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Content fetch failures: ${fetchFailures}`);
  console.log(`   Inserted into Supabase permits: ${result.inserted}`);
  console.log(`   Updated in Supabase permits: ${result.updated}`);
  if (!useSourceMetadataColumns) {
    if (pruneLegacyRows) {
      console.log(`   Removed stale non-matching ingested rows: ${pruned}`);
    } else {
      console.log('   Legacy prune disabled (UK_PENDING_PERMIT_PRUNE=false)');
    }
    console.log(`   Removed duplicate legacy rows (same EPR reference): ${duplicatePruned}`);
  }
  if (deduped[0]) {
    console.log(`   Sample: ${deduped[0].project_title}`);
    const sourceUrl = deduped[0].source_url || (deduped[0].notes || '').match(/Source URL:\s*(https?:\/\/\S+)/i)?.[1];
    if (sourceUrl) console.log(`   URL: ${sourceUrl}`);
  }
}

run().catch((error) => {
  console.error('❌ UK pending permit sync failed:', error.message);
  process.exit(1);
});

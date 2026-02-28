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
const LEGACY_PAYLOAD_MARKER = 'Original Payload JSON:';

const FACTORY_FARM_ANIMAL_PATTERN = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|sow|livestock|dairy|farrowing)\b/i;
const FACTORY_FARM_INTENSIVE_PATTERN = /\b(intensive farming|rearing of poultry intensively|section\s*6\.9|6\.9\s*a\(1\))\b/i;

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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
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

async function run() {
  const now = new Date();
  const lookbackDays = Number.parseInt(process.env.UK_PENDING_PERMIT_LOOKBACK_DAYS || '60', 10);
  const pruneLegacyRows = String(process.env.UK_PENDING_PERMIT_PRUNE || 'false').toLowerCase() === 'true';
  const useSourceMetadataColumns = await supportsSourceMetadataColumns();
  const searchRows = await loadRecentPermitNoticeSearch(200);

  const candidates = [];
  let skipped = 0;
  let fetchFailures = 0;

  for (const row of searchRows) {
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
      if (!permit) {
        skipped += 1;
        continue;
      }
      candidates.push(permit);
    } catch (error) {
      skipped += 1;
      fetchFailures += 1;
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
  if (!useSourceMetadataColumns && pruneLegacyRows) {
    pruned = await cleanupLegacyIngestedRows(deduped);
  }
  console.log('✅ UK pending permit sync complete');
  console.log(`   Schema mode: ${useSourceMetadataColumns ? 'source metadata columns' : 'legacy permits schema fallback'}`);
  console.log(`   Search notices scanned: ${searchRows.length}`);
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

const fs = require('fs');
const path = require('path');
const { getSourceTransformer } = require('./permitSourceTransforms');

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toTitleCase(value) {
  return normalizeText(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeStatus(rawStatus) {
  const status = normalizeText(rawStatus, '').toLowerCase();
  if (!status) return 'Pending';

  if (
    status.includes('pending') ||
    status.includes('in process') ||
    status.includes('in review') ||
    status.includes('under review') ||
    status.includes('draft') ||
    status.includes('application received') ||
    status.includes('processing')
  ) {
    return 'Pending';
  }

  if (
    status.includes('approved') ||
    status.includes('issued') ||
    status.includes('granted') ||
    status.includes('active')
  ) {
    return 'Approved';
  }

  if (status.includes('rejected') || status.includes('denied') || status.includes('refused')) {
    return 'Rejected';
  }

  if (status.includes('withdrawn') || status.includes('cancelled') || status.includes('abandoned')) {
    return 'Withdrawn';
  }

  if (status.includes('suspended')) {
    return 'Suspended';
  }

  return toTitleCase(status);
}

function buildPermitKey(sourceKey, rawPermit) {
  const externalId = normalizeText(rawPermit.external_id);
  if (externalId) return `${sourceKey}:${externalId}`;

  const title = slugify(rawPermit.project_title);
  const location = slugify(rawPermit.location);
  const country = slugify(rawPermit.country);
  return `${sourceKey}:${title}:${location}:${country}`;
}

function normalizePermit(rawPermit, source, nowIso) {
  const sourceKey = normalizeText(source?.key, 'unknown_source');
  const ingestKey = buildPermitKey(sourceKey, rawPermit);

  return {
    id: ingestKey,
    ingest_key: ingestKey,
    source_key: sourceKey,
    external_id: normalizeText(rawPermit.external_id, null),
    project_title: normalizeText(rawPermit.project_title, 'Untitled Permit'),
    location: normalizeText(rawPermit.location, 'Unknown Location'),
    country: normalizeText(rawPermit.country, normalizeText(source?.defaults?.country, 'Unknown Country')),
    activity: normalizeText(rawPermit.activity, 'Unknown Activity'),
    status: normalizeStatus(rawPermit.status),
    category: normalizeText(rawPermit.category, normalizeText(source?.defaults?.category, 'Unknown')),
    notes: normalizeText(rawPermit.notes, ''),
    source_url: normalizeText(rawPermit.source_url, normalizeText(source?.url, '')),
    source_name: normalizeText(source?.name, sourceKey),
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function shouldIncludePermit(rawPermit, source) {
  const keywords = Array.isArray(source?.include_keywords)
    ? source.include_keywords
        .map((keyword) => normalizeText(keyword, '').toLowerCase())
        .filter(Boolean)
    : [];

  if (keywords.length === 0) return true;

  const fields = Array.isArray(source?.filter_fields) && source.filter_fields.length > 0
    ? source.filter_fields
    : ['project_title', 'activity', 'notes', 'location'];

  const haystack = fields
    .map((field) => normalizeText(rawPermit?.[field], '').toLowerCase())
    .filter(Boolean)
    .join(' ');

  if (!haystack) return false;
  return keywords.some((keyword) => haystack.includes(keyword));
}

function nextHistoryId(history) {
  const max = history.reduce((highest, item) => {
    const value = Number(item?.id);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return max + 1;
}

function resolveSourcePath(source, baseDir) {
  const sourcePath = normalizeText(source.path);
  if (!sourcePath) {
    throw new Error(`Source ${source.key} is missing path`);
  }
  return path.resolve(baseDir, sourcePath);
}

function resolveMappedValue(record, mapping) {
  if (!mapping) return null;
  if (Array.isArray(mapping)) {
    const parts = mapping
      .map((key) => normalizeText(record?.[key], ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return normalizeText(record?.[mapping], null);
}

function mapRecordToPermit(record, source) {
  const fieldMap = source.field_map || {};
  const defaults = source.defaults || {};

  return {
    external_id:
      resolveMappedValue(record, fieldMap.external_id) || normalizeText(record.external_id, null),
    project_title:
      resolveMappedValue(record, fieldMap.project_title) ||
      normalizeText(record.project_title, normalizeText(defaults.project_title, null)),
    location:
      resolveMappedValue(record, fieldMap.location) ||
      normalizeText(record.location, normalizeText(defaults.location, null)),
    country:
      resolveMappedValue(record, fieldMap.country) ||
      normalizeText(record.country, normalizeText(defaults.country, null)),
    activity:
      resolveMappedValue(record, fieldMap.activity) ||
      normalizeText(record.activity, normalizeText(defaults.activity, null)),
    status:
      resolveMappedValue(record, fieldMap.status) ||
      normalizeText(record.status, normalizeText(defaults.status, null)),
    category:
      resolveMappedValue(record, fieldMap.category) ||
      normalizeText(record.category, normalizeText(defaults.category, null)),
    notes:
      resolveMappedValue(record, fieldMap.notes) ||
      normalizeText(record.notes, normalizeText(defaults.notes, null)),
    source_url:
      resolveMappedValue(record, fieldMap.source_url) ||
      normalizeText(record.source_url, normalizeText(defaults.source_url, null)),
  };
}

function mapSourceRecordToPermit(record, source) {
  const transformKey = normalizeText(source.transform, source.key);
  const transformer = getSourceTransformer(transformKey);
  if (typeof transformer === 'function') {
    return transformer(record, source);
  }
  return mapRecordToPermit(record, source);
}

function readLocalFilePermits(source, baseDir) {
  const filePath = resolveSourcePath(source, baseDir);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Source ${source.key} must contain a JSON array`);
  }
  return parsed;
}

function getFetcher(fetchImpl) {
  const candidate = fetchImpl || globalThis.fetch;
  if (typeof candidate !== 'function') {
    throw new Error('Fetch API is not available for remote source ingestion');
  }
  return candidate;
}

function withTimeout(timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchJson(url, fetchImpl, timeoutMs) {
  const fetcher = getFetcher(fetchImpl);
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetcher(url, { signal: timeout.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  } finally {
    timeout.clear();
  }
}

function extractRecords(payload, source) {
  if (Array.isArray(payload)) return payload;

  const recordsPath = normalizeText(source.records_path, '');
  if (recordsPath) {
    const value = recordsPath.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), payload);
    if (Array.isArray(value)) return value;
  }

  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.features)) return payload.features;

  return [];
}

async function readArcGISPermits(source, fetchImpl) {
  const baseUrl = normalizeText(source.url);
  if (!baseUrl) {
    throw new Error(`Source ${source.key} is missing url`);
  }

  const query = {
    where: '1=1',
    outFields: '*',
    f: 'json',
    ...(source.query || {}),
  };

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  const joinChar = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${joinChar}${params.toString()}`;
  const payload = await fetchJson(url, fetchImpl, source.timeout_ms || 15000);
  const features = extractRecords(payload, source);

  return features.map((feature) => {
    const record = feature?.attributes || feature?.properties || feature;
    return mapSourceRecordToPermit(record, source);
  });
}

async function readJsonUrlPermits(source, fetchImpl) {
  const url = normalizeText(source.url);
  if (!url) {
    throw new Error(`Source ${source.key} is missing url`);
  }

  const payload = await fetchJson(url, fetchImpl, source.timeout_ms || 15000);
  const records = extractRecords(payload, source);

  return records.map((record) => mapSourceRecordToPermit(record, source));
}

async function readSourcePermits(source, baseDir, fetchImpl) {
  const type = normalizeText(source.type, 'local_file');

  if (type === 'local_file') {
    return readLocalFilePermits(source, baseDir);
  }
  if (type === 'arcgis_mapserver') {
    return readArcGISPermits(source, fetchImpl);
  }
  if (type === 'json_url') {
    return readJsonUrlPermits(source, fetchImpl);
  }

  throw new Error(`Unsupported source type: ${type}`);
}

function summarizeStatuses(permits) {
  return permits.reduce((acc, permit) => {
    const key = String(permit.status || 'Unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function previewPermitSource({
  source,
  baseDir = __dirname,
  fetchImpl,
  sampleLimit = 5,
  now = new Date(),
}) {
  if (!source || !source.key) {
    throw new Error('Source is required for preview');
  }

  const nowIso = now.toISOString();
  const rawPermits = await readSourcePermits(source, baseDir, fetchImpl);
  const normalized = [];
  const errorMessages = [];

  for (const rawPermit of rawPermits) {
    try {
      normalized.push(normalizePermit(rawPermit, source, nowIso));
    } catch (error) {
      if (errorMessages.length < 20) {
        errorMessages.push(error.message);
      }
    }
  }

  const limit = Math.min(Math.max(Number(sampleLimit) || 5, 1), 20);
  return {
    sourceKey: source.key,
    sourceName: source.name || source.key,
    fetched: rawPermits.length,
    normalized: normalized.length,
    errors: rawPermits.length - normalized.length,
    errorMessages,
    statusBreakdown: summarizeStatuses(normalized),
    samples: normalized.slice(0, limit),
  };
}

async function syncPermitSource({ source, ingestedPermits, statusHistory, now, baseDir, runId, fetchImpl }) {
  const nowIso = now.toISOString();
  const stats = {
    sourceKey: source.key,
    sourceName: source.name || source.key,
    fetched: 0,
    inserted: 0,
    updated: 0,
    statusChanged: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [],
  };

  const existingByKey = new Map(ingestedPermits.map((permit) => [permit.ingest_key || permit.id, permit]));
  const seenKeys = new Set();

  const rawPermits = await readSourcePermits(source, baseDir, fetchImpl);
  stats.fetched = rawPermits.length;

  for (const rawPermit of rawPermits) {
    try {
      if (!shouldIncludePermit(rawPermit, source)) {
        stats.skipped += 1;
        continue;
      }

      const normalized = normalizePermit(rawPermit, source, nowIso);
      if (!normalized.project_title || !normalized.country || !normalized.location) {
        stats.skipped += 1;
        continue;
      }

      if (seenKeys.has(normalized.ingest_key)) {
        stats.skipped += 1;
        continue;
      }
      seenKeys.add(normalized.ingest_key);

      const existing = existingByKey.get(normalized.ingest_key);
      if (!existing) {
        ingestedPermits.push(normalized);
        existingByKey.set(normalized.ingest_key, normalized);
        stats.inserted += 1;
        continue;
      }

      const previousStatus = normalizeText(existing.status, 'Pending');
      const nextStatus = normalizeText(normalized.status, 'Pending');

      existing.project_title = normalized.project_title;
      existing.location = normalized.location;
      existing.country = normalized.country;
      existing.activity = normalized.activity;
      existing.status = nextStatus;
      existing.category = normalized.category;
      existing.notes = normalized.notes;
      existing.source_url = normalized.source_url;
      existing.source_name = normalized.source_name;
      existing.external_id = normalized.external_id;
      existing.last_seen_at = nowIso;
      existing.updated_at = nowIso;

      stats.updated += 1;

      if (previousStatus !== nextStatus) {
        statusHistory.push({
          id: nextHistoryId(statusHistory),
          permit_key: existing.ingest_key,
          source_key: source.key,
          previous_status: previousStatus,
          new_status: nextStatus,
          changed_at: nowIso,
          run_id: runId,
        });
        stats.statusChanged += 1;
      }
    } catch (error) {
      stats.errors += 1;
      stats.errorMessages.push(error.message);
    }
  }

  return stats;
}

async function syncPermitSources({
  sources,
  sourceKey,
  ingestedPermits,
  statusHistory,
  ingestionRuns,
  now = new Date(),
  baseDir = __dirname,
  fetchImpl,
}) {
  const selected = (Array.isArray(sources) ? sources : []).filter((source) => {
    if (sourceKey) return source.key === sourceKey;
    return source.enabled !== false;
  });

  if (selected.length === 0) {
    throw new Error(sourceKey ? `Source not found or disabled: ${sourceKey}` : 'No enabled permit sources configured');
  }

  const runId = `run-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const run = {
    id: runId,
    started_at: now.toISOString(),
    completed_at: null,
    source_keys: selected.map((source) => source.key),
    inserted: 0,
    updated: 0,
    status_changed: 0,
    skipped: 0,
    errors: 0,
    source_results: [],
  };

  for (const source of selected) {
    try {
      const sourceStats = await syncPermitSource({
        source,
        ingestedPermits,
        statusHistory,
        now,
        baseDir,
        runId,
        fetchImpl,
      });
      run.inserted += sourceStats.inserted;
      run.updated += sourceStats.updated;
      run.status_changed += sourceStats.statusChanged;
      run.skipped += sourceStats.skipped;
      run.errors += sourceStats.errors;
      run.source_results.push(sourceStats);
    } catch (error) {
      run.errors += 1;
      run.source_results.push({
        sourceKey: source.key,
        sourceName: source.name || source.key,
        fetched: 0,
        inserted: 0,
        updated: 0,
        statusChanged: 0,
        skipped: 0,
        errors: 1,
        errorMessages: [error.message],
      });
    }
  }

  run.completed_at = new Date().toISOString();
  ingestionRuns.push(run);

  return { run };
}

module.exports = {
  buildPermitKey,
  normalizePermit,
  normalizeStatus,
  mapRecordToPermit,
  mapSourceRecordToPermit,
  readSourcePermits,
  previewPermitSource,
  shouldIncludePermit,
  syncPermitSource,
  syncPermitSources,
};

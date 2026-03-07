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

const BASE_URL = 'https://ocmms.nic.in/OCMMS_NEW';
const SOURCE_KEY = 'in_ocmms_pending_consent';
const SOURCE_NAME = 'India OCMMS Pending Consent Registry';
const FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|dairy|livestock|piggery|hatchery|abattoir|slaughter|meat|egg|feedlot|animal)\b/i;

const maxStates = Math.max(1, Math.min(28, Number.parseInt(process.env.INDIA_OCMMS_MAX_STATES || '10', 10)));
const maxDistrictsPerState = Math.max(1, Math.min(120, Number.parseInt(process.env.INDIA_OCMMS_MAX_DISTRICTS_PER_STATE || '35', 10)));
const maxRecords = Math.max(5, Math.min(2000, Number.parseInt(process.env.INDIA_OCMMS_MAX_RECORDS || '250', 10)));
const yearFrom = Number.parseInt(process.env.INDIA_OCMMS_YEAR_FROM || '2016', 10);
const yearTo = Number.parseInt(process.env.INDIA_OCMMS_YEAR_TO || String(new Date().getUTCFullYear()), 10);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function decodeHtml(value) {
  return normalizeText(value)
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function stripTags(html) {
  return decodeHtml(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseDdMmYyyyToIso(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const year = Number.parseInt(match[3], 10);
  const dt = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function toSafeJson(value, maxChars = 45000) {
  const raw = JSON.stringify(value, null, 2);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n...TRUNCATED...`;
}

function buildLegacyNotes(record) {
  const lines = [
    'Official pending permit record (trusted source).',
    `Source Key: ${SOURCE_KEY}`,
    `Source Name: ${SOURCE_NAME}`,
    `Source URL: ${record.source_url}`,
    `External ID: ${record.external_id || ''}`,
    `Published at: ${record.published_at || ''}`,
    'Summary: Official OCMMS pending consent record (farm keyword match).',
    'Original Payload JSON:',
    toSafeJson(record.source_payload),
  ].filter(Boolean);
  return lines.join('\n');
}

function permitKey(record) {
  return [
    normalizeText(record.project_title).toLowerCase(),
    normalizeText(record.location).toLowerCase(),
    normalizeText(record.country).toLowerCase(),
  ].join('::');
}

function getCookie(response) {
  const raw = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
  return raw.map((item) => item.split(';')[0]).join('; ');
}

async function fetchText(url, cookie = '', timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (OpenPermitBot/1.0)',
        ...(cookie ? { cookie } : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    return { html: await response.text(), response };
  } finally {
    clearTimeout(timeout);
  }
}

function parseStateOptions(searchHtml) {
  const stateSelectMatch = searchHtml.match(/<select[^>]*id="state"[\s\S]*?<\/select>/i);
  const source = stateSelectMatch ? stateSelectMatch[0] : searchHtml;
  const states = [];
  for (const match of source.matchAll(/<option\s+value="([^"]*)"[^>]*>([^<]+)<\/option>/gi)) {
    const value = normalizeText(match[1]);
    const label = stripTags(match[2]);
    if (!value || value === '0') continue;
    if (!label || /please select/i.test(label)) continue;
    states.push({ value, label });
  }
  return states;
}

function parseDistrictOptions(districtHtml) {
  const districts = [];
  for (const match of districtHtml.matchAll(/<option\s+value='([^']*)'[^>]*>([^<]*)<\/option>/gi)) {
    const value = normalizeText(match[1]);
    const label = stripTags(match[2]);
    if (!value || value === '-1' || value === '0') continue;
    const parts = value.split('&');
    const districtName = normalizeText(parts[1] || label).replace(/_+$/g, '').trim();
    if (!districtName || /^select$/i.test(districtName)) continue;
    districts.push({ value, districtName, label: districtName });
  }

  const seen = new Set();
  return districts.filter((district) => {
    const key = district.districtName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePendingRows(tableHtml) {
  const rows = [];
  for (const rowMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowBody = rowMatch[1];
    const cells = Array.from(rowBody.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) => stripTags(cell[1]));
    if (cells.length < 8) continue;

    const [serialNo, industryName, industryAddress, applicationType, applicationFor, applicationNo, submissionDate, applicationStatus] = cells;
    if (!/^\d+$/.test(serialNo)) continue;
    if (!industryName || !applicationNo) continue;
    if (!/pending/i.test(applicationStatus)) continue;

    rows.push({
      serial_no: serialNo,
      industry_name: industryName,
      industry_address: industryAddress,
      application_type: applicationType,
      application_for: applicationFor,
      application_no: applicationNo,
      submission_date: submissionDate,
      application_status: applicationStatus,
    });
  }
  return rows;
}

async function upsertLegacyRecords(records) {
  if (!records.length) return { inserted: 0, updated: 0 };

  const { data: existing, error: existingError } = await supabase
    .from('permits')
    .select('id,project_title,location,country')
    .range(0, 15000);
  if (existingError) throw existingError;

  const existingByKey = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    existingByKey.set(permitKey(row), row.id);
  }

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const payload = {
      project_title: record.project_title,
      location: record.location,
      country: 'India',
      activity: record.activity,
      status: 'pending',
      category: 'Red',
      notes: buildLegacyNotes(record),
      updated_at: new Date().toISOString(),
    };

    const key = permitKey(record);
    const existingId = existingByKey.get(key);

    if (existingId) {
      const { error } = await supabase.from('permits').update(payload).eq('id', existingId);
      if (error) throw error;
      updated += 1;
    } else {
      const { data, error } = await supabase.from('permits').insert(payload).select('id').single();
      if (error) throw error;
      existingByKey.set(key, data?.id);
      inserted += 1;
    }
  }

  return { inserted, updated };
}

async function run() {
  const priorityStates = [
    'Delhi',
    'Punjab',
    'Haryana',
    'UttarPradesh',
    'Tamilnadu',
    'Andhra Pradesh',
    'Telangana',
    'Maharashtra',
    'Gujarat',
    'Kerala',
  ];
  const priorityIndex = new Map(priorityStates.map((value, index) => [value.toLowerCase(), index]));

  const { html: searchHtml, response: searchResponse } = await fetchText(`${BASE_URL}/searchStatus.jsp`);
  const cookie = getCookie(searchResponse);

  const states = parseStateOptions(searchHtml)
    .sort((a, b) => {
      const ai = priorityIndex.has(a.value.toLowerCase()) ? priorityIndex.get(a.value.toLowerCase()) : 999;
      const bi = priorityIndex.has(b.value.toLowerCase()) ? priorityIndex.get(b.value.toLowerCase()) : 999;
      if (ai !== bi) return ai - bi;
      return a.label.localeCompare(b.label);
    })
    .slice(0, maxStates);

  const found = [];
  const seenByApplicationNo = new Set();

  console.log(`ℹ️ OCMMS farm sync config: states=${states.length}, districts/state<=${maxDistrictsPerState}, maxRecords=${maxRecords}`);

  for (const state of states) {
    if (found.length >= maxRecords) break;

    try {
      console.log(`→ Scanning state: ${state.label} (${state.value})`);
      const { html: districtHtml } = await fetchText(
        `${BASE_URL}/district.jsp?count=${encodeURIComponent(state.value)}`,
        cookie,
      );
      const districts = parseDistrictOptions(districtHtml).slice(0, maxDistrictsPerState);
      console.log(`   districts discovered: ${districts.length}`);

      for (const district of districts) {
        if (found.length >= maxRecords) break;

        const sourceUrl = `${BASE_URL}/getDataPending.action?application=pending&district=${encodeURIComponent(district.districtName)}&state=${encodeURIComponent(state.value)}&status=consent&yearFrom=${yearFrom}&yearTo=${yearTo}`;
        const { html: pendingHtml } = await fetchText(sourceUrl, cookie);
        const rows = parsePendingRows(pendingHtml);
        if (!rows.length) continue;

        for (const row of rows) {
          if (found.length >= maxRecords) break;

          const haystack = `${row.industry_name} ${row.industry_address}`;
          if (!FARM_KEYWORDS_RE.test(haystack)) continue;
          const appNo = normalizeText(row.application_no);
          if (!appNo || seenByApplicationNo.has(appNo)) continue;

          seenByApplicationNo.add(appNo);
          found.push({
            external_id: appNo,
            project_title: row.industry_name,
            location: `${district.districtName}, ${state.label}`,
            country: 'India',
            activity: `OCMMS ${normalizeText(row.application_type, 'Consent')} (${normalizeText(row.application_for, 'unspecified')})`,
            source_url: sourceUrl,
            published_at: parseDdMmYyyyToIso(row.submission_date),
            source_payload: {
              source_key: SOURCE_KEY,
              state: state.label,
              state_value: state.value,
              district: district.districtName,
              industry_address: row.industry_address,
              application_type: row.application_type,
              application_for: row.application_for,
              application_status: row.application_status,
              application_no: row.application_no,
              submission_date: row.submission_date,
            },
          });
        }
      }

      console.log(`   farm matches so far: ${found.length}`);
    } catch (error) {
      console.warn(`⚠️ Skipping state ${state.label}: ${error.message}`);
    }
  }

  const result = await upsertLegacyRecords(found);

  console.log('✅ India OCMMS farm pending sync complete');
  console.log(`   Records matched: ${found.length}`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Updated: ${result.updated}`);
  if (found[0]) {
    console.log(`   Sample: ${found[0].project_title}`);
    console.log(`   Source: ${found[0].source_url}`);
  }
}

run().catch((error) => {
  console.error('❌ India OCMMS farm pending sync failed:', error.message);
  process.exit(1);
});

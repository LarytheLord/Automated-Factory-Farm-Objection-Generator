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

const SOURCE_KEY = 'in_parivesh_seiaa_pending_ec';
const SOURCE_NAME = 'India PARIVESH State EC Pending Proposals';
const SOURCE_BASE_URL = 'https://environmentclearance.nic.in';

const FARM_KEYWORDS_RE = /\b(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|piggery|hatchery|abattoir|slaughter|meat processing|animal feeding|intensive farming|factory farm|cafo|feedlot)\b/i;

const DEFAULT_MAX_STATES = Math.max(1, Math.min(36, Number.parseInt(process.env.INDIA_FARM_MAX_STATES || '20', 10)));
const DEFAULT_MAX_LINKS_PER_STATE = Math.max(1, Math.min(12, Number.parseInt(process.env.INDIA_FARM_MAX_LINKS_PER_STATE || '6', 10)));
const DEFAULT_MAX_RECORDS = Math.max(20, Math.min(2000, Number.parseInt(process.env.INDIA_FARM_MAX_RECORDS || '400', 10)));
const DEFAULT_LOOKBACK_DAYS = Math.max(90, Number.parseInt(process.env.INDIA_FARM_LOOKBACK_DAYS || '3650', 10));

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
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

function toSafeJson(value, maxChars = 45000) {
  const raw = JSON.stringify(value, null, 2);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n...TRUNCATED...`;
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
    const labels = Array.from(before.matchAll(/<li class="arrow[^"]*">([\s\S]*?)<\/li>/gi)).map((item) => stripTags(item[1]));
    let label = normalizeText(labels[labels.length - 1]);

    if (!label) {
      const fallbackText = stripTags(before).replace(/\s+/g, ' ').trim();
      const fallbackMatch = fallbackText.match(/([A-Za-z][A-Za-z\s,&/()-]{6,90})\s*$/);
      label = normalizeText(fallbackMatch?.[1]);
    }
    if (!label) label = `Pending bucket ${links.length + 1}`;

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
    });
  }

  return rows;
}

function buildLegacyNotes(record) {
  const lines = [
    'Official pending permit record (trusted source).',
    `Source Key: ${SOURCE_KEY}`,
    `Source Name: ${SOURCE_NAME}`,
    `Source URL: ${record.source_url}`,
    `External ID: ${record.external_id || ''}`,
    `Published at: ${record.published_at || ''}`,
    'Summary: Official PARIVESH pending EC proposal (farm keyword match).',
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
  const now = new Date();
  const oldestAllowed = new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const portalHtml = await fetchText(`${SOURCE_BASE_URL}/state_portal1.aspx`);

  const priorityStates = [
    'Tamil Nadu',
    'Andhra Pradesh',
    'Telangana',
    'Karnataka',
    'Maharashtra',
    'Gujarat',
    'Punjab',
    'Haryana',
    'Uttar Pradesh',
    'Madhya Pradesh',
    'Rajasthan',
    'Kerala',
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
    .slice(0, DEFAULT_MAX_STATES);

  const records = [];
  const seen = new Set();

  console.log(`ℹ️ India farm sync config: states=${stateNames.length}, links/state=${DEFAULT_MAX_LINKS_PER_STATE}, maxRecords=${DEFAULT_MAX_RECORDS}`);

  for (const stateName of stateNames) {
    try {
      console.log(`→ Scanning state: ${stateName}`);
      const encodedState = encodeURIComponent(stateName);
      const stateUrl = `${SOURCE_BASE_URL}/Staterecord.aspx?State_Name=${encodedState}`;
      const stateHtml = await fetchText(stateUrl);
      const { stateCode, stateNumericId } = parseIndiaStateMetadata(stateHtml);
      if (!stateCode) continue;

      const homeUrl = `${SOURCE_BASE_URL}/HomeStateEC.aspx?state_name=${encodedState}&state_id=${encodeURIComponent(stateCode)}`;
      const homeHtml = await fetchText(homeUrl);
      const statusLinks = extractIndiaPendingStatusLinks(homeHtml).slice(0, DEFAULT_MAX_LINKS_PER_STATE);
      console.log(`   pending buckets discovered: ${statusLinks.length}`);

      for (const statusLink of statusLinks) {
        console.log(`   bucket: ${statusLink.label} (count=${statusLink.count})`);
        const statusUrl = `${SOURCE_BASE_URL}/${statusLink.href}`;
        const statusHtml = await fetchText(statusUrl);
        const rows = parseIndiaProposalRows(statusHtml);
        console.log(`     rows parsed: ${rows.length}`);

        for (const row of rows) {
          if (records.length >= DEFAULT_MAX_RECORDS) break;

          const externalId = normalizeText(row.proposal_no || row.file_no);
          if (!externalId) continue;
          if (seen.has(externalId)) continue;

          const haystack = `${row.title} ${row.category} ${row.company} ${row.current_status}`;
          if (!FARM_KEYWORDS_RE.test(haystack)) continue;

          const submittedDate = extractLastIndiaSubmissionDate(row.important_dates);
          if (submittedDate && submittedDate < oldestAllowed) continue;

          const location = [row.locality, row.district || stateName, stateName].filter(Boolean).join(', ');
          const record = {
            external_id: externalId,
            project_title: row.title,
            location: location || stateName,
            country: 'India',
            activity: row.category
              ? `Environmental Clearance Proposal - ${row.category}`
              : 'Environmental Clearance Proposal',
            source_url: statusUrl,
            published_at: submittedDate ? toIsoDate(submittedDate) : '',
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
            },
          };

          seen.add(externalId);
          records.push(record);
        }
        if (records.length >= DEFAULT_MAX_RECORDS) break;
      }
      console.log(`   farm matches so far: ${records.length}`);
    } catch (error) {
      console.warn(`⚠️ Skipping state ${stateName}: ${error.message}`);
    }
  }

  const result = await upsertLegacyRecords(records);

  console.log('✅ India farm pending permit sync complete');
  console.log(`   States scanned: ${stateNames.length}`);
  console.log(`   Farm records matched: ${records.length}`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Updated: ${result.updated}`);
  if (records[0]) {
    console.log(`   Sample: ${records[0].project_title}`);
    console.log(`   Source: ${records[0].source_url}`);
  }
}

run().catch((error) => {
  console.error('❌ India farm pending sync failed:', error.message);
  process.exit(1);
});

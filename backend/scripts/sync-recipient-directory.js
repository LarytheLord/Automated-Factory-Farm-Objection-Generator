const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'recipient-directory.json');
const INGESTED_PERMITS_FILE = path.join(DATA_DIR, 'ingested-permits.json');

const NC_CONTACTS_URL =
  'https://www.deq.nc.gov/about/divisions/water-resources/water-quality-permitting/animal-feeding-operations/contacts';
const UK_REGISTER_INFO_URL =
  'https://www.gov.uk/access-the-public-register-for-environmental-information';

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toTitleCase(value) {
  return normalizeText(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractEmails(text) {
  const matches = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const unique = new Set();
  for (const match of matches) {
    const email = match.toLowerCase();
    if (email.includes('u003e') || email.includes('u003c')) continue;
    if (email.startsWith('bootstrap@') || email.startsWith('jquery-validation@')) continue;
    unique.add(email);
  }
  return [...unique];
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'AFFOG-recipient-sync/1.0 (+https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator)',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function inferAuthorityNameFromEmail(email) {
  const local = normalizeText(email).split('@')[0];
  const candidate = local.replace(/[._-]+/g, ' ').trim();
  if (!candidate) return email;
  return toTitleCase(candidate);
}

function readIngestedReviewerNames() {
  try {
    const payload = JSON.parse(fs.readFileSync(INGESTED_PERMITS_FILE, 'utf8'));
    if (!Array.isArray(payload)) return new Set();

    const names = new Set();
    for (const permit of payload) {
      if (permit?.source_key !== 'nc_deq_application_tracker') continue;
      const notes = normalizeText(permit.notes);
      if (!notes.includes('|')) continue;
      const parts = notes.split('|').map((part) => normalizeText(part));
      const reviewer = normalizeText(parts[3]);
      if (reviewer) names.add(reviewer);
    }
    return names;
  } catch {
    return new Set();
  }
}

function mapReviewerEmails(ncEmails, reviewerNames) {
  const byName = new Map();

  for (const email of ncEmails) {
    const inferred = inferAuthorityNameFromEmail(email);
    byName.set(normalizeName(inferred), { email, name: inferred });
  }

  const matches = [];
  for (const reviewer of reviewerNames) {
    const key = normalizeName(reviewer);
    const candidate = byName.get(key);
    if (candidate) {
      matches.push({
        authority_name: reviewer,
        reviewer_key: key,
        email: candidate.email,
      });
    }
  }
  return matches;
}

function buildNcEntries(ncEmails, reviewerMatches) {
  const reviewerByEmail = new Map(reviewerMatches.map((item) => [item.email, item]));

  return ncEmails.map((email) => {
    const reviewerMatch = reviewerByEmail.get(email);
    const authorityName = reviewerMatch?.authority_name || inferAuthorityNameFromEmail(email);
    return {
      id: `nc-deq-${slugify(email)}`,
      source_key: 'nc_deq_application_tracker',
      country: 'United States',
      authority_name: authorityName,
      reviewer_key: reviewerMatch?.reviewer_key || normalizeName(authorityName),
      email,
      type: 'email',
      confidence: 'official_directory',
      source_url: NC_CONTACTS_URL,
      tags: reviewerMatch ? ['reviewer_match'] : ['program_contact'],
      reason: reviewerMatch
        ? 'Matched to NC DEQ reviewer listed in permit metadata'
        : 'Listed on NC DEQ Animal Feeding Operations contacts directory',
    };
  });
}

function buildUkEntries(ukEmails) {
  const entries = [];

  for (const email of ukEmails) {
    entries.push({
      id: `uk-ea-${slugify(email)}`,
      source_key: 'uk_ea_public_register',
      country: 'United Kingdom',
      authority_name:
        email === 'enquiries@environment-agency.gov.uk'
          ? 'Environment Agency National Customer Contact Centre'
          : inferAuthorityNameFromEmail(email),
      email,
      type: 'email',
      confidence: 'official_directory',
      source_url: UK_REGISTER_INFO_URL,
      tags: email === 'enquiries@environment-agency.gov.uk' ? ['primary'] : ['support'],
      reason: 'Published on UK government guidance for Environment Agency public register contact',
    });
  }

  return entries;
}

async function run() {
  const sourceAudit = [];
  const reviewerNames = readIngestedReviewerNames();

  let ncEmails = [];
  try {
    const html = await fetchText(NC_CONTACTS_URL);
    ncEmails = extractEmails(html).filter((email) => /@(deq\.nc\.gov|ncdenr\.gov)$/i.test(email));
    sourceAudit.push({
      source_key: 'nc_deq_application_tracker',
      url: NC_CONTACTS_URL,
      fetched_at: new Date().toISOString(),
      status: 'ok',
      emails_found: ncEmails.length,
    });
  } catch (error) {
    sourceAudit.push({
      source_key: 'nc_deq_application_tracker',
      url: NC_CONTACTS_URL,
      fetched_at: new Date().toISOString(),
      status: 'error',
      error: normalizeText(error?.message, 'unknown'),
      emails_found: 0,
    });
  }

  let ukEmails = [];
  try {
    const html = await fetchText(UK_REGISTER_INFO_URL);
    ukEmails = extractEmails(html).filter((email) => /@environment-agency\.gov\.uk$/i.test(email));
    sourceAudit.push({
      source_key: 'uk_ea_public_register',
      url: UK_REGISTER_INFO_URL,
      fetched_at: new Date().toISOString(),
      status: 'ok',
      emails_found: ukEmails.length,
    });
  } catch (error) {
    sourceAudit.push({
      source_key: 'uk_ea_public_register',
      url: UK_REGISTER_INFO_URL,
      fetched_at: new Date().toISOString(),
      status: 'error',
      error: normalizeText(error?.message, 'unknown'),
      emails_found: 0,
    });
  }

  if (!ukEmails.includes('enquiries@environment-agency.gov.uk')) {
    ukEmails.push('enquiries@environment-agency.gov.uk');
  }

  const reviewerMatches = mapReviewerEmails(ncEmails, reviewerNames);
  const entries = [
    ...buildNcEntries(ncEmails, reviewerMatches),
    ...buildUkEntries(ukEmails),
  ];

  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    source_audit: sourceAudit,
    entries,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Wrote ${entries.length} recipient directory entries to ${OUTPUT_FILE}`);
  console.log(`NC reviewer matches: ${reviewerMatches.length}`);
}

run().catch((error) => {
  console.error('Failed to sync recipient directory:', error);
  process.exit(1);
});

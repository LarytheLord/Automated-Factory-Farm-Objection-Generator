const fs = require('fs');
const path = require('path');

const RECIPIENT_DIRECTORY_PATH = path.resolve(__dirname, './data/recipient-directory.json');
const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i;
const SOURCE_KEY_ALIASES = {
  nc_deq_application_tracker: 'us_nc_deq_application_tracker',
  us_nc_deq_application_tracker: 'us_nc_deq_application_tracker',
  uk_ea_public_register: 'uk_ea_public_register',
  uk_gov_environment_agency_notice: 'uk_ea_public_register',
  uk_ea_citizenspace_permit_consultations: 'uk_ea_public_register',
  us_arkansas_deq_pds: 'us_arkansas_deq_pds',
  ie_epa_leap: 'ie_epa_leap',
  au_epbc_referrals: 'au_epbc_referrals',
  ca_on_ero_instruments: 'ca_on_ero_instruments',
  in_parivesh_seiaa_pending_ec: 'in_parivesh_seiaa_pending_ec',
  in_ocmms_pending_consent: 'in_ocmms_pending_consent',
};

const EMAIL_DOMAIN_ALLOWLIST_BY_SOURCE = {
  us_nc_deq_application_tracker: ['deq.nc.gov', 'ncdenr.gov'],
  uk_ea_public_register: ['environment-agency.gov.uk', 'gov.uk'],
  us_arkansas_deq_pds: ['arkansas.gov'],
  ie_epa_leap: ['epa.ie', 'gov.ie'],
  au_epbc_referrals: ['dcceew.gov.au', 'environment.gov.au'],
  ca_on_ero_instruments: ['ontario.ca'],
  in_parivesh_seiaa_pending_ec: ['gov.in', 'nic.in'],
  in_ocmms_pending_consent: ['gov.in', 'nic.in'],
};

let cachedDirectory = [];
let cachedDirectoryMtimeMs = 0;

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function uniqueSuggestions(suggestions) {
  const seen = new Set();
  const result = [];
  for (const suggestion of suggestions) {
    const key = [
      suggestion.type,
      normalizeText(suggestion.email).toLowerCase(),
      normalizeText(suggestion.action_url).toLowerCase(),
      normalizeText(suggestion.label).toLowerCase(),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
  }
  return result;
}

function extractEmailsFromText(text) {
  const input = normalizeText(text);
  if (!input) return [];
  const matches = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return uniqueStrings(matches).filter((email) => {
    const normalized = normalizeText(email).toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith('bootstrap@') || normalized.startsWith('jquery-validation@')) return false;
    if (normalized.includes('u003c') || normalized.includes('u003e')) return false;
    if (IMAGE_EXT_RE.test(normalized)) return false;
    return true;
  });
}

function collectStringValues(value, bucket, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return;
  if (typeof value === 'string') {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, bucket, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectStringValues(item, bucket, depth + 1);
  }
}

function extractEmailsFromPermit(permit) {
  const textValues = [];
  collectStringValues(permit, textValues);
  const emails = [];
  for (const value of textValues) {
    emails.push(...extractEmailsFromText(value));
  }
  return uniqueStrings(emails);
}

function loadRecipientDirectory() {
  try {
    const stat = fs.statSync(RECIPIENT_DIRECTORY_PATH);
    if (stat.mtimeMs > cachedDirectoryMtimeMs) {
      const payload = JSON.parse(fs.readFileSync(RECIPIENT_DIRECTORY_PATH, 'utf8'));
      cachedDirectory = Array.isArray(payload?.entries) ? payload.entries : [];
      cachedDirectoryMtimeMs = stat.mtimeMs;
    }
  } catch {
    cachedDirectory = [];
    cachedDirectoryMtimeMs = 0;
  }
  return cachedDirectory;
}

function canonicalSourceKey(rawKey) {
  const key = normalizeText(rawKey).toLowerCase();
  if (!key) return '';
  return SOURCE_KEY_ALIASES[key] || key;
}

function inferSourceKey(permit) {
  let sourceKey = normalizeText(permit?.source_key);
  if (sourceKey) return canonicalSourceKey(sourceKey);
  const notes = normalizeText(permit?.notes);
  if (!notes) return '';
  const sourceKeyMatch = notes.match(/Source Key:\s*([a-z0-9_:-]+)/i);
  return sourceKeyMatch?.[1] ? canonicalSourceKey(sourceKeyMatch[1]) : '';
}

function parsePermitHints(permit) {
  const sourceKey = inferSourceKey(permit);
  const country = normalizeText(permit?.country);
  const notes = normalizeText(permit?.notes);
  let reviewer = normalizeText(permit?.reviewer);

  if (!reviewer && sourceKey === 'nc_deq_application_tracker' && notes.includes('|')) {
    const parts = notes.split('|').map((part) => normalizeText(part));
    reviewer = normalizeText(parts[3]);
  }

  return {
    sourceKey,
    country,
    reviewer,
    reviewerKey: normalizeKey(reviewer),
  };
}

function emailMatchesSource(email, sourceKey) {
  const canonicalSource = canonicalSourceKey(sourceKey);
  const allowlist = EMAIL_DOMAIN_ALLOWLIST_BY_SOURCE[canonicalSource];
  if (!allowlist || allowlist.length === 0) return true;

  const value = normalizeText(email).toLowerCase();
  const atIndex = value.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = value.slice(atIndex + 1);
  return allowlist.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

function scoreDirectoryEntry(entry, hints) {
  let score = 0;
  const entrySource = canonicalSourceKey(entry.source_key);
  const entryCountry = normalizeText(entry.country);
  const entryReviewer = normalizeKey(entry.reviewer_key || entry.authority_name);
  const tags = Array.isArray(entry.tags) ? entry.tags.map((tag) => normalizeText(tag).toLowerCase()) : [];
  const confidence = normalizeText(entry.confidence).toLowerCase();

  // If both sides are source-scoped and they don't match, block cross-source leakage.
  if (hints.sourceKey && entrySource && entrySource !== hints.sourceKey) {
    return 0;
  }
  // If entry is source-scoped but permit has no source/reviewer hints, avoid cross-state guessing.
  if (entrySource && !hints.sourceKey && !hints.reviewerKey) {
    return 0;
  }

  if (entrySource && hints.sourceKey && entrySource === hints.sourceKey) score += 320;
  if (entryCountry && hints.country && entryCountry.toLowerCase() === hints.country.toLowerCase()) score += 40;
  if (hints.reviewerKey && entryReviewer && entryReviewer === hints.reviewerKey) score += 260;
  if (tags.includes('primary')) score += 80;
  if (tags.includes('state_contact')) score += 40;
  if (confidence === 'official_directory') score += 60;

  return score;
}

function buildDirectorySuggestions(permit) {
  const entries = loadRecipientDirectory();
  if (!entries.length) return [];

  const hints = parsePermitHints(permit);
  const scored = [];

  for (const entry of entries) {
    const email = normalizeText(entry.email);
    if (!email) continue;

    const score = scoreDirectoryEntry(entry, hints);
    if (score <= 0) continue;

    const authorityName = normalizeText(entry.authority_name, email);
    scored.push({
      id: normalizeText(entry.id, `directory-${authorityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
      label: authorityName,
      type: 'email',
      confidence: 'official',
      email,
      action_url: normalizeText(entry.source_url, ''),
      reason: normalizeText(entry.reason, 'Official regulator contact directory'),
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

function buildOfficialFallbacks(permit) {
  const sourceKey = inferSourceKey(permit);
  const country = normalizeText(permit?.country);
  const sourceUrl = normalizeText(permit?.source_url);

  const suggestions = [];

  if (sourceUrl) {
    suggestions.push({
      id: 'source-record',
      label: 'Source permit record',
      type: 'webform',
      confidence: 'official',
      action_url: sourceUrl,
      reason: 'Official source record for this permit',
      score: 40,
    });
  }

  if (sourceKey === 'nc_deq_application_tracker') {
    suggestions.push({
      id: 'nc-deq-contacts',
      label: 'NC DEQ Animal Feeding Operations contacts',
      type: 'webform',
      confidence: 'official',
      action_url:
        'https://www.deq.nc.gov/about/divisions/water-resources/water-quality-permitting/animal-feeding-operations/contacts',
      reason: 'Official NC DEQ contact directory for Animal Feeding Operations',
      score: 50,
    });
  }

  if (sourceKey === 'us_arkansas_deq_pds') {
    suggestions.push({
      id: 'arkansas-deq-pds',
      label: 'Arkansas DEQ Permit Data System (PDS)',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.adeq.state.ar.us/home/pdssql/pds.aspx',
      reason: 'Official Arkansas DEQ permit lookup and contact route',
      score: 50,
    });
  }

  if (sourceKey === 'ie_epa_leap') {
    suggestions.push({
      id: 'ireland-epa-leap',
      label: 'Ireland EPA LEAP licensing portal',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://leap.epa.ie/',
      reason: 'Official Ireland EPA licensing portal for application details and authority routes',
      score: 50,
    });
  }

  if (sourceKey === 'au_epbc_referrals') {
    suggestions.push({
      id: 'australia-epbc-referrals',
      label: 'Australia EPBC referrals register',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://epbcnotices.environment.gov.au/referralslist/',
      reason: 'Official EPBC referrals register with responsible authority details',
      score: 50,
    });
  }

  if (sourceKey === 'ca_on_ero_instruments') {
    suggestions.push({
      id: 'ontario-ero-notices',
      label: 'Ontario Environmental Registry notice page',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://ero.ontario.ca/',
      reason: 'Official Ontario ERO route for notice-specific submissions and contacts',
      score: 50,
    });
  }

  if (sourceKey === 'in_ocmms_pending_consent') {
    suggestions.push({
      id: 'india-ocmms-search',
      label: 'OCMMS pending consent search',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://ocmms.nic.in/OCMMS_NEW/searchStatus.jsp',
      reason: 'Official OCMMS route to verify pending consent authority and state board context',
      score: 70,
    });
  }

  if (sourceKey === 'in_parivesh_seiaa_pending_ec' || country === 'India') {
    suggestions.push({
      id: 'india-parivesh-contact',
      label: 'PARIVESH public contact mailbox',
      type: 'email',
      confidence: 'official',
      email: 'monitoring-deiaa@gov.in',
      action_url: 'https://environmentclearance.nic.in/',
      reason: 'Official PARIVESH contact route for state environmental clearance support',
      score: 85,
    });
    suggestions.push({
      id: 'india-parivesh-state-portal',
      label: 'PARIVESH state clearance portal',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://environmentclearance.nic.in/state_portal1.aspx',
      reason: 'Official state portal to verify authority routing before submission',
      score: 55,
    });
  }

  if (sourceKey === 'uk_ea_public_register' || country === 'United Kingdom') {
    suggestions.push({
      id: 'uk-ea-general-email',
      label: 'Environment Agency customer enquiries',
      type: 'email',
      confidence: 'official',
      email: 'enquiries@environment-agency.gov.uk',
      action_url: 'https://www.gov.uk/access-the-public-register-for-environmental-information',
      reason: 'Official Environment Agency contact mailbox for public register and permitting enquiries',
      score: 82,
    });
    suggestions.push({
      id: 'uk-ea-public-register',
      label: 'Environment Agency public register contact guidance',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.gov.uk/access-the-public-register-for-environmental-information',
      reason: 'Official UK guidance for public register contact routes',
      score: 50,
    });
  }

  return suggestions;
}

function getRecipientSuggestions(permit) {
  const safePermit = permit && typeof permit === 'object' ? permit : {};
  const sourceKey = inferSourceKey(safePermit);
  const extractedEmails = extractEmailsFromPermit(safePermit).filter((email) =>
    emailMatchesSource(email, sourceKey)
  );

  const extractedSuggestions = extractedEmails.map((email, index) => ({
    id: `email-${index + 1}`,
    label: email,
    type: 'email',
    confidence: 'source_extracted',
    email,
    reason: 'Extracted from permit source data',
    score: 130 - index,
  }));

  const directorySuggestions = buildDirectorySuggestions(safePermit);
  const fallbackSuggestions = buildOfficialFallbacks(safePermit);

  const rankedSuggestions = uniqueSuggestions(
    [...extractedSuggestions, ...directorySuggestions, ...fallbackSuggestions].sort((a, b) => {
      const aScore = Number.isFinite(a.score) ? a.score : 0;
      const bScore = Number.isFinite(b.score) ? b.score : 0;
      return bScore - aScore;
    })
  );

  const limitedEmails = rankedSuggestions.filter((item) => item.type === 'email').slice(0, 6);
  const limitedWebforms = rankedSuggestions.filter((item) => item.type === 'webform').slice(0, 3);

  const suggestions = uniqueSuggestions([...limitedEmails, ...limitedWebforms]).map(({ score, ...suggestion }) => suggestion);

  const emailSuggestions = suggestions.filter((item) => item.type === 'email' && item.email);
  const recommended = suggestions[0] || null;

  let guidance = 'No recipient suggestions available. Use the source permit record to locate the correct authority.';
  if (emailSuggestions.length > 0) {
    guidance = 'Use the recommended email first, then verify against the official source link before sending.';
  } else if (suggestions.length > 0) {
    guidance = 'No direct email found. Open the official link to confirm the authority contact route.';
  }

  return {
    count: suggestions.length,
    emailCount: emailSuggestions.length,
    suggestions,
    recommended,
    guidance,
  };
}

module.exports = {
  extractEmailsFromText,
  extractEmailsFromPermit,
  getRecipientSuggestions,
};

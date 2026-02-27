const fs = require('fs');
const path = require('path');

const RECIPIENT_DIRECTORY_PATH = path.resolve(__dirname, './data/recipient-directory.json');

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
  return uniqueStrings(matches);
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

function parsePermitHints(permit) {
  const sourceKey = normalizeText(permit?.source_key);
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

function scoreDirectoryEntry(entry, hints) {
  let score = 0;
  const entrySource = normalizeText(entry.source_key);
  const entryCountry = normalizeText(entry.country);
  const entryReviewer = normalizeKey(entry.reviewer_key || entry.authority_name);
  const tags = Array.isArray(entry.tags) ? entry.tags.map((tag) => normalizeText(tag).toLowerCase()) : [];

  if (entrySource && hints.sourceKey && entrySource === hints.sourceKey) score += 70;
  if (entryCountry && hints.country && entryCountry.toLowerCase() === hints.country.toLowerCase()) score += 20;
  if (hints.reviewerKey && entryReviewer && entryReviewer === hints.reviewerKey) score += 120;
  if (tags.includes('primary')) score += 15;

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
  const sourceKey = normalizeText(permit?.source_key);
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

  if (sourceKey === 'uk_ea_public_register' || country === 'United Kingdom') {
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
  const extractedEmails = extractEmailsFromPermit(safePermit);

  const extractedSuggestions = extractedEmails.map((email, index) => ({
    id: `email-${index + 1}`,
    label: email,
    type: 'email',
    confidence: 'source_extracted',
    email,
    reason: 'Extracted from permit source data',
    score: 300 - index,
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

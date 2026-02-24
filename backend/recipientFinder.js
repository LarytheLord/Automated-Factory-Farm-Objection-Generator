function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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
    });
  }

  if (sourceKey === 'nc_deq_application_tracker') {
    suggestions.push({
      id: 'nc-deq-animal-ops',
      label: 'NC DEQ Animal Operations Program',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.deq.nc.gov/about/divisions/water-resources/water-quality-permitting/animal-feeding-operations-program',
      reason: 'Official NC DEQ program contact and submission path',
    });
  }

  if (sourceKey === 'uk_ea_public_register' || country === 'United Kingdom') {
    suggestions.push({
      id: 'uk-ea-public-register',
      label: 'UK Environment Agency Public Register',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://environment.data.gov.uk/public-register/view/index',
      reason: 'Official UK Environment Agency register and contact routes',
    });
  }

  return suggestions;
}

function getRecipientSuggestions(permit) {
  const safePermit = permit && typeof permit === 'object' ? permit : {};
  const emails = extractEmailsFromPermit(safePermit);

  const emailSuggestions = emails.map((email, index) => ({
    id: `email-${index + 1}`,
    label: email,
    type: 'email',
    confidence: 'source_extracted',
    email,
    reason: 'Extracted from permit source data',
  }));

  const fallbackSuggestions = buildOfficialFallbacks(safePermit);
  const suggestions = [...emailSuggestions, ...fallbackSuggestions];

  return {
    count: suggestions.length,
    emailCount: emailSuggestions.length,
    suggestions,
    guidance:
      emailSuggestions.length === 0
        ? 'No recipient email was found directly in the permit record. Use the official source link to confirm the right authority mailbox.'
        : 'Review recipient details before sending. Use official source links when possible.',
  };
}

module.exports = {
  extractEmailsFromText,
  extractEmailsFromPermit,
  getRecipientSuggestions,
};

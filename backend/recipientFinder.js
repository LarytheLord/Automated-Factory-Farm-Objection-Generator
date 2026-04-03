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

// Country normalization aliases for flexible matching
const COUNTRY_ALIASES = {
  'united states': 'united states',
  'us': 'united states',
  'usa': 'united states',
  'united states of america': 'united states',
  'united kingdom': 'united kingdom',
  'uk': 'united kingdom',
  'great britain': 'united kingdom',
  'england': 'united kingdom',
  'scotland': 'united kingdom',
  'wales': 'united kingdom',
  'northern ireland': 'united kingdom',
  'india': 'india',
  'ireland': 'ireland',
  'australia': 'australia',
  'canada': 'canada',
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

function normalizeCountry(value) {
  const raw = normalizeText(value).toLowerCase();
  // Handle "India (Gujarat)" style → "india"
  const base = raw.replace(/\s*\(.*\)\s*$/, '').trim();
  return COUNTRY_ALIASES[base] || base;
}

function countriesMatch(entryCountry, permitCountry) {
  if (!entryCountry || !permitCountry) return false;
  const a = normalizeCountry(entryCountry);
  const b = normalizeCountry(permitCountry);
  if (a === b) return true;
  if (a === 'global') return true;
  return false;
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

function extractStateFromPermit(permit) {
  // Try explicit state field first
  const state = normalizeText(permit?.state);
  if (state) return state.toLowerCase();

  // Try extracting from location (e.g., "Ahmedabad, Gujarat" or "Gujarat, India")
  const location = normalizeText(permit?.location).toLowerCase();
  if (!location) return '';

  const indianStates = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'new delhi',
  ];
  const ukRegions = ['scotland', 'wales', 'northern ireland', 'england'];
  const usJurisdictions = [
    'district of columbia', 'washington, d.c.', 'washington dc',
    'north carolina', 'arkansas', 'california', 'new york', 'texas',
    'florida', 'ohio', 'pennsylvania', 'illinois', 'georgia', 'michigan',
    'virginia', 'maryland', 'colorado', 'oregon', 'iowa', 'minnesota',
  ];

  // Check D.C. first (special matching for "Washington, D.C." format)
  if (location.includes('washington, d.c.') || location.includes('washington dc') || location.includes('district of columbia')) {
    return 'district of columbia';
  }

  for (const s of [...indianStates, ...ukRegions, ...usJurisdictions]) {
    if (location.includes(s)) return s;
  }

  // Try extracting from notes
  const notes = normalizeText(permit?.notes).toLowerCase();
  if (notes.includes('washington, d.c.') || notes.includes('district of columbia')) {
    return 'district of columbia';
  }
  for (const s of [...indianStates, ...ukRegions, ...usJurisdictions]) {
    if (notes.includes(s)) return s;
  }

  return '';
}

function parsePermitHints(permit) {
  const sourceKey = inferSourceKey(permit);
  const country = normalizeText(permit?.country);
  const notes = normalizeText(permit?.notes);
  const permitDomain = normalizeText(permit?.permit_domain);
  const permitState = extractStateFromPermit(permit);
  let reviewer = normalizeText(permit?.reviewer);

  if (!reviewer && sourceKey === 'us_nc_deq_application_tracker' && notes.includes('|')) {
    const parts = notes.split('|').map((part) => normalizeText(part));
    reviewer = normalizeText(parts[3]);
  }

  return {
    sourceKey,
    country,
    reviewer,
    reviewerKey: normalizeKey(reviewer),
    permitDomain,
    permitState,
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

/**
 * Score a directory entry against permit hints.
 *
 * Legacy entries (source_key-scoped, no tier/permit_domains) use the original
 * strict source-key matching logic. New entries (with tier + permit_domains)
 * use broader country/domain/state matching.
 */
function scoreDirectoryEntry(entry, hints) {
  const entrySource = canonicalSourceKey(entry.source_key);
  const entryCountry = normalizeText(entry.country);
  const entryReviewer = normalizeKey(entry.reviewer_key || entry.authority_name);
  const tags = Array.isArray(entry.tags) ? entry.tags.map((tag) => normalizeText(tag).toLowerCase()) : [];
  const confidence = normalizeText(entry.confidence).toLowerCase();
  const isNewFormat = Boolean(entry.tier || entry.permit_domains);

  // ── Legacy source-key-scoped entries (NC DEQ reviewers, etc.) ──
  if (!isNewFormat) {
    let score = 0;
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

  // ── New broad-match entries (government authorities, NGOs) ──
  let score = 0;
  const entryPermitDomains = Array.isArray(entry.permit_domains) ? entry.permit_domains : [];
  const entryState = normalizeText(entry.state).toLowerCase();
  const entryTier = normalizeText(entry.tier).toLowerCase();
  const entryRecipientType = normalizeText(entry.recipient_type).toLowerCase();

  // Country matching — required for government, bonus for NGO/global
  if (entryRecipientType === 'government') {
    if (!countriesMatch(entryCountry, hints.country)) return 0;
    score += 50;
  } else {
    // NGO — country-specific NGOs score higher, global NGOs get baseline
    if (countriesMatch(entryCountry, hints.country) && normalizeCountry(entryCountry) !== 'global') {
      score += 40;
    } else if (normalizeCountry(entryCountry) === 'global') {
      score += 10;
    } else {
      // NGO from a different country — no match
      return 0;
    }
  }

  // Permit domain matching — critical for relevance
  if (hints.permitDomain && entryPermitDomains.length > 0) {
    if (entryPermitDomains.includes(hints.permitDomain)) {
      score += 200;
    } else {
      // Entry doesn't handle this permit type — skip for government, reduce for NGO
      if (entryRecipientType === 'government') return 0;
      score -= 50;
    }
  } else if (!hints.permitDomain && entryPermitDomains.length > 0) {
    // No domain info on permit — give partial credit
    score += 50;
  }

  // State matching (India SPCBs, UK devolved regulators)
  if (entryState && hints.permitState) {
    if (entryState === hints.permitState) {
      score += 180; // Strong state match — this is THE authority
    } else {
      // Wrong state — skip state-scoped government entries
      if (tags.includes('state_contact') && entryRecipientType === 'government') return 0;
    }
  }

  // Tier scoring
  if (entryTier === 'primary') score += 100;
  else if (entryTier === 'secondary') score += 50;
  else if (entryTier === 'cc') score += 20;

  // Category-specific bonuses for factory farming permits
  if (hints.permitDomain === 'farm_animal') {
    if (tags.includes('animal_welfare')) score += 120;
    if (tags.includes('food_safety')) score += 100;
    if (tags.includes('pollution_control')) score += 60;
  } else {
    if (tags.includes('pollution_control')) score += 80;
  }

  // Government ranks above NGO for primary send-to
  if (entryRecipientType === 'ngo') score -= 30;

  // Confidence bonus
  if (confidence === 'official_directory') score += 30;

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
    const tier = normalizeText(entry.tier).toLowerCase() || null;
    const recipientType = normalizeText(entry.recipient_type).toLowerCase() || null;

    scored.push({
      id: normalizeText(entry.id, `directory-${authorityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
      label: authorityName,
      type: 'email',
      confidence: 'official',
      email,
      action_url: normalizeText(entry.source_url, ''),
      reason: normalizeText(entry.reason, 'Official regulator contact directory'),
      score,
      ...(tier && { tier }),
      ...(recipientType && { recipient_type: recipientType }),
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

  if (sourceKey === 'us_nc_deq_application_tracker') {
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

  if (sourceKey === 'uk_ea_public_register') {
    suggestions.push({
      id: 'uk-ea-public-register',
      label: 'Environment Agency public register',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.gov.uk/access-the-public-register-for-environmental-information',
      reason: 'Official Environment Agency route for public register records and authority contacts',
      score: 55,
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

  if (sourceKey === 'in_parivesh_seiaa_pending_ec' || normalizeCountry(country) === 'india') {
    suggestions.push({
      id: 'india-parivesh-state-portal',
      label: 'PARIVESH state clearance portal',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://environmentclearance.nic.in/state_portal1.aspx',
      reason: 'Official state portal to verify authority routing before submission',
      score: 55,
    });
    suggestions.push({
      id: 'india-cpgrams',
      label: 'CPGRAMS public grievance portal',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://pgportal.gov.in/',
      reason: 'India central public grievance system — creates official government paper trail',
      score: 45,
    });
    suggestions.push({
      id: 'india-ngt',
      label: 'National Green Tribunal (e-filing)',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://greentribunal.gov.in/',
      reason: 'Specialized environmental court — can impose fines, halt projects (escalation path)',
      score: 35,
    });
  }

  if (normalizeCountry(country) === 'united states') {
    suggestions.push({
      id: 'us-epa-echo',
      label: 'EPA ECHO violation reporting',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://echo.epa.gov/report-environmental-violations',
      reason: 'Online form to report violations directly to EPA enforcement personnel',
      score: 65,
    });
  }

  const permitState = extractStateFromPermit(permit);
  if (permitState === 'district of columbia') {
    suggestions.push({
      id: 'dc-boe-initiatives',
      label: 'D.C. Board of Elections — Initiatives',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.dcboe.org/Initiatives-Referenda',
      reason: 'Official D.C. Board of Elections portal for ballot initiative information',
      score: 75,
    });
    suggestions.push({
      id: 'dc-council-portal',
      label: 'D.C. Council — Contact your Councilmember',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://dccouncil.gov/council/',
      reason: 'Find and contact your ward-specific D.C. Council member',
      score: 60,
    });
  }

  if (normalizeCountry(country) === 'united kingdom') {
    suggestions.push({
      id: 'uk-gov-report',
      label: 'GOV.UK report environmental problem',
      type: 'webform',
      confidence: 'official',
      action_url: 'https://www.gov.uk/report-environmental-problem',
      reason: 'UK government online service for water pollution and odour problems',
      score: 60,
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

  // Split into government/primary and NGO/CC
  const governmentEmails = rankedSuggestions.filter(
    (item) => item.type === 'email' && item.recipient_type !== 'ngo'
  );
  const ngoEmails = rankedSuggestions.filter(
    (item) => item.type === 'email' && item.recipient_type === 'ngo'
  );
  const webforms = rankedSuggestions.filter((item) => item.type === 'webform');

  // Limits: up to 6 government/primary emails, 4 NGO CC emails, 4 webforms
  const limitedGovEmails = governmentEmails.slice(0, 6);
  const limitedNgoEmails = ngoEmails.slice(0, 4);
  const limitedWebforms = webforms.slice(0, 4);

  const allSuggestions = uniqueSuggestions([...limitedGovEmails, ...limitedNgoEmails, ...limitedWebforms])
    .map(({ score, ...suggestion }) => suggestion);

  const sendToSuggestions = allSuggestions.filter((s) => s.type === 'email' && s.recipient_type !== 'ngo');
  const ccSuggestions = allSuggestions.filter((s) => s.type === 'email' && s.recipient_type === 'ngo');
  const webformSuggestions = allSuggestions.filter((s) => s.type === 'webform');

  const emailSuggestions = allSuggestions.filter((item) => item.type === 'email' && item.email);
  const recommended = sendToSuggestions[0] || emailSuggestions[0] || null;

  let guidance = 'No recipient suggestions available. Use the source permit record to locate the correct authority.';
  if (sendToSuggestions.length > 0 && ccSuggestions.length > 0) {
    guidance = `Send to ${sendToSuggestions.length} authority contact${sendToSuggestions.length > 1 ? 's' : ''} and CC ${ccSuggestions.length} advocacy org${ccSuggestions.length > 1 ? 's' : ''} to amplify your objection.`;
  } else if (emailSuggestions.length > 0) {
    guidance = 'Use the recommended email first, then verify against the official source link before sending.';
  } else if (allSuggestions.length > 0) {
    guidance = 'No direct email found. Open the official link to confirm the authority contact route.';
  }

  return {
    count: allSuggestions.length,
    emailCount: emailSuggestions.length,
    suggestions: allSuggestions,
    sendTo: sendToSuggestions,
    cc: ccSuggestions,
    webforms: webformSuggestions,
    recommended,
    guidance,
  };
}

module.exports = {
  extractEmailsFromText,
  extractEmailsFromPermit,
  getRecipientSuggestions,
};

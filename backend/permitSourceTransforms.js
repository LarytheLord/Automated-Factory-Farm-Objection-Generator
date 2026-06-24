function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function unwrapValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    const parts = value.map((item) => unwrapValue(item)).filter(Boolean);
    return parts.join(', ');
  }
  if (typeof value === 'object') {
    if ('value' in value) return unwrapValue(value.value);
    if ('@value' in value) return unwrapValue(value['@value']);
    if ('label' in value) return unwrapValue(value.label);
    if ('name' in value) return unwrapValue(value.name);
    if ('title' in value) return unwrapValue(value.title);
    if ('notation' in value) return unwrapValue(value.notation);
    if ('@id' in value) return unwrapValue(value['@id']);

    const nested = Object.values(value)
      .map((item) => unwrapValue(item))
      .filter(Boolean);
    return nested.join(', ');
  }
  return normalizeText(value, '');
}

function pick(record, keys, fallback = '') {
  for (const key of keys) {
    const value = unwrapValue(record?.[key]);
    if (value) return value;
  }
  return fallback;
}

function pickJoined(record, keys, separator = ', ') {
  const values = keys.map((key) => unwrapValue(record?.[key])).filter(Boolean);
  return values.length > 0 ? values.join(separator) : '';
}

function transformNcDeqRecord(record) {
  const location = pickJoined(record, ['ADDRESS', 'CITY', 'STATE']) || pick(record, ['LOCATION']);
  const notes = pickJoined(record, ['COUNTY', 'APP_TYPE', 'CLASSIFICATION', 'REVIEWER'], ' | ');
  return {
    external_id: pick(record, ['APP_ID', 'APPLICATION_NUMBER', 'APP_NUM']),
    project_title: pick(record, ['NAME', 'FACILITY_NAME', 'PROJECT_NAME', 'SITE_NAME'], 'Unnamed NC Permit'),
    location,
    country: pick(record, ['COUNTRY'], 'United States'),
    activity: pick(record, ['PROG_CAT', 'PROGRAM', 'PERMIT_TYPE', 'ACTIVITY'], 'Animal Operations'),
    status: pick(record, ['STATUS', 'APP_STATUS', 'PERMIT_STATUS', 'APP_TYPE'], 'Pending'),
    category: pick(record, ['CATEGORY'], 'Unknown'),
    notes: notes || pick(record, ['FACILITY_DESC', 'COMMENTS', 'NOTES']),
    source_url: pick(record, ['SOURCE_URL', 'DETAIL_URL', 'documentURL']),
  };
}

function inferUkStatus(record) {
  const raw = [
    unwrapValue(record.status),
    unwrapValue(record.permitStatus),
    unwrapValue(record.applicationStatus),
    unwrapValue(record.type),
    unwrapValue(record.register),
    unwrapValue(record.notation),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!raw) return 'Pending';
  if (raw.includes('application') || raw.includes('draft') || raw.includes('consultation')) return 'Pending';
  if (raw.includes('refus') || raw.includes('reject') || raw.includes('denied')) return 'Rejected';
  if (raw.includes('withdrawn') || raw.includes('revoked') || raw.includes('surrendered')) return 'Withdrawn';
  if (raw.includes('issued') || raw.includes('granted') || raw.includes('registered') || raw.includes('permit')) {
    return 'Approved';
  }
  return 'Pending';
}

function transformUkEaRecord(record) {
  const site = record?.site || {};
  const holder = record?.holder || {};
  const register = record?.register || {};

  const location = [
    unwrapValue(site.address),
    unwrapValue(site.label),
    unwrapValue(site.name),
    unwrapValue(site.localAuthority),
    unwrapValue(record.localAuthority),
  ]
    .filter(Boolean)
    .join(', ');

  const title = pick(
    {
      ...record,
      siteName: unwrapValue(site.label) || unwrapValue(site.name),
      holderName: unwrapValue(holder.label) || unwrapValue(holder.name),
      registerLabel: unwrapValue(register.label) || unwrapValue(register.name),
    },
    ['facilityName', 'operatorName', 'holderName', 'siteName', 'registerLabel'],
    'UK Industrial Installation'
  );

  return {
    external_id: pick(record, ['registrationNumber', 'permitNumber', 'permit_reference', '@id']),
    project_title: title,
    location,
    country: pick(record, ['country'], 'United Kingdom'),
    activity: pick(record, ['activityType', 'activity', 'type', 'notation'], 'Industrial Installation'),
    status: inferUkStatus(record),
    category: pick(record, ['category'], 'Unknown'),
    notes: pick(record, ['notes', 'description', 'notation']),
    source_url: pick(record, ['documentURL', '@id', 'uri', 'source_url']),
  };
}

// ─── Australia EPBC Referrals (ArcGIS) ───

const AU_NOT_PENDING_RE = /\b(completed|post-approval|lapsed|withdrawn|refused|approval decision made|referral decision made)\b/i;

function inferAuStatus(record) {
  const status = normalizeText(pick(record, ['STATUS_DESCRIPTION', 'STAGE_NAME']), '');
  if (!status) return 'Pending';
  if (AU_NOT_PENDING_RE.test(status)) return 'Approved';
  return 'Pending';
}

function transformAuEpbcRecord(record) {
  const statusDesc = normalizeText(pick(record, ['STATUS_DESCRIPTION']), '');
  const stageName = normalizeText(pick(record, ['STAGE_NAME']), '');
  const notes = [statusDesc, stageName].filter(Boolean).join(' | ');

  let sourceUrl = pick(record, ['REFERRAL_URL']);
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    sourceUrl = 'https://epbcnotices.environment.gov.au/referralslist/';
  }

  return {
    external_id: pick(record, ['REFERENCE_NUMBER', 'REFERRAL_NUMBER']),
    project_title: pick(record, ['NAME', 'REFERRAL_TITLE', 'PROJECT_NAME'], 'Unnamed AU Referral'),
    location: pick(record, ['PRIMARY_JURISDICTION', 'STATE'], 'Australia'),
    country: 'Australia',
    activity: pick(record, ['REFERRAL_TYPE'], 'EPBC Referral'),
    status: inferAuStatus(record),
    category: 'Unknown',
    notes,
    source_url: sourceUrl,
  };
}

// ─── Ireland EPA LEAP (JSON URL) ───

function transformIeEpaLeapRecord(record) {
  const sector = normalizeText(pick(record, ['sector']), '');
  const licenceType = normalizeText(pick(record, ['type']), '');
  const activity = [licenceType, sector].filter(Boolean).join(' - ') || 'Industrial Emissions Licence';
  const notes = [sector, licenceType].filter(Boolean).join(' | ');

  return {
    external_id: pick(record, ['authorisationnumber', 'licenceid']),
    project_title: pick(record, ['authorisationname', 'facility', 'facilityname'], 'Ireland EPA Licence'),
    location: pick(record, ['county', 'address'], 'Ireland'),
    country: 'Ireland',
    activity,
    status: pick(record, ['status'], 'Pending'),
    category: 'Unknown',
    notes,
    source_url: 'https://leap.epa.ie/',
  };
}

// ─── Ireland National Planning Applications (ArcGIS FeatureServer) ───
// Covers all 26 local authorities. The FeatureServer ignores server-side LIKE filters,
// so we fetch all NEW APPLICATION records and rely on shouldIncludePermit() + include_keywords
// in the source config to filter for intensive agriculture descriptions client-side.

function cleanIePlanningTitle(desc) {
  // Strip boilerplate planning-application prefixes so the meaningful content leads
  const stripped = desc
    .replace(/^planning permission (for development consisting of |for development |for |to )/i, '')
    .replace(/^permission (for development consisting of |for development |for |to )/i, '')
    .replace(/^consisting of\s+/i, '')
    .replace(/^proposed\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const titled = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  if (titled.length <= 160) return titled;
  const cut = titled.slice(0, 157);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + '...';
}

function inferIeActivity(desc) {
  const d = desc.toLowerCase();
  if (/poultry house|poultry shed|poultry farm|broiler house|broiler unit|broiler shed|laying hen|layer house|egg production|hatchery/.test(d)) {
    return 'Intensive Poultry Farm — Planning Application';
  }
  if (/pig house|pig unit|piggery|sow unit|fattening pig|pig rearing|intensive pig/.test(d)) {
    return 'Intensive Pig Farm — Planning Application';
  }
  if (/dairy farm|dairy parlour|dairy unit|milking parlour/.test(d)) {
    return 'Dairy Farm — Planning Application';
  }
  if (/slatted shed|slatted unit|slatted area|slatted floor|slatted cattle|cubicle shed|beef cattle|cattle house|cattle unit|calf rearing|livestock|weanling|bullock|heifer|store cattle/.test(d)) {
    return 'Intensive Cattle Farm — Planning Application';
  }
  if (/fish farm|aquaculture|fishery/.test(d)) {
    return 'Aquaculture — Planning Application';
  }
  if (/slurry storage|slurry tank|manure storage|manure tank/.test(d)) {
    return 'Slurry / Manure Storage — Planning Application';
  }
  return 'Intensive Agriculture — Planning Application';
}

function cleanIeLocation(addr, authority) {
  // Fix extra spaces around commas from ArcGIS data (e.g. "Town , County , Ireland")
  const cleanAddr = addr.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim();
  const parts = [cleanAddr, authority].filter(Boolean);
  return parts.join(' — ');
}

function transformIeNationalPlanningRecord(record) {
  const appNum = normalizeText(pick(record, ['ApplicationNumber']), '');
  const authority = normalizeText(pick(record, ['PlanningAuthority']), 'Ireland');
  const desc = normalizeText(pick(record, ['DevelopmentDescription']), 'Planning Application');
  const addr = normalizeText(pick(record, ['DevelopmentAddress']), authority);
  const detailLink = normalizeText(pick(record, ['LinkAppDetails']), '');

  const rawDate = pick(record, ['ReceivedDate']);
  const publishedAt = rawDate && Number.isFinite(Number(rawDate))
    ? new Date(Number(rawDate)).toISOString().slice(0, 10)
    : null;

  const rawDue = pick(record, ['DecisionDueDate']);
  const deadline = rawDue && Number.isFinite(Number(rawDue))
    ? new Date(Number(rawDue)).toISOString().slice(0, 10)
    : null;

  return {
    external_id: appNum,
    project_title: cleanIePlanningTitle(desc) || 'Ireland Planning Application',
    location: cleanIeLocation(addr, authority),
    country: 'Ireland',
    activity: inferIeActivity(desc),
    status: 'Pending',
    category: 'Red',
    notes: `${authority} planning application ${appNum}. ${desc.slice(0, 400)}`,
    source_url: detailLink || 'https://www.planning.gov.ie/',
    published_at: publishedAt,
    consultation_deadline: deadline,
  };
}

// ─── Arkansas DEQ (CSV) ───

function transformArkansasDeqRecord(record) {
  const city = normalizeText(pick(record, ['FacSiteCity']), '');
  const county = normalizeText(pick(record, ['FacCountyName']), '');
  const location = [city, county, 'AR'].filter(Boolean).join(', ') || 'Arkansas';

  const statusDesc = normalizeText(pick(record, ['PmtStatusDesc']), '');
  const naicsDesc = normalizeText(pick(record, ['FacPrimaryNAICSDesc']), '');
  const notes = [statusDesc, naicsDesc].filter(Boolean).join(' | ');

  // Try to extract a date
  const rawDate = pick(record, ['PmtStatusDate', 'RecModifiedDate', 'RecCreatedDate']);

  return {
    external_id: pick(record, ['PmtNbr']),
    project_title: pick(record, ['FacName'], 'Arkansas Permit'),
    location,
    country: 'United States',
    activity: naicsDesc || 'Animal Production Permit',
    status: statusDesc || 'Pending',
    category: 'Unknown',
    notes,
    source_url: 'https://www.adeq.state.ar.us/home/pdssql/pds.aspx',
  };
}

function getSourceTransformer(sourceKeyOrName) {
  const key = normalizeText(sourceKeyOrName, '');
  const transformers = {
    nc_deq_application_tracker: transformNcDeqRecord,
    us_nc_deq_application_tracker: transformNcDeqRecord,
    uk_ea_public_register: transformUkEaRecord,
    au_epbc_referrals: transformAuEpbcRecord,
    ie_epa_leap: transformIeEpaLeapRecord,
    ie_national_planning: transformIeNationalPlanningRecord,
    us_arkansas_deq_pds: transformArkansasDeqRecord,
  };
  return transformers[key] || null;
}

module.exports = {
  getSourceTransformer,
  transformNcDeqRecord,
  transformUkEaRecord,
  transformAuEpbcRecord,
  transformIeEpaLeapRecord,
  transformIeNationalPlanningRecord,
  transformArkansasDeqRecord,
};

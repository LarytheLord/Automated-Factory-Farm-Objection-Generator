const {
  transformNcDeqRecord,
  transformUkEaRecord,
  getSourceTransformer,
} = require('../backend/permitSourceTransforms');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const nc = transformNcDeqRecord({
    APP_ID: 'NC-APP-42',
    NAME: 'Blue Ridge Farms',
    ADDRESS: '100 Farm Ln',
    CITY: 'Asheville',
    STATE: 'NC',
    PROG_CAT: 'Animal Operations',
    COUNTY: 'Buncombe',
    STATUS: 'In Process',
  });

  assert(nc.external_id === 'NC-APP-42', 'NC transform external_id mismatch');
  assert(nc.project_title === 'Blue Ridge Farms', 'NC transform title mismatch');
  assert(nc.location === '100 Farm Ln, Asheville, NC', 'NC transform location mismatch');
  assert(nc.country === 'United States', 'NC transform default country mismatch');

  const uk = transformUkEaRecord({
    registrationNumber: 'EPR/AB1234CD',
    holder: { label: 'Wye Valley Poultry Ltd' },
    site: { label: 'Herefordshire' },
    type: 'Permit issued',
    documentURL: 'https://environment.data.gov.uk/id/permit/EPR-AB1234CD',
  });

  assert(uk.external_id === 'EPR/AB1234CD', 'UK transform external_id mismatch');
  assert(uk.project_title.includes('Wye Valley Poultry'), 'UK transform title mismatch');
  assert(uk.status === 'Approved', 'UK transform status mismatch');
  assert(uk.source_url.includes('environment.data.gov.uk'), 'UK transform source url mismatch');

  assert(typeof getSourceTransformer('nc_deq_application_tracker') === 'function', 'missing NC transformer');
  assert(typeof getSourceTransformer('uk_ea_public_register') === 'function', 'missing UK transformer');
  assert(getSourceTransformer('unknown_source') === null, 'unknown source should return null transformer');

  console.log('phase6 source transform tests passed');
}

run();

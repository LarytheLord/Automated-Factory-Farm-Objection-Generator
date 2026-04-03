function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  process.env.NODE_ENV = 'development';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_KEY = '';

  const { getCountryLegalFramework } = require('../backend/server');

  const ireland = getCountryLegalFramework('Ireland');
  assert(ireland.includes('Environmental Protection Agency Act 1992'), 'Ireland framework missing EPA Act');
  assert(ireland.includes('Planning and Development Act 2000'), 'Ireland framework missing Planning and Development Act');

  const nigeria = getCountryLegalFramework('Nigeria');
  assert(nigeria.includes('Environmental Impact Assessment Act'), 'Nigeria framework missing EIA Act');
  assert(nigeria.includes('National Environmental Standards and Regulations Enforcement Agency'), 'Nigeria framework missing NESREA Act');

  const brazil = getCountryLegalFramework('Brazil');
  assert(brazil.includes('Federal Law No. 6,938/1981'), 'Brazil framework missing National Environmental Policy law');
  assert(brazil.includes('CONAMA Resolution No. 237/1997'), 'Brazil framework missing CONAMA Resolution 237/1997');

  console.log('phase15 legal framework tests passed');
}

run();

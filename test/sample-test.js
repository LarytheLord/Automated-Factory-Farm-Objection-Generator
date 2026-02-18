const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  return { response, data };
}

async function run() {
  console.log(`Running AFFOG contract tests against: ${BASE_URL}`);

  // 1) Health
  const health = await request('/api/health');
  assert(health.response.ok, 'GET /api/health failed');
  assert(health.data && health.data.status === 'ok', 'Health payload invalid');
  console.log('✓ GET /api/health');

  // 2) Permits
  const permitsResult = await request('/api/permits');
  assert(permitsResult.response.ok, 'GET /api/permits failed');
  assert(Array.isArray(permitsResult.data), 'Permits response is not an array');
  assert(permitsResult.data.length > 0, 'Permits array is empty');
  console.log('✓ GET /api/permits');

  const permit = permitsResult.data[0];

  // 3) Register
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const register = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'StrongPass123!',
      name: 'AFFOG Test User',
    }),
  });
  assert(register.response.status === 201, `POST /api/auth/register failed: ${register.response.status}`);
  assert(register.data && register.data.token, 'Register response missing token');
  console.log('✓ POST /api/auth/register');

  // 4) Login
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: uniqueEmail, password: 'StrongPass123!' }),
  });
  assert(login.response.ok, 'POST /api/auth/login failed');
  assert(login.data && login.data.token, 'Login response missing token');
  const token = login.data.token;
  console.log('✓ POST /api/auth/login');

  // 5) Auth/me
  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(me.response.ok, 'GET /api/auth/me failed');
  assert(me.data && me.data.user && me.data.user.email === uniqueEmail, 'Auth/me payload invalid');
  console.log('✓ GET /api/auth/me');

  // 6) Generate letter
  const generated = await request('/api/generate-letter', {
    method: 'POST',
    body: JSON.stringify({
      permitDetails: {
        ...permit,
        yourName: 'AFFOG Test User',
        yourEmail: uniqueEmail,
        yourAddress: '123 Test St',
        yourCity: 'Bengaluru',
        yourPostalCode: '560001',
        yourPhone: '+1-555-0100',
      },
    }),
  });
  assert(generated.response.ok, 'POST /api/generate-letter failed');
  assert(generated.data && typeof generated.data.letter === 'string' && generated.data.letter.length > 50, 'Generated letter invalid');
  console.log('✓ POST /api/generate-letter');

  // 6.1) Usage visibility
  const usage = await request('/api/usage', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(usage.response.ok, 'GET /api/usage failed');
  assert(usage.data && usage.data.letters && usage.data.letters.usage, 'Usage payload invalid');
  console.log('✓ GET /api/usage');

  // 7) Save objection
  const objection = await request('/api/objections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      permit_id: permit.id,
      project_title: permit.project_title,
      location: permit.location,
      country: permit.country,
      generated_text: generated.data.letter,
      status: 'draft',
    }),
  });
  assert(objection.response.status === 201, `POST /api/objections failed: ${objection.response.status}`);
  assert(objection.data && objection.data.id, 'Created objection missing id');
  console.log('✓ POST /api/objections');

  // 8) Objections list
  const objections = await request('/api/objections', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(objections.response.ok, 'GET /api/objections failed');
  assert(Array.isArray(objections.data), 'Objections response is not an array');
  assert(objections.data.some((o) => String(o.id) === String(objection.data.id)), 'Created objection not found in list');
  console.log('✓ GET /api/objections');

  // 9) Persistence file check
  const objectionsFilePath = path.join(__dirname, '../backend/data/objections.json');
  const objectionsFile = JSON.parse(fs.readFileSync(objectionsFilePath, 'utf8'));
  assert(Array.isArray(objectionsFile), 'backend/data/objections.json is not an array');
  assert(objectionsFile.some((o) => String(o.id) === String(objection.data.id)), 'Objection was not persisted to JSON data store');
  console.log('✓ JSON persistence check');

  // 11) Send email endpoint
  const email = await request('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({
      to: 'authority@example.org',
      subject: `Test Objection: ${permit.project_title}`,
      text: generated.data.letter,
    }),
  });
  assert(email.response.ok, 'POST /api/send-email failed');
  assert(email.data && typeof email.data.message === 'string', 'Email response payload invalid');
  console.log('✓ POST /api/send-email');

  console.log('\nAll AFFOG contract tests passed.');
}

run().catch((error) => {
  console.error('\nContract tests failed:', error.message);
  process.exit(1);
});

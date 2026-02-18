function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectRoutes(app) {
  const routes = [];
  const stack = app?.router?.stack || app?._router?.stack || [];

  for (const layer of stack) {
    if (!layer.route) continue;
    const methods = Object.keys(layer.route.methods || {})
      .filter((method) => layer.route.methods[method])
      .map((method) => method.toUpperCase());

    for (const method of methods) {
      routes.push(`${method} ${layer.route.path}`);
    }
  }

  return routes;
}

function run() {
  process.env.NODE_ENV = 'development';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_KEY = '';

  const { app } = require('../backend/server');
  const routes = collectRoutes(app);

  const requiredRoutes = [
    'GET /api/health',
    'GET /api/permits',
    'GET /api/permits/:id',
    'POST /api/permits',
    'POST /api/generate-letter',
    'POST /api/send-email',
    'GET /api/usage',
    'GET /api/stats',
    'GET /api/objections',
    'POST /api/objections',
    'POST /api/auth/register',
    'POST /api/auth/login',
    'GET /api/auth/me',
    'GET /api/legal-frameworks',
    'GET /api/admin/quotas',
    'PATCH /api/admin/quotas',
    'GET /api/admin/platform-config',
    'PATCH /api/admin/platform-config',
    'GET /api/admin/usage/summary',
    'GET /api/admin/usage/anomalies',
    'POST /api/admin/usage/reset',
    'GET /api/admin/permit-sources',
    'POST /api/admin/permit-sources/preview',
    'POST /api/admin/permit-sources/validate',
    'PATCH /api/admin/permit-sources/:sourceKey',
    'POST /api/admin/permit-sources/sync',
    'GET /api/admin/ingestion-runs',
    'GET /api/admin/ingestion-health',
    'GET /api/admin/permit-status-history',
  ];

  for (const route of requiredRoutes) {
    assert(routes.includes(route), `missing required route: ${route}`);
  }

  console.log('phase10 api surface tests passed');
}

run();

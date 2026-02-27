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

  const expected = [
    'GET /api/admin/permit-sources',
    'POST /api/admin/permit-sources/sync',
    'POST /api/admin/permit-sources/validate',
    'GET /api/admin/ingestion-runs',
    'GET /api/admin/ingestion-health',
    'GET /api/admin/permit-status-history',
  ];

  for (const route of expected) {
    assert(routes.includes(route), `missing admin route: ${route}`);
  }

  console.log('phase8 admin ingestion endpoint route tests passed');
}

run();

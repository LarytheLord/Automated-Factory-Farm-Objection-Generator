let express;
try {
  express = require('express');
} catch {
  express = require('./backend/node_modules/express');
}
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const { app: backendApp } = require('./backend/server');

// Backend app owns /api/* paths.
app.use(backendApp);

let nextApp;
let nextHandler;

try {
  let next;
  try {
    next = require('next');
  } catch {
    next = require('./frontend/node_modules/next');
  }
  nextApp = next({
    dev: process.env.NODE_ENV !== 'production',
    dir: path.join(__dirname, 'frontend'),
  });
  nextHandler = nextApp.getRequestHandler();

  nextApp.prepare().then(() => {
    console.log('✅ Next.js frontend ready');

    // For non-API routes, serve Next.js.
    app.use((req, res, nextMiddleware) => {
      if (req.path.startsWith('/api/')) {
        return nextMiddleware();
      }
      return nextHandler(req, res);
    });

    app.listen(port, (err) => {
      if (err) throw err;
      console.log(`\n🚀 Open Permit running on port ${port}`);
      console.log(`   Frontend: http://localhost:${port}`);
      console.log(`   Backend API: http://localhost:${port}/api\n`);
    });
  }).catch((error) => {
    console.error('❌ Failed to prepare Next.js:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Error loading Next.js:', error.message);
  console.log('Starting backend-only server...');

  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`\n🚀 Open Permit Backend running on port ${port}`);
    console.log('   Frontend not available\n');
  });
}

const express = require('express');
const path = require('path');
const fs = require('fs');

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Import Backend Server Logic ───
const backendServer = require('./backend/server');
const backendApp = backendServer.app;

// Mount all backend API routes
app.use('/api', backendApp);

// ─── Serve Next.js Frontend ───
let nextHandler;
let nextApp;

try {
  const next = require('next');
  nextApp = next({
    dev: process.env.NODE_ENV !== 'production',
    dir: path.join(__dirname, 'frontend'),
  });
  
  nextHandler = nextApp.getRequestHandler();
  
  nextApp.prepare().then(() => {
    console.log('✅ Next.js frontend ready');
    
    // Catch-all route for Next.js pages
    app.all('*', (req, res) => {
      return nextHandler(req, res);
    });
    
    // Start server
    app.listen(port, (err) => {
      if (err) throw err;
      console.log(`\n🚀 AFFOG running on port ${port}`);
      console.log(`   Frontend: http://localhost:${port}`);
      console.log(`   Backend API: http://localhost:${port}/api\n`);
    });
  });
} catch (error) {
  console.error('❌ Error loading Next.js:', error.message);
  console.log('Starting backend-only server...');
  
  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`\n🚀 AFFOG Backend running on port ${port}`);
    console.log(`   Frontend not available\n`);
  });
}

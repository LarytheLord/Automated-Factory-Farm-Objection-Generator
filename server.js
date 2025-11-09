const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import backend API routes
const backendRoutes = require('./backend/server');

// Mount backend API routes under /api
app.use('/api', backendRoutes);

// Check if we're in production (have a built frontend)
const frontendBuildPath = path.join(__dirname, 'frontend', 'out');
if (fs.existsSync(frontendBuildPath)) {
  // Production: serve the built frontend
  app.use(express.static(frontendBuildPath));

  // Serve the frontend for all non-API routes (for client-side routing)
  app.get(/^(?!\/api\/).*$/, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Development: redirect API calls to backend, serve from dev server
  console.log('Frontend build not found. For production, run `npm run build` in the frontend directory.');
  console.log('For development, run backend and frontend separately using `npm run dev`');
  
  // Redirect frontend routes to a development server or show an error
  app.get(/^(?!\/api\/).*$/, (req, res) => {
    res.send(`
      <h1>Development Mode</h1>
      <p>Frontend build not found. For development, run the frontend separately:</p>
      <pre>cd frontend && npm run dev</pre>
      <p>For production deployment, build the frontend first:</p>
      <pre>cd frontend && npm run build</pre>
    `);
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Serving from: ${fs.existsSync(frontendBuildPath) ? 'production build' : 'development mode'}`);
});
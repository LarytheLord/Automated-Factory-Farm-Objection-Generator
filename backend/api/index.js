// Vercel Serverless entry point — wraps the Express app as a function.
const { app } = require('../server');

module.exports = app;

// server/server.js
const app = require('./src/app');

// IMPORTANT: Vercel ignores listen()
// We ONLY export the app

module.exports = app;
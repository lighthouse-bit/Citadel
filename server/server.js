// server/server.js
const app = require('./src/app');

// DO NOT use app.listen on Vercel
module.exports = app;
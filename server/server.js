// server/server.js
const app = require('./src/app');
const port = process.env.PORT || 5000; // ✅ Variable is lowercase 'port'

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => { // ✅ Use lowercase 'port' here
    console.log(`✅ Server running on port ${port}`);
  });
}

// ✅ Export for Vercel Serverless
module.exports = app;
// server/server.js
const app = require('./src/app');
const port = process.env.PORT || 5000;

// Only run locally (Vercel handles serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}

// Export for Vercel
module.exports = app;
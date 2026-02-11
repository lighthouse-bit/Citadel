// server/server.js
const app = require('./src/app');
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 API available at http://localhost:${port}/api`);
});
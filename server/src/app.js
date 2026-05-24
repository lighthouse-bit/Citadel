// server/src/app.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
app.use(cors());
app.options('*', cors());

// ─────────────────────────────────────────────
// Body parsing (IMPORTANT ORDER FIX)
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─────────────────────────────────────────────
// Webhook MUST use raw body (Paystack signature)
// ─────────────────────────────────────────────
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Citadel API is running' });
});

// ─────────────────────────────────────────────
// Debug routes (safe for dev, optional for prod)
// ─────────────────────────────────────────────
console.log('__dirname:', __dirname);

try {
  console.log(
    'Routes:',
    fs
      .readdirSync(path.join(__dirname, 'routes'))
      .join(', ')
  );
} catch (err) {
  console.log('Could not read routes folder');
}

// ─────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────
const routes = [
  { path: '/api/artworks', file: './routes/artworkRoutes' },
  { path: '/api/orders', file: './routes/orderRoutes' },
  { path: '/api/commissions', file: './routes/commissionRoutes' },
  { path: '/api/payments', file: './routes/paymentRoutes' },
  { path: '/api/auth', file: './routes/authRoutes' },
  { path: '/api/dashboard', file: './routes/dashboardRoutes' },
  { path: '/api/notifications', file: './routes/notificationRoutes' },
  { path: '/api/contact', file: './routes/contactRoutes' },
];

routes.forEach(({ path: routePath, file }) => {
  try {
    app.use(routePath, require(file));
    console.log(`✅ Loaded: ${file}`);
  } catch (err) {
    console.error(`❌ Failed: ${file}`, err.message);
  }
});

// ─────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─────────────────────────────────────────────
// Error handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
  });
});

module.exports = app;
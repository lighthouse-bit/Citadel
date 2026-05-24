// server/src/app.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();

/**
 * ─────────────────────────────────────────────
 * CORS
 * ─────────────────────────────────────────────
 */
app.use(cors());
app.options('*', cors());

/**
 * ─────────────────────────────────────────────
 * IMPORTANT: webhook raw parser MUST come first
 * ─────────────────────────────────────────────
 */
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

/**
 * ─────────────────────────────────────────────
 * Normal parsers
 * ─────────────────────────────────────────────
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * ─────────────────────────────────────────────
 * Health check
 * ─────────────────────────────────────────────
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Citadel API is running' });
});

/**
 * ─────────────────────────────────────────────
 * ROUTE LOADER (SAFE FOR VERCEL)
 * ─────────────────────────────────────────────
 */
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
    const route = require(file);
    app.use(routePath, route);
    console.log(`✅ Loaded route: ${routePath}`);
  } catch (err) {
    console.error(`❌ Failed loading ${file}:`, err.message);
  }
});

/**
 * ─────────────────────────────────────────────
 * 404 HANDLER (MUST BE LAST)
 * ─────────────────────────────────────────────
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

/**
 * ─────────────────────────────────────────────
 * ERROR HANDLER
 * ─────────────────────────────────────────────
 */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
  });
});

module.exports = app;
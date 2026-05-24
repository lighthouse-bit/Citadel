// server/src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS
app.use(cors());
app.options('*', cors());

// Paystack webhook raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Citadel API is running',
  });
});

// ROUTES
app.use('/api/artworks', require('./routes/artworkRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/commissions', require('./routes/commissionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
  });
});

module.exports = app;
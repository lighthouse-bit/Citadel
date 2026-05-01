// server/src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const artworkRoutes = require('./routes/artworkRoutes');
const orderRoutes = require('./routes/orderRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',           // ✅ Local React dev
    'http://localhost:3000',           // ✅ Local alternative
    process.env.CLIENT_URL,            // ✅ Your Hostinger domain
  ].filter(Boolean),                   // ✅ Remove undefined values
  credentials: true,
}));

// IMPORTANT: Webhook route needs raw body, must be BEFORE json middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Citadel API is running' });
});

// Routes
app.use('/api/artworks', artworkRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong!' });
});

module.exports = app;
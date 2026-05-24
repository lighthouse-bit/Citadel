const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

app.use(cors());
app.options('*', cors());

// Paystack webhook raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Citadel API is running' });
});

// Debug (safe for Vercel)
console.log('__dirname:', __dirname);

const routesDir = path.join(__dirname, 'routes');

if (fs.existsSync(routesDir)) {
  console.log('Routes found:', fs.readdirSync(routesDir).join(', '));
} else {
  console.log('❌ Routes folder not found at:', routesDir);
}

// Routes
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

// safer loading
routes.forEach(({ path: routePath, file }) => {
  try {
    const resolvedPath = path.join(__dirname, file);
    app.use(routePath, require(resolvedPath));
    console.log(`✅ Loaded: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to load ${file}:`, err.message);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!'
  });
});

module.exports = app;
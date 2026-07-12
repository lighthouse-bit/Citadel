// server/src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const analyticsRoutes = require('./routes/analyticsRoutes');
const app = express();
const settingsRoutes = require('./routes/settingsRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const prisma = require('./config/database');
const { securityHeaders } = require('./middleware/security');
const { recordOperationalEvent } = require('./utils/operationalEvents');

// =========================
// CORS CONFIG (FIXED)
// =========================
const allowedOrigins = [
  "https://highmarc.com",
  "https://www.highmarc.com",
  "http://localhost:3000"
];
if(process.env.CLIENT_URL)allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/,''));
if(process.env.CORS_ORIGINS)allowedOrigins.push(...process.env.CORS_ORIGINS.split(',').map(origin=>origin.trim()).filter(Boolean));
app.disable('x-powered-by');
app.use(securityHeaders);

app.use(cors({
  origin: function (origin, callback) {
    // allow tools like Postman / server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // DO NOT throw error (this is what broke your deployment)
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

// =========================
// PAYSTACK WEBHOOK (RAW BODY)
// =========================
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// =========================
// BODY PARSERS
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =========================
// HEALTH ROUTE
// =========================
app.get('/api/health', async (req, res) => {
  const started=Date.now();
  try{await prisma.$queryRaw`SELECT 1`;res.json({status:'ok',database:'connected',latencyMs:Date.now()-started,timestamp:new Date()});}
  catch(error){recordOperationalEvent('DATABASE_HEALTH_FAILURE',error.message);res.status(503).json({status:'unavailable',database:'disconnected',timestamp:new Date()});}
});

// =========================
// ROUTES
// =========================
app.use('/api/artworks', require('./routes/artworkRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/commissions', require('./routes/commissionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/reports', require('./routes/reportingRoutes'));
app.use('/api/operations', require('./routes/operationsRoutes'));


// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// =========================
// ERROR HANDLER
// =========================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  recordOperationalEvent('UNHANDLED_API_ERROR',err.message,{path:req.path,method:req.method,requestId:res.getHeader('X-Request-Id')});

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
  });
});

module.exports = app;

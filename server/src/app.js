// server/src/app.js
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.options('*', cors());
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Citadel API is running' });
});

// ✅ Load each route with error catching
const routes = [
  { path: '/api/artworks',      file: './routes/artworkRoutes'      },
  { path: '/api/orders',        file: './routes/orderRoutes'        },
  { path: '/api/commissions',   file: './routes/commissionRoutes'   },
  { path: '/api/payments',      file: './routes/paymentRoutes'      },
  { path: '/api/auth',          file: './routes/authRoutes'         },
  { path: '/api/dashboard',     file: './routes/dashboardRoutes'    },
  { path: '/api/notifications', file: './routes/notificationRoutes' },
  { path: '/api/contact',       file: './routes/contactRoutes'      },
];

routes.forEach(({ path, file }) => {
  try {
    app.use(path, require(file));
    console.log(`✅ Loaded: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to load ${file}: ${err.message}`);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!'
  });
});

module.exports = app;
/**
 * index.js
 * EasyDrive Express application — entry point.
 *
 * Responsibilities:
 *  - Load environment variables from .env
 *  - Configure Express with security and logging middleware
 *  - Mount API routes
 *  - Connect to MongoDB
 *  - Start the HTTP server
 *
 * Frontend isolation: This file does NOT serve client/ files.
 * The existing client-server.js (root level) handles that separately.
 */

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const { connect }           = require('./config/db');
const authRoutes            = require('./routes/auth');
const carRoutes             = require('./routes/cars');
const bookingRoutes         = require('./routes/bookings');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// CLIENT_ORIGINS is a comma-separated list of allowed origins.
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server).
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// ── HTTP request logging (Morgan) ─────────────────────────────────────────────
// Use 'dev' format in development, 'combined' in production.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── JSON body parser ──────────────────────────────────────────────────────────
app.use(express.json());

// ── Rate limiter for /api/auth only (spec: 10 req / 15 min per IP) ───────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window per IP
  standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

// ── Health check (no auth, no rate limit) ────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRateLimiter, authRoutes);
app.use('/api/cars',     carRoutes);
app.use('/api/bookings', bookingRoutes);

// ── 404 & global error handlers (must be last) ───────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
async function start() {
  try {
    await connect();
    app.listen(PORT, () => {
      console.log(`[SERVER] EasyDrive API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err.message);
    process.exit(1);
  }
}

// Export app for testing (tests import the app without calling start()).
module.exports = app;

// Only call start() when this file is run directly, not when required by tests.
if (require.main === module) {
  start();
}

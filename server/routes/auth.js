/**
 * routes/auth.js
 * Authentication endpoints:
 *   POST /api/auth/register  — Create a new account
 *   POST /api/auth/login     — Authenticate and receive a JWT
 *   GET  /api/auth/me        — Return the authenticated user's profile
 *
 * Rate limiting (10 req / 15 min per IP) is applied to all /api/auth routes
 * in index.js before this router is mounted.
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { requireAuth }   = require('../middleware/auth');
const { validateBody }  = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/schemas');

const router = express.Router();

// ── Helper: sign a 7-day JWT ──────────────────────────────────────────────────
/**
 * @param {object} user  - Mongoose User document (passwordHash excluded)
 * @returns {string}     - Signed JWT string
 */
function signToken(user) {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check for existing account before hashing to give a clear error message.
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email address already exists.',
      });
    }

    // Hash the password — 12 salt rounds per the spec.
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toJSON(), // passwordHash stripped by toJSON transform
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select passwordHash — it has select:false on the schema.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      // Use a generic message to avoid user enumeration.
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toJSON(), // passwordHash stripped by toJSON transform
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // req.user._id comes from the JWT payload set in signToken above.
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: user.toJSON() },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

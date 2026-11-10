/**
 * middleware/auth.js
 * requireAuth — JWT verification middleware.
 *
 * Attaches the decoded user payload to req.user so downstream route
 * handlers can access the authenticated user's _id and email without
 * hitting the database on every request.
 *
 * Returns 401 if:
 *  - The Authorization header is missing or malformed.
 *  - The token is expired, tampered-with, or invalid.
 */

'use strict';

const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies the Bearer JWT in the Authorization header.
 * On success, attaches decoded payload to req.user and calls next().
 * On failure, sends a 401 JSON response immediately.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Header must be "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded payload so route handlers can use req.user._id etc.
    req.user = decoded;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token.';

    return res.status(401).json({ success: false, message });
  }
}

module.exports = { requireAuth };

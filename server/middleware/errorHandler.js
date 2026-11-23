/**
 * middleware/errorHandler.js
 * Global error handling middleware.
 *
 * notFoundHandler  — catches any request that didn't match a route (404).
 * globalErrorHandler — catches errors passed via next(err) (500 or specific code).
 *
 * Both follow the consistent response shape:
 *   { success: false, message: "..." }
 *
 * Privacy rule: stack traces and raw error internals are NEVER sent to clients.
 * Unexpected errors (500) return a generic message; err.message is only sent
 * for operational errors that have an explicit statusCode set.
 */

'use strict';

/**
 * 404 handler — must be registered AFTER all valid routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — must be registered LAST with 4 parameters
 * so Express recognises it as an error-handling middleware.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  // required even if unused
 */
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  // Always log the real message server-side for debugging.
  // Never log req.body — it may contain Aadhaar, DL, passwords.
  console.error('[ERROR]', err.message);

  // Handle Mongoose validation errors (e.g. missing required fields).
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Database validation failed.',
      errors,
    });
  }

  // Handle Mongoose duplicate key errors (unique constraint violations).
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
    });
  }

  // Handle invalid Mongoose ObjectId (CastError).
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource identifier format.',
    });
  }

  // Operational errors (created with an explicit statusCode < 500) may expose
  // their message; unexpected server errors must not leak internals.
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = statusCode < 500 && Boolean(err.statusCode || err.status);
  res.status(statusCode).json({
    success: false,
    message: isOperational
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = { notFoundHandler, globalErrorHandler };

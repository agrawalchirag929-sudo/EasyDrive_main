/**
 * middleware/errorHandler.js
 * Global error handling middleware.
 *
 * notFoundHandler  — catches any request that didn't match a route (404).
 * globalErrorHandler — catches errors passed via next(err) (500 or specific code).
 *
 * Both follow the consistent response shape:
 *   { success: false, message: "..." }
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
  // Log internally for debugging — never expose raw error internals to clients.
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

  // Fallback: 500 Internal Server Error.
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = { notFoundHandler, globalErrorHandler };

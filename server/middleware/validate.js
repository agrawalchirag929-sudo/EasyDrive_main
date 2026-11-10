/**
 * middleware/validate.js
 * Zod request-validation wrappers.
 *
 * validateBody(schema) — validates req.body against a Zod schema.
 * validateQuery(schema) — validates req.query against a Zod schema.
 *
 * On failure, responds 422 with a structured errors array so the client
 * can display field-level messages.
 */

'use strict';

const { ZodError } = require('zod');

/**
 * Formats a ZodError into a flat array of { field, message } objects.
 * @param {ZodError} error
 * @returns {{ field: string, message: string }[]}
 */
function formatZodErrors(error) {
  return error.errors.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

/**
 * Returns an Express middleware that validates req.body against the
 * provided Zod schema. Calls next() on success, or responds 422 on failure.
 * @param {import('zod').ZodTypeAny} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed. Please check the submitted data.',
        errors: formatZodErrors(result.error),
      });
    }
    // Replace req.body with the parsed (coerced + stripped) value.
    req.body = result.data;
    next();
  };
}

/**
 * Returns an Express middleware that validates req.query against the
 * provided Zod schema. Calls next() on success, or responds 422 on failure.
 * @param {import('zod').ZodTypeAny} schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid query parameters.',
        errors: formatZodErrors(result.error),
      });
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validateBody, validateQuery };

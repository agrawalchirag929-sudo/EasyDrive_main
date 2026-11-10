/**
 * utils/schemas.js
 * Centralised Zod validation schemas for all routes.
 *
 * Keeping schemas in one file makes them easy to audit and reuse
 * in both route middleware and the test suite.
 */

'use strict';

const { z } = require('zod');
const { isValidCity, isValidHub, VALID_CITIES } = require('../config/hubs');

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Accepts only { name, email, password }.
 * Phone is NOT accepted at registration (profile update in a later phase).
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must not exceed 80 characters.'),

  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.'),

  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must not exceed 128 characters.'),
});

/**
 * POST /api/auth/login
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.'),

  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

// ── Cars ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/cars — query string filters.
 *
 * Accepts both the canonical spec names AND their common aliases so both
 * the existing frontend and future clients work without breaking changes:
 *   city     | (primary)   — filter by city name
 *   type     | category    — filter by vehicle category
 *   search   | q           — keyword search
 *   sortBy   | sort        — sort order
 *
 * Unknown keys are stripped (`.strip()`).
 */
const carsQuerySchema = z.object({
  // Primary + alias: city (no alias needed — only one form used)
  city: z.string().trim().optional(),

  // Primary: type  |  alias: category
  type:     z.string().trim().optional(),
  category: z.string().trim().optional(),

  // Primary: search  |  alias: q
  search: z.string().trim().optional(),
  q:      z.string().trim().optional(),

  // Primary: sortBy  |  alias: sort
  sortBy: z
    .enum(['featured', 'price-asc', 'price-desc', 'rating', 'price_asc', 'price_desc'])
    .optional(),
  sort: z
    .enum(['featured', 'price-asc', 'price-desc', 'rating', 'price_asc', 'price_desc'])
    .optional(),
}).strip();

// ── Bookings ──────────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 *
 * Validation rules (in order):
 *  1. carSlug          — non-empty string
 *  2. pickupCity       — must be one of the 8 known cities
 *  3. pickupLocation   — must be a valid hub for pickupCity
 *  4. startDate        — valid ISO date; not in the past (Asia/Kolkata)
 *  5. endDate          — valid ISO date; ≥ 1 day after startDate; ≤ 30 days after startDate
 *  6. aadhaar          — exactly 12 digits; first digit 2–9 (valid Indian Aadhaar range)
 *                        NEVER stored — controller extracts only aadhaar.slice(-4)
 *  7. dl               — 4–20 alphanumeric characters (Indian DL format)
 *                        NEVER stored — controller extracts only dl.slice(-4)
 */
const createBookingSchema = z
  .object({
    carSlug: z
      .string({ required_error: 'Car slug is required.' })
      .trim()
      .min(1, 'Car slug must not be empty.'),

    pickupCity: z
      .string({ required_error: 'Pickup city is required.' })
      .trim()
      .refine(isValidCity, {
        message: `pickupCity must be one of: ${VALID_CITIES.join(', ')}.`,
      }),

    pickupLocation: z
      .string({ required_error: 'Pickup location is required.' })
      .trim()
      .min(1, 'Pickup location must not be empty.'),

    startDate: z
      .string({ required_error: 'Start date is required.' })
      .refine((v) => !isNaN(Date.parse(v)), { message: 'startDate must be a valid ISO date string.' }),

    endDate: z
      .string({ required_error: 'End date is required.' })
      .refine((v) => !isNaN(Date.parse(v)), { message: 'endDate must be a valid ISO date string.' }),

    // Full 12-digit Aadhaar — validated here, last 4 extracted by controller.
    // First digit must be 2–9 (Indian Aadhaar specification).
    aadhaar: z
      .string({ required_error: 'Aadhaar number is required.' })
      .regex(/^[2-9]\d{11}$/, 'Aadhaar must be exactly 12 digits with first digit 2–9.'),

    // Alphanumeric Indian driving licence — normalised to uppercase by controller.
    dl: z
      .string({ required_error: 'Driving licence number is required.' })
      .regex(/^[A-Za-z0-9]{4,20}$/, 'Driving licence must be 4–20 alphanumeric characters.'),
  })
  // Cross-field validations run after all individual fields pass.
  .superRefine((data, ctx) => {
    // ── Hub validation ────────────────────────────────────────────────────────
    // Only run hub check if city is valid (city validation already flagged it otherwise).
    if (isValidCity(data.pickupCity) && !isValidHub(data.pickupCity, data.pickupLocation)) {
      const { hubsForCity } = require('../config/hubs');
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pickupLocation'],
        message: `pickupLocation must be one of: ${hubsForCity(data.pickupCity).join(', ')}.`,
      });
    }

    // ── Date: startDate must not be in the past (Asia/Kolkata) ──────────────
    // "Today" in IST = the current calendar date in Asia/Kolkata timezone.
    const todayIST = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    );
    const start = new Date(data.startDate);
    if (start < todayIST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'startDate must not be in the past.',
      });
    }

    // ── Date: endDate must be at least 1 day after startDate ─────────────────
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'endDate must be at least 1 day after startDate.',
      });
      return; // Skip max-day check if end ≤ start
    }

    // ── Date: rental must not exceed 30 days ─────────────────────────────────
    const durationMs = end - start;
    const MAX_DAYS = 30;
    if (durationMs > MAX_DAYS * 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: `Rental duration must not exceed ${MAX_DAYS} days.`,
      });
    }
  });

module.exports = {
  registerSchema,
  loginSchema,
  carsQuerySchema,
  createBookingSchema,
};

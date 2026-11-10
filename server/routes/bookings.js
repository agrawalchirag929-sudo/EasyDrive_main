/**
 * routes/bookings.js
 * Reservation endpoints (all protected — requireAuth applied to every route):
 *   POST /api/bookings            — Create a reservation
 *   GET  /api/bookings/mine       — Authenticated user's bookings (newest first)
 *   GET  /api/bookings/:reference — Single booking by reference (ownership enforced)
 *
 * Non-Negotiable Rules implemented here:
 *  1. Aadhaar Privacy: full 12-digit number validated but NEVER stored, logged,
 *     or returned. Only aadhaar.slice(-4) is persisted as aadhaarLast4.
 *  2. DL Privacy: Only dl.slice(-4).toUpperCase() is persisted as dlLast4.
 *  3. Authoritative Pricing: durationDays, subtotal, taxAmount, totalCost
 *     calculated server-side. All amounts are whole rupees.
 *  4. Overlap Prevention: Rejects with 409 + code CAR_NOT_AVAILABLE if the car
 *     is already booked for an overlapping window.
 *  5. City Availability: car must have pickupCity in Car.cities[].
 *  6. Hub Validation: pickupLocation must be in config/hubs for pickupCity.
 *     (Hub and city validation is in schemas.js; car-city check is done here.)
 */

'use strict';

const express  = require('express');
const Car      = require('../models/Car');
const Booking  = require('../models/Booking');
const { requireAuth }         = require('../middleware/auth');
const { validateBody }        = require('../middleware/validate');
const { createBookingSchema } = require('../utils/schemas');
const { generateBookingRef }  = require('../utils/bookingRef');
const { calculatePrice }      = require('../utils/priceCalculator');

const router = express.Router();

// All booking routes require authentication.
router.use(requireAuth);

// ── POST /api/bookings ────────────────────────────────────────────────────────
router.post('/', validateBody(createBookingSchema), async (req, res, next) => {
  try {
    const {
      carSlug,
      pickupCity,
      pickupLocation,
      startDate: startDateStr,
      endDate: endDateStr,
      aadhaar, // Full 12-digit value — only last 4 will be stored.
      dl,       // Full DL value — only last 4 characters will be stored.
    } = req.body;

    // ── 1. Validate the car exists ────────────────────────────────────────────
    const car = await Car.findOne({ slug: carSlug });
    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car found with slug "${carSlug}".`,
      });
    }

    // ── 2. Car must be active (isAvailable) ───────────────────────────────────
    if (!car.isAvailable) {
      return res.status(422).json({
        success: false,
        code: 'CAR_NOT_AVAILABLE',
        message: `"${car.brand} ${car.name}" is currently not available for booking.`,
      });
    }

    // ── 3. Car must be available in the requested city ────────────────────────
    // Car.cities[] is set by the seed and contains the 8 metro city names.
    if (!car.cities.includes(pickupCity)) {
      return res.status(422).json({
        success: false,
        code: 'CAR_NOT_AVAILABLE',
        message: `"${car.brand} ${car.name}" is not available in ${pickupCity}. Available cities: ${car.cities.join(', ')}.`,
      });
    }

    const startDate = new Date(startDateStr);
    const endDate   = new Date(endDateStr);

    // ── 4. Overlap check ──────────────────────────────────────────────────────
    // Rejects if an existing 'confirmed' booking for the same car overlaps:
    //   existingStart < requestedEnd  &&  existingEnd > requestedStart
    const overlap = await Booking.findOne({
      carSlug,
      status: 'confirmed',
      startDate: { $lt: endDate },
      endDate:   { $gt: startDate },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        code: 'CAR_NOT_AVAILABLE',
        message: `This car is already booked from ${overlap.startDate.toISOString().slice(0, 10)} to ${overlap.endDate.toISOString().slice(0, 10)}. Please choose different dates.`,
      });
    }

    // ── 5. Server-side pricing (whole rupees) ─────────────────────────────────
    const { durationDays, subtotal, taxAmount, totalCost } = calculatePrice(
      startDate,
      endDate,
      car.pricePerDay
    );

    // ── 6. Privacy masking ────────────────────────────────────────────────────
    // Extract ONLY the last digits/chars. The full numbers are used nowhere
    // else in this scope and are never logged, echoed, or persisted.
    const aadhaarLast4 = aadhaar.slice(-4);
    const dlLast4      = dl.slice(-4).toUpperCase();

    // ── 7. Generate unique booking reference ──────────────────────────────────
    const bookingReference = await generateBookingRef();

    // ── 8. Persist the booking ────────────────────────────────────────────────
    const booking = await Booking.create({
      bookingReference,
      userId:    req.user._id,
      userEmail: req.user.email,
      carSlug,
      carName:   `${car.brand} ${car.name}`,
      pickupCity,
      pickupLocation,
      startDate,
      endDate,
      durationDays,
      pricePerDay: car.pricePerDay,
      subtotal,
      taxAmount,
      totalCost,
      aadhaarLast4,
      dlLast4,
      status: 'confirmed',
      paymentStatus: 'pending',
    });

    return res.status(201).json({
      success: true,
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/mine ────────────────────────────────────────────────────
// IMPORTANT: this route must be defined BEFORE /:reference so Express matches
// the literal "mine" before treating it as a reference parameter.
router.get('/mine', async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      success: true,
      data: { count: bookings.length, bookings },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/:reference ──────────────────────────────────────────────
router.get('/:reference', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      bookingReference: req.params.reference.toUpperCase(),
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking found with reference "${req.params.reference}".`,
      });
    }

    // Ownership check — prevent one user from viewing another user's booking.
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this booking.',
      });
    }

    return res.status(200).json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

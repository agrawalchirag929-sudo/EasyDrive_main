/**
 * models/Booking.js
 * Mongoose schema for rental reservations.
 *
 * Privacy rules enforced by the booking controller (NOT stored here):
 *  - Full 12-digit Aadhaar number is NEVER stored, logged, or returned.
 *    Only aadhaarLast4 (the last 4 digits) is persisted.
 *  - Full DL number is NEVER stored. Only dlLast4 (last 4 characters)
 *    is persisted.
 *
 * Pricing rule:
 *  - durationDays, subtotal, taxAmount, and totalCost are always calculated
 *    server-side from the car's pricePerDay. Client-supplied amounts are ignored.
 *  - All monetary amounts are stored as whole rupees (Math.round to 0 dp).
 */

'use strict';

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // Unique human-readable reference, e.g. "ED-2610-A3F7".
    // Format: ED-YYMM-XXXX  (YY = 2-digit year, MM = 2-digit month, XXXX = 4 hex chars)
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Owning user
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },

    // Vehicle snapshot (stored so the booking record stays correct even
    // if the car document is later updated).
    carSlug:  { type: String, required: true, trim: true },
    carName:  { type: String, required: true, trim: true },

    pickupCity:     { type: String, required: true, trim: true },
    pickupLocation: { type: String, required: true, trim: true },

    // Dates stored as Date objects for reliable range comparisons.
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    // Server-computed pricing fields (all whole rupees — no decimals)
    durationDays: { type: Number, required: true, min: 1 },
    pricePerDay:  { type: Number, required: true, min: 0 },
    subtotal:     { type: Number, required: true, min: 0 },   // durationDays × pricePerDay
    taxAmount:    { type: Number, required: true, min: 0 },   // subtotal × TAX_RATE, rounded
    totalCost:    { type: Number, required: true, min: 0 },   // subtotal + taxAmount

    // Privacy-safe identity fields — only last digits/characters stored.
    aadhaarLast4: {
      type: String,
      required: true,
      match: [/^\d{4}$/, 'aadhaarLast4 must be exactly 4 digits.'],
    },
    dlLast4: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 4,
    },

    // Booking lifecycle status.
    // Cancellation endpoint is postponed to Phase 4; only 'confirmed' is
    // created by POST /api/bookings.
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },

    // Payment lifecycle. 'pending' until Razorpay is integrated in Phase 6.
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index to speed up overlap detection query.
bookingSchema.index({ carSlug: 1, status: 1, startDate: 1, endDate: 1 });
// Index for GET /api/bookings/mine (user's bookings sorted newest first).
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);

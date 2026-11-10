/**
 * models/Car.js
 * Mongoose schema for the vehicle fleet.
 *
 * Cars are seeded from client/assets/cars.json.
 * The `slug` field maps to the `id` property in cars.json and is the
 * canonical identifier used in all URL paths (/api/cars/:slug).
 */

'use strict';

const mongoose = require('mongoose');

const carSchema = new mongoose.Schema(
  {
    // Unique human-readable slug (e.g. "maruti-swift") — used as the URL key.
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    brand: { type: String, required: true, trim: true },
    name:  { type: String, required: true, trim: true },

    type: {
      type: String,
      required: true,
      enum: ['Hatchback', 'Sedan', 'SUV', 'MPV', 'EV', 'Luxury'],
    },

    fuel: {
      type: String,
      required: true,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    },

    transmission: {
      type: String,
      required: true,
      enum: ['Manual', 'Automatic'],
    },

    seats:       { type: Number, required: true, min: 2, max: 9 },
    pricePerDay: { type: Number, required: true, min: 0 },
    kmPerDay:    { type: Number, required: true, default: 250 },
    extraKmRate: { type: Number, required: true, min: 0 },
    mileage:     { type: String, trim: true },
    rating:      { type: Number, min: 0, max: 5, default: 0 },
    features:    [{ type: String, trim: true }],
    badge:       { type: String, trim: true },
    credit:      { type: String, trim: true },
    image:       { type: String, trim: true },

    // Array of city names where this car is available.
    cities: {
      type: [String],
      required: true,
    },

    // Default pickup hub categories shared by all cities.
    pickupLocations: {
      type: [String],
      required: true,
    },

    securityDeposit: { type: Number, required: true, min: 0 },
    isFeatured:      { type: Boolean, default: false },
    isAvailable:     { type: Boolean, default: true },
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

// Index to speed up city + type filtering used in GET /api/cars.
carSchema.index({ cities: 1, type: 1 });

module.exports = mongoose.model('Car', carSchema);

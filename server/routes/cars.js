/**
 * routes/cars.js
 * Fleet endpoints:
 *   GET /api/cars                    — Query all cars (city, type/category, search/q, sortBy/sort)
 *   GET /api/cars/:slug              — Single car by slug
 *   GET /api/cars/:slug/booked-dates — Active confirmed booking date ranges
 *
 * All endpoints are public (no auth required).
 *
 * Query parameter aliases (both names accepted):
 *   type     | category  — vehicle category filter
 *   search   | q         — keyword search
 *   sortBy   | sort      — sort order  (featured | price-asc | price_asc | price-desc | price_desc | rating)
 */

'use strict';

const express  = require('express');
const Car      = require('../models/Car');
const Booking  = require('../models/Booking');
const { validateQuery } = require('../middleware/validate');
const { carsQuerySchema } = require('../utils/schemas');

const router = express.Router();

// ── GET /api/cars ─────────────────────────────────────────────────────────────
router.get('/', validateQuery(carsQuerySchema), async (req, res, next) => {
  try {
    // Resolve aliases: prefer the primary name, fall back to alias.
    const city   = req.query.city;
    const type   = req.query.type   || req.query.category;
    const search = req.query.search || req.query.q;
    // Normalise sort value: treat price_asc → price-asc, price_desc → price-desc
    const rawSort = req.query.sortBy || req.query.sort || 'featured';
    const sortBy  = rawSort.replace('_', '-');

    // Build the Mongoose filter object dynamically.
    const filter = { isAvailable: true };

    if (city && city.toLowerCase() !== 'all') {
      // cities is an array field; this matches any car that includes the city.
      filter.cities = city;
    }

    if (type && type.toLowerCase() !== 'all') {
      // Exact match (case-sensitive enum).
      filter.type = type;
    }

    if (search) {
      // Case-insensitive keyword search across brand, name, and type.
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ brand: regex }, { name: regex }, { type: regex }];
    }

    // Translate sortBy values to Mongoose sort objects.
    const sortMap = {
      'featured':   { isFeatured: -1, rating: -1 },
      'price-asc':  { pricePerDay: 1 },
      'price-desc': { pricePerDay: -1 },
      'rating':     { rating: -1 },
    };
    const sort = sortMap[sortBy] || sortMap['featured'];

    const cars = await Car.find(filter).sort(sort);

    return res.status(200).json({
      success: true,
      data: { count: cars.length, cars },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cars/:slug ───────────────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const car = await Car.findOne({ slug: req.params.slug });
    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car found with slug "${req.params.slug}".`,
      });
    }

    return res.status(200).json({ success: true, data: { car } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cars/:slug/booked-dates ─────────────────────────────────────────
// Returns active confirmed booking date ranges so the client's date-picker
// can block out unavailable windows.
router.get('/:slug/booked-dates', async (req, res, next) => {
  try {
    // Verify the car exists before querying bookings.
    const car = await Car.findOne({ slug: req.params.slug });
    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car found with slug "${req.params.slug}".`,
      });
    }

    // Only return future or ongoing bookings with status 'confirmed'.
    const now = new Date();
    const bookings = await Booking.find(
      {
        carSlug: req.params.slug,
        status: 'confirmed',
        endDate: { $gt: now }, // Exclude completed (past) bookings
      },
      // Project only the date fields to minimise response size.
      { startDate: 1, endDate: 1, _id: 0 }
    );

    const bookedDates = bookings.map((b) => ({
      startDate: b.startDate,
      endDate:   b.endDate,
    }));

    return res.status(200).json({
      success: true,
      data: { slug: req.params.slug, bookedDates },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

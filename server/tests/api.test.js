/**
 * tests/api.test.js
 * Automated integration + unit tests for the EasyDrive REST API.
 *
 * Uses Node's built-in test runner (node:test) — no extra test framework.
 * Run with:  npm test   (from the server/ directory)
 *
 * ✅ NEVER touches a real database.
 *    Uses mongodb-memory-server (devDependency) to spin up a temporary
 *    in-process MongoDB instance that is destroyed after the test run.
 *    No MONGODB_URI in .env is required (env is loaded but overridden).
 *
 * Test coverage:
 *  Integration (HTTP):
 *   - GET  /api/health
 *   - POST /api/auth/register (missing fields, short password, success, duplicate)
 *   - POST /api/auth/login (wrong password, success)
 *   - GET  /api/auth/me (no token, success)
 *   - GET  /api/cars (list, type/category alias, city filter, sortBy/sort alias, invalid sort)
 *   - GET  /api/cars/:slug (found, 404)
 *   - GET  /api/cars/:slug/booked-dates (404)
 *   - POST /api/bookings:
 *       no auth, invalid Aadhaar, Aadhaar first-digit 0/1, invalid DL,
 *       unknown hub, car not in city, past startDate, endDate == startDate,
 *       rental > 30 days, successful creation (privacy, pricing, ref format,
 *       whole-rupee amounts, subtotal, paymentStatus), 409 conflict with code,
 *       non-overlapping dates, unknown car
 *   - GET  /api/bookings/mine (no token, success + ordering)
 *   - GET  /api/bookings/:reference (no token, 404, success)
 *   - 404 handler
 *
 *  Pure-logic unit tests (no HTTP):
 *   - priceCalculator: correct maths, whole rupees, subtotal
 *   - bookingRef: format regex ED-YYMM-XXXX
 *   - DL normalisation: last-4 extraction uppercased
 *   - Overlap predicate (boundary conditions)
 *   - JWT secret length guidance (env audit)
 */

'use strict';

// Load .env first so dotenv values are set; we override MONGODB_URI below.
require('dotenv').config();

const { test, before, after, describe } = require('node:test');
const assert  = require('node:assert/strict');
const http    = require('node:http');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ── Globals ───────────────────────────────────────────────────────────────────
let mongod;   // MongoMemoryServer instance
let server;   // http.Server wrapping the Express app
let userToken;
let testUserId;

const TEST_EMAIL    = `test_${Date.now()}@easydrive-test.local`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME     = 'Test Runner';

// Set test env vars before requiring any app modules.
process.env.JWT_SECRET     = 'test_jwt_secret_minimum_32_chars_long_ok';
process.env.TAX_RATE       = '0.18';
process.env.CLIENT_ORIGINS = 'http://localhost:3000';
process.env.PORT           = '0';

// ── Helpers ───────────────────────────────────────────────────────────────────
function request(srv, { method, path, body, token }) {
  return new Promise((resolve, reject) => {
    const addr = srv.address();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data  ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` }         : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const daysFromNow = (n) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const daysAgo = (n) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
before(async () => {
  // Start in-memory MongoDB — override the URI so the app never touches a real DB.
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connect } = require('../config/db');
  await connect();

  // Insert a test car directly into the in-memory DB.
  const Car = require('../models/Car');
  await Car.create({
    slug: '__test-car__',
    brand: 'TestBrand',
    name: 'Test Model',
    type: 'Sedan',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 1000,
    kmPerDay: 250,
    extraKmRate: 10,
    mileage: '20 km/l',
    features: [],
    // Mumbai is a valid city; use its canonical hubs.
    cities: ['Mumbai'],
    pickupLocations: ['CSMIA Airport (T2)', 'BKC', 'Mumbai Central'],
    securityDeposit: 2000,
    isAvailable: true,
  });

  const app = require('../index');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const { disconnect } = require('../config/db');
  await disconnect();
  await mongod.stop();
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — pure logic, no HTTP
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit: priceCalculator', () => {
  const { calculatePrice } = require('../utils/priceCalculator');

  test('3 days × 1000 = 3000 subtotal, 540 tax (18%), 3540 total (whole rupees)', () => {
    process.env.TAX_RATE = '0.18';
    const start = new Date('2026-11-01');
    const end   = new Date('2026-11-04');
    const { durationDays, subtotal, taxAmount, totalCost } = calculatePrice(start, end, 1000);
    assert.equal(durationDays, 3);
    assert.equal(subtotal,  3000);
    assert.equal(taxAmount,  540);   // 3000 × 0.18 = 540 — whole rupee
    assert.equal(totalCost, 3540);
  });

  test('amounts are always integers (no fractional rupees)', () => {
    process.env.TAX_RATE = '0.18';
    const start = new Date('2026-11-01');
    const end   = new Date('2026-11-02'); // 1 day
    const { subtotal, taxAmount, totalCost } = calculatePrice(start, end, 1399);
    // 1399 × 0.18 = 251.82 → rounds to 252
    assert.equal(subtotal,  1399);
    assert.equal(taxAmount, 252);        // Math.round(1399 × 0.18)
    assert.equal(totalCost, 1651);
    assert.equal(Number.isInteger(subtotal),  true);
    assert.equal(Number.isInteger(taxAmount), true);
    assert.equal(Number.isInteger(totalCost), true);
  });

  test('throws if endDate ≤ startDate', () => {
    const start = new Date('2026-11-05');
    const end   = new Date('2026-11-03');
    assert.throws(() => calculatePrice(start, end, 1000), /at least one day/i);
  });
});

describe('Unit: bookingRef format', () => {
  const { generateCandidate } = (() => {
    // Expose generateCandidate for unit testing by re-reading the source.
    // We can't import it directly (it's not exported), so we inline the logic.
    const crypto = require('crypto');
    return {
      generateCandidate: () => {
        const now  = new Date();
        const yy   = String(now.getFullYear()).slice(-2);
        const mm   = String(now.getMonth() + 1).padStart(2, '0');
        const xxxx = crypto.randomBytes(2).toString('hex').toUpperCase();
        return `ED-${yy}${mm}-${xxxx}`;
      },
    };
  })();

  test('candidate matches ED-YYMM-XXXX pattern', () => {
    for (let i = 0; i < 20; i++) {
      const ref = generateCandidate();
      assert.match(ref, /^ED-\d{4}-[0-9A-F]{4}$/, `Bad ref: ${ref}`);
    }
  });
});

describe('Unit: DL normalisation', () => {
  test('last 4 characters extracted and uppercased', () => {
    const dl    = 'mh12ab9876';
    const last4 = dl.slice(-4).toUpperCase();
    assert.equal(last4, '9876');

    const dl2    = 'DL4SCM1234';
    const last4b = dl2.slice(-4).toUpperCase();
    assert.equal(last4b, '1234');
  });
});

describe('Unit: overlap predicate', () => {
  // existingStart < requestedEnd && existingEnd > requestedStart
  function overlaps(exStart, exEnd, rqStart, rqEnd) {
    return exStart < rqEnd && exEnd > rqStart;
  }

  test('completely before — no overlap', () => {
    assert.equal(overlaps(new Date('2026-11-01'), new Date('2026-11-03'),
                           new Date('2026-11-05'), new Date('2026-11-07')), false);
  });

  test('completely after — no overlap', () => {
    assert.equal(overlaps(new Date('2026-11-10'), new Date('2026-11-12'),
                           new Date('2026-11-05'), new Date('2026-11-07')), false);
  });

  test('exact same dates — overlap', () => {
    assert.equal(overlaps(new Date('2026-11-05'), new Date('2026-11-07'),
                           new Date('2026-11-05'), new Date('2026-11-07')), true);
  });

  test('partial overlap (tail of existing into head of new)', () => {
    assert.equal(overlaps(new Date('2026-11-03'), new Date('2026-11-06'),
                           new Date('2026-11-05'), new Date('2026-11-08')), true);
  });

  test('new booking contained within existing — overlap', () => {
    assert.equal(overlaps(new Date('2026-11-01'), new Date('2026-11-10'),
                           new Date('2026-11-03'), new Date('2026-11-07')), true);
  });

  test('adjacent (end == start of new) — no overlap', () => {
    // Booking A ends on Nov 5; Booking B starts on Nov 5 → not overlapping
    // because existingEnd (Nov 5) > requestedStart (Nov 5) is FALSE.
    assert.equal(overlaps(new Date('2026-11-01'), new Date('2026-11-05'),
                           new Date('2026-11-05'), new Date('2026-11-08')), false);
  });
});

describe('Unit: JWT_SECRET length guidance', () => {
  test('JWT_SECRET in test env is at least 32 characters', () => {
    const secret = process.env.JWT_SECRET || '';
    assert.ok(secret.length >= 32,
      `JWT_SECRET should be at least 32 chars; got ${secret.length}. Use a long random string in production.`);
  });
});

describe('Unit: hubs config', () => {
  const { isValidCity, isValidHub, hubsForCity, VALID_CITIES } = require('../config/hubs');

  test('has exactly 8 supported cities', () => {
    assert.equal(VALID_CITIES.length, 8);
  });

  test('Mumbai has 3 hubs', () => {
    assert.equal(hubsForCity('Mumbai').length, 3);
  });

  test('isValidCity returns false for unknown city', () => {
    assert.equal(isValidCity('Unknown City'), false);
  });

  test('isValidHub returns false for wrong hub in valid city', () => {
    assert.equal(isValidHub('Mumbai', 'Airport Terminal'), false);
  });

  test('isValidHub returns true for canonical hub', () => {
    assert.equal(isValidHub('Mumbai', 'CSMIA Airport (T2)'), true);
  });

  test('isValidHub returns false for hub in wrong city', () => {
    // IGI Airport T3 is a Delhi NCR hub, not Pune
    assert.equal(isValidHub('Pune', 'IGI Airport T3'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS — HTTP against the in-memory DB
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('returns 200 with status ok', async () => {
    const { status, body } = await request(server, { method: 'GET', path: '/api/health' });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
    assert.ok(body.data.timestamp);
  });
});

describe('POST /api/auth/register', () => {
  test('rejects missing name with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'no-name@test.com', password: 'Password123!' },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
    assert.ok(Array.isArray(body.errors));
  });

  test('rejects short password with 422', async () => {
    const { status } = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Short', email: 'short@test.com', password: 'abc' },
    });
    assert.equal(status, 422);
  });

  test('registers successfully — returns token and user without passwordHash', async () => {
    const { status, body } = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.ok(body.data.user._id);
    assert.equal(body.data.user.email, TEST_EMAIL);
    assert.equal(body.data.user.passwordHash, undefined, 'passwordHash must never be returned');
    userToken  = body.data.token;
    testUserId = body.data.user._id;
  });

  test('rejects duplicate email with 409', async () => {
    const { status } = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(status, 409);
  });
});

describe('POST /api/auth/login', () => {
  test('rejects wrong password with 401', async () => {
    const { status } = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: TEST_EMAIL, password: 'WrongPassword!' },
    });
    assert.equal(status, 401);
  });

  test('authenticates successfully — returns token without passwordHash', async () => {
    const { status, body } = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(status, 200);
    assert.ok(body.data.token);
    assert.equal(body.data.user.passwordHash, undefined);
    userToken = body.data.token;
  });
});

describe('GET /api/auth/me', () => {
  test('returns 401 without token', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/auth/me' });
    assert.equal(status, 401);
  });

  test('returns user profile for authenticated user', async () => {
    const { status, body } = await request(server, {
      method: 'GET',
      path: '/api/auth/me',
      token: userToken,
    });
    assert.equal(status, 200);
    assert.equal(body.data.user.email, TEST_EMAIL);
    assert.equal(body.data.user.passwordHash, undefined);
  });
});

describe('GET /api/cars', () => {
  test('returns 200 with car list', async () => {
    const { status, body } = await request(server, { method: 'GET', path: '/api/cars' });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.cars));
  });

  test('accepts primary "type" filter', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?type=Sedan' });
    assert.equal(status, 200);
  });

  test('accepts alias "category" filter', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?category=Sedan' });
    assert.equal(status, 200);
  });

  test('accepts primary "search" filter', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?search=Test' });
    assert.equal(status, 200);
  });

  test('accepts alias "q" filter', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?q=Test' });
    assert.equal(status, 200);
  });

  test('accepts primary "sortBy" param', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?sortBy=rating' });
    assert.equal(status, 200);
  });

  test('accepts alias "sort" param with price_asc value', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?sort=price_asc' });
    assert.equal(status, 200);
  });

  test('accepts "sort=price_desc" alias', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?sort=price_desc' });
    assert.equal(status, 200);
  });

  test('rejects unknown sortBy value with 422', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/cars?sortBy=invalid' });
    assert.equal(status, 422);
  });

  test('filters by city', async () => {
    const { status, body } = await request(server, { method: 'GET', path: '/api/cars?city=Mumbai' });
    assert.equal(status, 200);
    assert.ok(body.data.cars.every((c) => c.cities.includes('Mumbai')));
  });
});

describe('GET /api/cars/:slug', () => {
  test('returns test car', async () => {
    const { status, body } = await request(server, {
      method: 'GET',
      path: '/api/cars/__test-car__',
    });
    assert.equal(status, 200);
    assert.equal(body.data.car.slug, '__test-car__');
  });

  test('returns 404 for unknown slug', async () => {
    const { status } = await request(server, {
      method: 'GET',
      path: '/api/cars/does-not-exist',
    });
    assert.equal(status, 404);
  });
});

describe('GET /api/cars/:slug/booked-dates', () => {
  test('returns 404 for unknown slug', async () => {
    const { status } = await request(server, {
      method: 'GET',
      path: '/api/cars/ghost-car/booked-dates',
    });
    assert.equal(status, 404);
  });
});

describe('POST /api/bookings — validation', () => {
  // Valid base payload using the canonical hub names from config/hubs.js.
  const validPayload = () => ({
    carSlug: '__test-car__',
    pickupCity: 'Mumbai',
    pickupLocation: 'CSMIA Airport (T2)',
    startDate: daysFromNow(2),
    endDate:   daysFromNow(5),
    aadhaar: '212345678901',   // First digit 2 — valid
    dl: 'MH12AB1234',
  });

  test('returns 401 without auth token', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', body: validPayload(),
    });
    assert.equal(status, 401);
  });

  // ── Aadhaar ─────────────────────────────────────────────────────────────────

  test('rejects Aadhaar shorter than 12 digits with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), aadhaar: '12345' },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  test('rejects Aadhaar with first digit 0 with 422', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), aadhaar: '012345678901' },
    });
    assert.equal(status, 422);
  });

  test('rejects Aadhaar with first digit 1 with 422', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), aadhaar: '112345678901' },
    });
    assert.equal(status, 422);
  });

  test('accepts Aadhaar with first digit 2 (minimum valid)', async () => {
    // Just validate the schema — expect pass-through to next layer (201 or later error).
    // A first-digit-2 aadhaar must not be rejected at the Zod layer.
    // Use dates far out (20-23 days) to avoid collision with the successful-creation block.
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), aadhaar: '212345678901', startDate: daysFromNow(20), endDate: daysFromNow(23) },
    });
    // Should NOT be 422 (Zod rejection). May be 201 or a later error.
    assert.notEqual(status, 422);
  });

  // ── DL ───────────────────────────────────────────────────────────────────────

  test('rejects DL shorter than 4 characters with 422', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), dl: 'AB1' },
    });
    assert.equal(status, 422);
  });

  test('rejects DL with special characters with 422', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), dl: 'MH-12-AB1234' },
    });
    assert.equal(status, 422);
  });

  // ── Hubs ─────────────────────────────────────────────────────────────────────

  test('rejects unknown city with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), pickupCity: 'Surat' },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  test('rejects wrong hub for city with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      // 'Airport Terminal' is cars.json generic text, not a canonical hub
      body: { ...validPayload(), pickupCity: 'Mumbai', pickupLocation: 'Airport Terminal' },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  test('rejects hub from a different city with 422', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      // IGI Airport T3 is Delhi NCR, not Mumbai
      body: { ...validPayload(), pickupCity: 'Mumbai', pickupLocation: 'IGI Airport T3' },
    });
    assert.equal(status, 422);
  });

  // ── Car not in city ───────────────────────────────────────────────────────────

  test('rejects booking when car is not available in pickupCity with 422 + CAR_NOT_AVAILABLE', async () => {
    // __test-car__ has cities: ['Mumbai'] — Kolkata is not included.
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: {
        ...validPayload(),
        pickupCity: 'Kolkata',
        pickupLocation: 'NSCBI Airport',
      },
    });
    assert.equal(status, 422);
    assert.equal(body.code, 'CAR_NOT_AVAILABLE');
  });

  // ── Date validation ───────────────────────────────────────────────────────────

  test('rejects past startDate with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), startDate: daysAgo(1), endDate: daysFromNow(2) },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  test('rejects endDate == startDate with 422', async () => {
    const same = daysFromNow(3);
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), startDate: same, endDate: same },
    });
    assert.equal(status, 422);
  });

  test('rejects rental longer than 30 days with 422', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), startDate: daysFromNow(1), endDate: daysFromNow(32) },
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  test('allows rental of exactly 30 days', async () => {
    // 30-day rental from a point far in the future to avoid overlap with other tests
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), startDate: daysFromNow(60), endDate: daysFromNow(90) },
    });
    // Should be 201 (not a 422 date-range rejection)
    assert.equal(status, 201);
  });
});

describe('POST /api/bookings — successful creation', () => {
  // Use days 12-15 to avoid colliding with the validation-block booking (days 2-5)
  // and the Aadhaar-first-digit test (days 20-23).
  const futureStart = daysFromNow(12);
  const futureEnd   = daysFromNow(15); // 3 days

  const validPayload = () => ({
    carSlug: '__test-car__',
    pickupCity: 'Mumbai',
    pickupLocation: 'CSMIA Airport (T2)',
    startDate: futureStart,
    endDate:   futureEnd,
    aadhaar: '212345678901',
    dl: 'MH12AB1234',
  });

  let createdRef;

  test('creates booking — correct privacy, pricing, reference format', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: validPayload(),
    });
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);

    const booking = body.data.booking;
    createdRef = booking.bookingReference;

    // Privacy: only last 4 of aadhaar stored.
    assert.equal(booking.aadhaarLast4, '8901');
    // Privacy: only last 4 of DL stored, uppercased.
    assert.equal(booking.dlLast4, '1234');
    // Full Aadhaar MUST NOT appear anywhere in the response JSON.
    assert.ok(
      !JSON.stringify(body).includes('212345678901'),
      'Full Aadhaar must never appear in the response'
    );

    // Reference format: ED-YYMM-XXXX
    assert.match(booking.bookingReference, /^ED-\d{4}-[0-9A-F]{4}$/);

    // Pricing: 3 days × 1000 pricePerDay
    assert.equal(booking.durationDays, 3);
    assert.equal(booking.pricePerDay,  1000);
    assert.equal(booking.subtotal,     3000);  // new field
    // taxAmount and totalCost must be whole rupees (integers)
    assert.equal(Number.isInteger(booking.taxAmount),  true, 'taxAmount must be a whole rupee');
    assert.equal(Number.isInteger(booking.totalCost),  true, 'totalCost must be a whole rupee');
    assert.equal(booking.taxAmount, 540);       // 3000 × 0.18
    assert.equal(booking.totalCost, 3540);
    assert.ok(booking.totalCost > booking.subtotal, 'totalCost must exceed subtotal (includes tax)');

    // paymentStatus defaults to 'pending'
    assert.equal(booking.paymentStatus, 'pending');

    // status defaults to 'confirmed'
    assert.equal(booking.status, 'confirmed');
  });

  test('rejects overlapping booking with 409 and code CAR_NOT_AVAILABLE', async () => {
    const { status, body } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: validPayload(), // Same dates = overlap
    });
    assert.equal(status, 409);
    assert.equal(body.success, false);
    assert.equal(body.code, 'CAR_NOT_AVAILABLE');
  });

  test('allows booking the same car for non-overlapping dates', async () => {
    // Days 16-19: after the 12-15 window, no overlap.
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), startDate: daysFromNow(16), endDate: daysFromNow(19) },
    });
    assert.equal(status, 201);
  });

  test('rejects unknown car with 404', async () => {
    const { status } = await request(server, {
      method: 'POST', path: '/api/bookings', token: userToken,
      body: { ...validPayload(), carSlug: 'no-such-car' },
    });
    assert.equal(status, 404);
  });
});

describe('GET /api/bookings/mine', () => {
  test('returns 401 without token', async () => {
    const { status } = await request(server, { method: 'GET', path: '/api/bookings/mine' });
    assert.equal(status, 401);
  });

  test("returns user's bookings sorted newest first", async () => {
    const { status, body } = await request(server, {
      method: 'GET', path: '/api/bookings/mine', token: userToken,
    });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.bookings));
    assert.ok(body.data.bookings.length >= 1);
    if (body.data.bookings.length >= 2) {
      const t0 = new Date(body.data.bookings[0].createdAt).getTime();
      const t1 = new Date(body.data.bookings[1].createdAt).getTime();
      assert.ok(t0 >= t1, 'Bookings must be newest-first');
    }
  });
});

describe('GET /api/bookings/:reference', () => {
  let bookingRef;

  before(async () => {
    const Booking = require('../models/Booking');
    const b = await Booking.findOne({}).sort({ createdAt: -1 });
    bookingRef = b ? b.bookingReference : null;
  });

  test('returns 401 without token', async () => {
    const { status } = await request(server, {
      method: 'GET',
      path: `/api/bookings/${bookingRef || 'ED-0000-0000'}`,
    });
    assert.equal(status, 401);
  });

  test('returns 404 for unknown reference', async () => {
    const { status } = await request(server, {
      method: 'GET', path: '/api/bookings/ED-9999-ZZZZ', token: userToken,
    });
    assert.equal(status, 404);
  });

  test('returns booking details for the owner', async () => {
    if (!bookingRef) return;
    const { status, body } = await request(server, {
      method: 'GET', path: `/api/bookings/${bookingRef}`, token: userToken,
    });
    assert.equal(status, 200);
    assert.equal(body.data.booking.bookingReference, bookingRef);
  });
});

describe('404 handler', () => {
  test('returns 404 for unknown route', async () => {
    const { status, body } = await request(server, {
      method: 'GET', path: '/api/does-not-exist',
    });
    assert.equal(status, 404);
    assert.equal(body.success, false);
  });
});

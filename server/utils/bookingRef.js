/**
 * utils/bookingRef.js
 * Generates a unique booking reference in the format ED-YYMM-XXXX.
 *
 * Format breakdown:
 *   ED   — EasyDrive brand prefix (always literal)
 *   YY   — 2-digit year  (e.g. "26" for 2026)
 *   MM   — 2-digit month (e.g. "10" for October)
 *   XXXX — 4 uppercase hex characters chosen randomly
 *
 * Example: ED-2610-A3F7
 *
 * The function checks the Booking collection for collisions and retries
 * up to MAX_RETRIES times before throwing. In practice the 65,536 possible
 * suffix values per month make collisions extremely unlikely.
 */

'use strict';

const crypto  = require('crypto');
const Booking = require('../models/Booking');

const MAX_RETRIES = 10;

/**
 * Generates a candidate reference string without a database check.
 * @returns {string}  e.g. "ED-2610-A3F7"
 */
function generateCandidate() {
  const now   = new Date();
  const yy    = String(now.getFullYear()).slice(-2);         // "26"
  const mm    = String(now.getMonth() + 1).padStart(2, '0'); // "10"
  const xxxx  = crypto.randomBytes(2).toString('hex').toUpperCase(); // "A3F7"
  return `ED-${yy}${mm}-${xxxx}`;
}

/**
 * Returns a booking reference that is guaranteed to be unique in the
 * Booking collection at the moment of call.
 *
 * @returns {Promise<string>}
 * @throws  {Error} if MAX_RETRIES collisions occur in a row (extremely unlikely).
 */
async function generateBookingRef() {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ref = generateCandidate();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Booking.exists({ bookingReference: ref });
    if (!exists) return ref;
  }
  throw new Error('Failed to generate a unique booking reference after multiple attempts.');
}

module.exports = { generateBookingRef };

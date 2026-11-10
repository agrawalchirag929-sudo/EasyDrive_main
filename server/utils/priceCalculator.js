/**
 * utils/priceCalculator.js
 * Server-authoritative rental price calculator.
 *
 * All monetary values are computed here, never trusted from the client.
 * TAX_RATE is read from process.env (set in .env as e.g. 0.18 for 18% GST).
 *
 * All returned amounts are whole rupees (Math.round to 0 decimal places),
 * matching the spec's "total and taxAmount must be whole rupees" rule.
 */

'use strict';

/**
 * Calculates rental duration and total cost from first principles.
 *
 * @param {Date|string} startDate   - Rental start date (inclusive).
 * @param {Date|string} endDate     - Rental end date (exclusive of final day;
 *                                    i.e. a 3-night rental has endDate = startDate + 3 days).
 * @param {number}      pricePerDay - Car's daily rental rate in INR (whole rupees).
 * @returns {{
 *   durationDays: number,
 *   subtotal:     number,   // durationDays × pricePerDay (whole rupees)
 *   taxAmount:    number,   // subtotal × TAX_RATE, rounded to whole rupees
 *   totalCost:    number    // subtotal + taxAmount (whole rupees)
 * }}
 */
function calculatePrice(startDate, endDate, pricePerDay) {
  const start = new Date(startDate);
  const end   = new Date(endDate);

  // Duration in whole days, ceiling-rounded so a partial day counts as a full day.
  const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (durationDays < 1) {
    throw new Error('End date must be at least one day after start date.');
  }

  const taxRate   = parseFloat(process.env.TAX_RATE) || 0.18;
  const subtotal  = durationDays * pricePerDay;               // Always a whole number
  const taxAmount = Math.round(subtotal * taxRate);           // Whole rupees
  const totalCost = subtotal + taxAmount;                     // Whole rupees

  return { durationDays, subtotal, taxAmount, totalCost };
}

module.exports = { calculatePrice };

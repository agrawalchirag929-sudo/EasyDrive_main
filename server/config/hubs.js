/**
 * config/hubs.js
 * Canonical city → pickup-hub mapping for EasyDrive.
 *
 * Used by:
 *  - POST /api/bookings  (validate pickupCity + pickupLocation)
 *  - Zod schema (createBookingSchema refine step)
 *  - Unit tests
 *
 * Source of truth: HANDOFF.md §6.3 "The 8 Supported Cities & Metropolitan Hubs".
 * Hub strings match exactly what is stored in cars.json pickupLocations[].
 *
 * Rule: never import this file in client/ — backend only.
 */

'use strict';

/**
 * @type {Record<string, string[]>}
 * Keys are the exact city names used in Car.cities[] and booking requests.
 * Values are the exact hub names used in Car.pickupLocations[].
 */
const CITY_HUBS = {
  'Delhi NCR':  ['IGI Airport T3', 'New Delhi Station', 'Connaught Place'],
  'Mumbai':     ['CSMIA Airport (T2)', 'BKC', 'Mumbai Central'],
  'Bengaluru':  ['KIA Airport', 'Majestic Station', 'Koramangala'],
  'Chennai':    ['Chennai Airport', 'Central Station', 'T. Nagar'],
  'Kolkata':    ['NSCBI Airport', 'Howrah Station', 'Park Street'],
  'Hyderabad':  ['RGIA Airport', 'Secunderabad Station', 'Hitec City'],
  'Pune':       ['Pune Airport', 'Pune Junction', 'Koregaon Park'],
  'Ahmedabad':  ['SVPI Airport', 'Kalupur Station', 'SG Highway'],
};

/** Sorted list of all supported city names. */
const VALID_CITIES = Object.keys(CITY_HUBS).sort();

/**
 * Returns true if the city is one of the 8 supported cities.
 * @param {string} city
 */
function isValidCity(city) {
  return Object.prototype.hasOwnProperty.call(CITY_HUBS, city);
}

/**
 * Returns true if hub is a valid pickup location for the given city.
 * @param {string} city
 * @param {string} hub
 */
function isValidHub(city, hub) {
  if (!isValidCity(city)) return false;
  return CITY_HUBS[city].includes(hub);
}

/**
 * Returns the hub list for a city, or [] if city is unknown.
 * @param {string} city
 * @returns {string[]}
 */
function hubsForCity(city) {
  return CITY_HUBS[city] || [];
}

module.exports = { CITY_HUBS, VALID_CITIES, isValidCity, isValidHub, hubsForCity };

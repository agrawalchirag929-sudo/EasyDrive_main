/**
 * client/js/api.js
 * EasyDrive shared API request helper.
 *
 * Responsibilities:
 *  - Single config constant for the base URL.
 *  - Sends JSON, attaches Bearer token when available.
 *  - Unwraps the {success, data} envelope from the server.
 *  - Throws a normalised ApiError {status, message, fieldErrors} on failure.
 *  - On 401 from a protected call, clears the session and opens sign-in dialog.
 *
 * NEVER log tokens, passwords, or request bodies.
 */

/** @type {string} Change to match the backend PORT in .env if needed. */
export const API_BASE = 'http://localhost:5000';

/**
 * Normalised error thrown when any request fails.
 * @typedef {{ status: number, message: string, fieldErrors: {field:string,message:string}[] }} ApiError
 */
class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{field:string,message:string}[]} fieldErrors
   */
  constructor(status, message, fieldErrors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Returns the current Bearer token from auth module without circular imports.
 * auth.js writes to this module-level slot via setTokenProvider().
 * @type {() => string|null}
 */
let _getToken = () => null;

/** Called once by auth.js at init time so api.js can read the live token. */
export function setTokenProvider(fn) {
  _getToken = fn;
}

/**
 * Called when a 401 is received on a protected endpoint.
 * auth.js registers a handler here via set401Handler().
 * @type {() => void}
 */
let _on401 = () => {};

export function set401Handler(fn) {
  _on401 = fn;
}

/**
 * Core request helper.
 *
 * @param {string} path       - e.g. '/api/auth/login'
 * @param {object} [options]
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {object} [options.body]  - will be JSON-serialised (never logged)
 * @param {boolean} [options.auth] - attach Bearer token header when true
 * @returns {Promise<any>}         - the unwrapped data payload
 * @throws {ApiError}
 */
export async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = _getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_networkErr) {
    // Network failure (server down, CORS pre-flight block, offline, etc.)
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, `Server returned non-JSON response (${response.status}).`);
  }

  if (!response.ok || json.success === false) {
    // 401 on a protected call → clear session and prompt sign-in
    if (response.status === 401 && auth) {
      _on401();
    }

    const fieldErrors = Array.isArray(json.errors) ? json.errors : [];
    throw new ApiError(
      response.status,
      json.message || `Request failed with status ${response.status}.`,
      fieldErrors
    );
  }

  // Unwrap the {success:true, data:{...}} envelope
  return json.data ?? json;
}

// ── Convenience method shorthands ─────────────────────────────────────────────

/** GET a public endpoint. */
export const get = (path) => request(path);

/** GET a protected endpoint (adds Bearer token). */
export const authGet = (path) => request(path, { auth: true });

/** POST to a public endpoint. */
export const post = (path, body) => request(path, { method: 'POST', body });

/** POST to a protected endpoint. */
export const authPost = (path, body) => request(path, { method: 'POST', body, auth: true });

// ── Cars ───────────────────────────────────────────────────────────────────────

/**
 * Adapt a raw car object from the API so it matches the shape expected by
 * carCard.js, compareModal.js, Quick View, and state.js.
 *
 * API differences vs cars.json:
 *   • `slug`  → also exposed as `id`  (cards use data-car-id="${car.id}")
 *   • `image` path is relative (e.g. "assets/cars/maruti-swift.webp") —
 *     same as cars.json, so client-server resolves it correctly as-is.
 *
 * @param {Object} apiCar - Raw car object from the API response
 * @returns {Object} Normalised car object
 */
export function adaptCar(apiCar) {
  return {
    ...apiCar,
    // carCard.js reads car.id for data-car-id attributes
    id: apiCar.id || apiCar.slug,
  };
}

/**
 * Fetch the car fleet from GET /api/cars with optional filters.
 *
 * @param {{ city?: string, category?: string, q?: string, sort?: string }} [filters]
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<Object[]>} Array of normalised car objects
 * @throws {ApiError}
 */
export async function fetchCars(filters = {}, { signal } = {}) {
  const params = new URLSearchParams();

  if (filters.city && filters.city !== 'All')      params.set('city',     filters.city);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.q && filters.q.trim())                params.set('q',        filters.q.trim());
  if (filters.sort)                                 params.set('sort',     filters.sort);

  const qs = params.toString();
  const path = `/api/cars${qs ? `?${qs}` : ''}`;

  const headers = { 'Content-Type': 'application/json' };
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { headers, signal });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err; // let caller handle abort
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  let json;
  try { json = await response.json(); } catch {
    throw new ApiError(response.status, `Server returned non-JSON (${response.status}).`);
  }

  if (!response.ok || json.success === false) {
    throw new ApiError(response.status, json.message || `Request failed (${response.status}).`);
  }

  const cars = json.data?.cars ?? [];
  return cars.map(adaptCar);
}

/**
 * Fetch a single car by slug from GET /api/cars/:slug.
 *
 * @param {string} slug
 * @returns {Promise<Object>} Normalised car object
 * @throws {ApiError}
 */
export async function fetchCar(slug) {
  const data = await get(`/api/cars/${encodeURIComponent(slug)}`);
  return adaptCar(data.car ?? data);
}

// ── Bookings ───────────────────────────────────────────────────────────────────

/**
 * Fetch future booked date ranges for a car (used to block dates in the picker).
 * Public endpoint — no auth required.
 *
 * @param {string} slug - Car slug
 * @returns {Promise<{startDate:string, endDate:string}[]>}
 * @throws {ApiError}
 */
export async function fetchBookedDates(slug) {
  const data = await get(`/api/cars/${encodeURIComponent(slug)}/booked-dates`);
  return Array.isArray(data.bookedDates) ? data.bookedDates : [];
}

/**
 * Create a new booking via POST /api/bookings.
 * Requires the user to be signed in (attaches Bearer token automatically).
 *
 * @param {{
 *   carSlug: string,
 *   pickupCity: string,
 *   pickupLocation: string,
 *   startDate: string,
 *   endDate: string,
 *   aadhaar: string,
 *   dl: string
 * }} payload
 * @returns {Promise<Object>} The booking object from {success:true, data:{booking}}
 * @throws {ApiError}
 */
export async function createBooking(payload) {
  const data = await authPost('/api/bookings', payload);
  return data.booking ?? data;
}

/**
 * Fetch the authenticated user's bookings from GET /api/bookings/mine.
 * Returns newest-first (guaranteed by the server).
 *
 * @returns {Promise<Object[]>} Array of booking objects
 * @throws {ApiError}  status 401 when the token is missing / expired
 */
export async function fetchMyBookings() {
  const data = await authGet('/api/bookings/mine');
  return Array.isArray(data.bookings) ? data.bookings : [];
}

export { ApiError };

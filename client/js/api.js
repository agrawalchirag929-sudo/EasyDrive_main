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

export { ApiError };

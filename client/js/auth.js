/**
 * client/js/auth.js
 * EasyDrive authentication module.
 *
 * Responsibilities:
 *  - login(email, password)      → POST /api/auth/login
 *  - register(name, email, pass) → POST /api/auth/register
 *  - logout()                    → clears session, notifies subscribers
 *  - restoreSession()            → on page load, calls GET /api/auth/me to
 *                                   validate a stored token; clears it if stale.
 *  - subscribe(fn)               → fire fn(user|null) whenever auth state changes.
 *
 * Token storage: localStorage with the existing in-memory fallback pattern.
 * NEVER log the token, passwords, or any request body.
 */

import { post, authGet, setTokenProvider, set401Handler } from './api.js';
import { openAuthDialog } from './components/authDialog.js';

// ── Storage ───────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'easydrive_auth_token';
const USER_KEY  = 'easydrive_auth_user';

/** In-memory fallback (matches state.js pattern). */
const _mem = new Map();

function _storageSave(key, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  try { localStorage.setItem(key, str); } catch { /* blocked */ }
  _mem.set(key, str);
}

function _storageGet(key) {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch { /* blocked */ }
  return _mem.get(key) ?? null;
}

function _storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* blocked */ }
  _mem.delete(key);
}

// ── Module state ──────────────────────────────────────────────────────────────

/** @type {string|null} */
let _token = _storageGet(TOKEN_KEY);

/** @type {{ _id:string, name:string, email:string }|null} */
let _user = (() => {
  try {
    const raw = _storageGet(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

/** Listener set for auth state changes. */
const _listeners = new Set();

// Wire the token provider so api.js can read the live token without an import cycle.
setTokenProvider(() => _token);

// When api.js detects a 401 on a protected call, clear the stale session
// and open the sign-in dialog so the user can re-authenticate.
set401Handler(() => {
  _clearSession();
  _notify();
  openAuthDialog('login');
});

// ── Internal helpers ──────────────────────────────────────────────────────────

function _persist(token, user) {
  _token = token;
  _user  = user;
  _storageSave(TOKEN_KEY, token);
  _storageSave(USER_KEY, user);
}

function _clearSession() {
  _token = null;
  _user  = null;
  _storageRemove(TOKEN_KEY);
  _storageRemove(USER_KEY);
}

function _notify() {
  _listeners.forEach(fn => fn(_user));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * @param {(user: object|null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** @returns {{ _id:string, name:string, email:string }|null} */
export function getUser() {
  return _user;
}

/** @returns {boolean} */
export function isLoggedIn() {
  return Boolean(_token && _user);
}

/**
 * Attempt to restore a session from stored token.
 * Calls GET /api/auth/me; on failure clears the stale token.
 * Called once on app boot.
 */
export async function restoreSession() {
  if (!_token) return;
  try {
    const data = await authGet('/api/auth/me');
    _user = data.user;
    _storageSave(USER_KEY, _user);
    _notify();
  } catch {
    // Token is expired or invalid – clear silently.
    _clearSession();
    _notify();
  }
}

/**
 * Log in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ _id:string, name:string, email:string }>}
 * @throws {ApiError}
 */
export async function login(email, password) {
  // body is never logged here or in api.js
  const data = await post('/api/auth/login', { email, password });
  _persist(data.token, data.user);
  _notify();
  return data.user;
}

/**
 * Register a new account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ _id:string, name:string, email:string }>}
 * @throws {ApiError}
 */
export async function register(name, email, password) {
  const data = await post('/api/auth/register', { name, email, password });
  _persist(data.token, data.user);
  _notify();
  return data.user;
}

/**
 * Log out the current user. Clears session and notifies all subscribers.
 */
export function logout() {
  _clearSession();
  _notify();
}

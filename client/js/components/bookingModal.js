/**
 * EasyDrive Booking Modal (components/bookingModal.js)
 * Phase 3c — wires the "Book" button to POST /api/bookings.
 *
 * Features:
 *  • Step 1 — City + Hub selector (driven by CITY_HUBS constant below, mirroring server/config/hubs.js)
 *  • Step 2 — Date picker (start / end), blocked dates from GET /api/cars/:slug/booked-dates
 *  • Step 3 — Identity (Aadhaar 12-digit + DL format), never logged
 *  • Live price preview: subtotal + 18% GST estimate (actual tax comes from server)
 *  • POST /api/bookings on submit → success confirmation screen
 *  • Accessible: role=dialog, aria-modal, focus trap, Esc to close, focus returns to trigger
 *  • Respects prefers-reduced-motion
 *  • Responsive: works at 390 px and desktop
 *
 * NEVER log aadhaar, dl, token, or request bodies to the console.
 */

import { fetchBookedDates, createBooking, ApiError } from '../api.js';

// ── Hub data (mirrors server/config/hubs.js exactly) ─────────────────────────
/** @type {Record<string, string[]>} */
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

const VALID_CITIES = Object.keys(CITY_HUBS);

// ── Validation helpers ────────────────────────────────────────────────────────

/** Returns true if the 12-digit string passes Aadhaar format rules (first digit 2-9). */
function isValidAadhaar(v) {
  return /^\d{12}$/.test(v) && parseInt(v[0], 10) >= 2;
}

/** Returns true if the DL string is alphanumeric, 4-20 chars, no hyphens/spaces. */
function isValidDL(v) {
  return /^[A-Za-z0-9]{4,20}$/.test(v);
}

/** Returns the today ISO date string in Asia/Kolkata timezone (YYYY-MM-DD). */
function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Returns 1-day-after-today in IST. */
function tomorrowIST() {
  const d = new Date(todayIST() + 'T00:00:00+05:30');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Add `n` days to an ISO date string (YYYY-MM-DD). */
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00+05:30');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Day count between two ISO dates (endDate - startDate in whole days). */
function daysBetween(start, end) {
  const ms = new Date(end + 'T00:00:00Z') - new Date(start + 'T00:00:00Z');
  return Math.round(ms / 86_400_000);
}

/**
 * Returns true if the proposed [start, end) window overlaps any booked range.
 * Server overlap predicate: existingStart < reqEnd && existingEnd > reqStart.
 * @param {string} start - ISO date
 * @param {string} end   - ISO date
 * @param {{startDate:string, endDate:string}[]} bookedDates
 */
function hasConflict(start, end, bookedDates) {
  for (const b of bookedDates) {
    if (b.startDate < end && b.endDate > start) return true;
  }
  return false;
}

// ── Module-level state ────────────────────────────────────────────────────────
let _activeClose = null; // cleanup fn for currently open modal

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens the booking modal for a car.
 *
 * @param {Object} car         - Normalised car object from state (needs .id/.slug, .name, .brand, .pricePerDay, .cities[])
 * @param {HTMLElement} [triggerEl] - Element that opened the modal (focus returns here on close)
 */
export async function openBookingModal(car, triggerEl) {
  // Only one modal at a time
  if (_activeClose) _activeClose();

  const container = _getOrCreateContainer();
  const carSlug   = car.slug || car.id;

  // Build modal HTML (city select pre-filtered to car.cities[])
  container.innerHTML = _modalHtml(car);

  // Make visible
  const backdrop = container.querySelector('.bk-backdrop');
  requestAnimationFrame(() => backdrop.classList.add('bk-backdrop--visible'));

  // State for this modal instance
  const state = {
    pickupCity:     '',
    pickupLocation: '',
    startDate:      tomorrowIST(),
    endDate:        '',
    aadhaar:        '',
    dl:             '',
    bookedDates:    [],   // loaded async
    days:           0,
    submitting:     false,
  };

  // Wire up close
  const close = _makeClose(container, backdrop, triggerEl);
  _activeClose = close;

  // --- DOM refs ---
  const citySelect     = container.querySelector('#bk-city');
  const hubSelect      = container.querySelector('#bk-hub');
  const startInput     = container.querySelector('#bk-start');
  const endInput       = container.querySelector('#bk-end');
  const aadhaarInput   = container.querySelector('#bk-aadhaar');
  const dlInput        = container.querySelector('#bk-dl');
  const submitBtn      = container.querySelector('#bk-submit');
  const pricePreview   = container.querySelector('#bk-price-preview');
  const dateConflict   = container.querySelector('#bk-date-conflict');
  const dateInfo       = container.querySelector('#bk-date-info');

  // Populate city options (only cities this car serves, or all if car.cities is empty)
  const availCities = Array.isArray(car.cities) && car.cities.length > 0
    ? VALID_CITIES.filter(c => car.cities.includes(c))
    : VALID_CITIES;
  citySelect.innerHTML = '<option value="">— Select a city —</option>'
    + availCities.map(c => `<option value="${c}">${c}</option>`).join('');

  // Set min date on start input (tomorrow)
  startInput.min = tomorrowIST();
  startInput.value = state.startDate;

  // Start loading booked dates in the background
  _loadBookedDates(carSlug, dateInfo, state);

  // ── Event wiring ─────────────────────────────────────────────────────────────

  citySelect.addEventListener('change', () => {
    state.pickupCity     = citySelect.value;
    state.pickupLocation = '';
    _populateHubs(hubSelect, state.pickupCity);
    _updatePrice(pricePreview, state, car);
    _validateConflict(dateConflict, state);
    _updateSubmitBtn(submitBtn, state, car);
  });

  hubSelect.addEventListener('change', () => {
    state.pickupLocation = hubSelect.value;
    _updateSubmitBtn(submitBtn, state, car);
  });

  startInput.addEventListener('change', () => {
    state.startDate = startInput.value;
    // Reset end date if it's now invalid
    if (state.endDate && state.endDate <= state.startDate) {
      state.endDate = '';
      endInput.value = '';
    }
    // End must be at least 1 day after start
    endInput.min = state.startDate ? addDays(state.startDate, 1) : '';
    endInput.max = state.startDate ? addDays(state.startDate, 30) : '';
    _computeDays(state);
    _updatePrice(pricePreview, state, car);
    _validateConflict(dateConflict, state);
    _updateSubmitBtn(submitBtn, state, car);
  });

  endInput.addEventListener('change', () => {
    state.endDate = endInput.value;
    _computeDays(state);
    _updatePrice(pricePreview, state, car);
    _validateConflict(dateConflict, state);
    _updateSubmitBtn(submitBtn, state, car);
  });

  aadhaarInput.addEventListener('input', () => {
    // Strip non-digits
    aadhaarInput.value = aadhaarInput.value.replace(/\D/g, '').slice(0, 12);
    state.aadhaar = aadhaarInput.value;
    _clearFieldError(container, 'aadhaar');
    _updateSubmitBtn(submitBtn, state, car);
  });

  dlInput.addEventListener('input', () => {
    dlInput.value = dlInput.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20).toUpperCase();
    state.dl = dlInput.value;
    _clearFieldError(container, 'dl');
    _updateSubmitBtn(submitBtn, state, car);
  });

  submitBtn.addEventListener('click', async () => {
    if (state.submitting) return;
    // Client-side validation
    if (!_runValidation(container, state, car)) return;

    state.submitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="bk-spinner" aria-hidden="true"></span>
      Confirming…
    `;

    try {
      const booking = await createBooking({
        carSlug:         carSlug,
        pickupCity:      state.pickupCity,
        pickupLocation:  state.pickupLocation,
        startDate:       state.startDate,
        endDate:         state.endDate,
        aadhaar:         state.aadhaar,   // server masks; never logged here
        dl:              state.dl,         // server masks; never logged here
      });
      // ── Scrub sensitive values immediately after the request leaves ──────────
      // Zero state variables so they never linger in memory beyond this point.
      state.aadhaar = '';
      state.dl      = '';
      // Clear DOM inputs so the browser cannot autofill or retain the values.
      if (aadhaarInput) { aadhaarInput.value = ''; }
      if (dlInput)      { dlInput.value      = ''; }
      _renderSuccess(container, booking, car, close);
    } catch (err) {
      // ── Scrub on failure too ─────────────────────────────────────────────────
      state.aadhaar = '';
      state.dl      = '';
      if (aadhaarInput) { aadhaarInput.value = ''; }
      if (dlInput)      { dlInput.value      = ''; }
      state.submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
      _handleSubmitError(container, err);
    }
  });

  // Keyboard trap + Esc
  _trapFocus(container, backdrop, close);

  // Initial state
  _updatePrice(pricePreview, state, car);
  _updateSubmitBtn(submitBtn, state, car);
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _getOrCreateContainer() {
  let el = document.getElementById('booking-modal-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'booking-modal-container';
    document.body.appendChild(el);
  }
  return el;
}

function _makeClose(container, backdrop, triggerEl) {
  let closed = false;
  return function close() {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('bk-backdrop--visible');
    const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
    setTimeout(() => {
      container.innerHTML = '';
      _activeClose = null;
    }, dur);
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
  };
}

function _trapFocus(container, backdrop, close) {
  const getFocusable = () =>
    Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null || el === document.activeElement);

  const handleKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); document.removeEventListener('keydown', handleKey); return; }
    if (e.key === 'Tab') {
      const els = getFocusable();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    }
  };
  document.addEventListener('keydown', handleKey);

  // Click-outside to close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { close(); document.removeEventListener('keydown', handleKey); }
  });

  // Wire explicit close button and cancel button
  container.querySelector('#bk-close-btn')?.addEventListener('click', () => {
    close(); document.removeEventListener('keydown', handleKey);
  });
  container.querySelector('#bk-cancel-btn')?.addEventListener('click', () => {
    close(); document.removeEventListener('keydown', handleKey);
  });

  // Focus first interactive element
  requestAnimationFrame(() => {
    const first = getFocusable()[0];
    if (first) first.focus();
  });
}

async function _loadBookedDates(slug, dateInfo, state) {
  try {
    const dates = await fetchBookedDates(slug);
    state.bookedDates = dates;
    if (dates.length > 0 && dateInfo) {
      dateInfo.textContent = `${dates.length} period${dates.length > 1 ? 's' : ''} already booked — those dates are unavailable.`;
    }
  } catch {
    // Non-critical: if this fails, just warn user to check availability
    if (dateInfo) {
      dateInfo.textContent = 'Could not load booked dates. Please verify availability.';
    }
  }
}

function _populateHubs(hubSelect, city) {
  const hubs = CITY_HUBS[city] || [];
  hubSelect.innerHTML = '<option value="">— Select a hub —</option>'
    + hubs.map(h => `<option value="${h}">${h}</option>`).join('');
  hubSelect.disabled = hubs.length === 0;
}

function _computeDays(state) {
  if (state.startDate && state.endDate && state.endDate > state.startDate) {
    state.days = daysBetween(state.startDate, state.endDate);
  } else {
    state.days = 0;
  }
}

function _updatePrice(pricePreview, state, car) {
  if (!pricePreview) return;
  if (state.days <= 0) {
    pricePreview.innerHTML = `<span class="bk-price-hint">Select dates to see pricing</span>`;
    return;
  }
  const subtotal   = state.days * car.pricePerDay;
  const taxEst     = Math.round(subtotal * 0.18);
  const totalEst   = subtotal + taxEst;
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  pricePreview.innerHTML = `
    <div class="bk-price-row">
      <span>${fmt(car.pricePerDay)} × ${state.days} day${state.days > 1 ? 's' : ''}</span>
      <span>${fmt(subtotal)}</span>
    </div>
    <div class="bk-price-row">
      <span>GST (18% est.)</span>
      <span>${fmt(taxEst)}</span>
    </div>
    <div class="bk-price-row bk-price-row--total">
      <span>Estimated Total</span>
      <span>${fmt(totalEst)}</span>
    </div>
    <p class="bk-price-note">Estimated. The final price is calculated by the server.</p>
  `;
}

function _validateConflict(dateConflict, state) {
  if (!dateConflict) return;
  if (state.startDate && state.endDate && state.bookedDates.length > 0) {
    const conflict = hasConflict(state.startDate, state.endDate, state.bookedDates);
    dateConflict.textContent = conflict ? '⚠ These dates overlap an existing booking. Please choose different dates.' : '';
  } else {
    dateConflict.textContent = '';
  }
}

function _updateSubmitBtn(submitBtn, state, car) {
  if (!submitBtn) return;
  const availCities = Array.isArray(car.cities) && car.cities.length > 0
    ? VALID_CITIES.filter(c => car.cities.includes(c))
    : VALID_CITIES;
  const cityOk     = availCities.includes(state.pickupCity);
  const hubOk      = !!(state.pickupLocation && (CITY_HUBS[state.pickupCity] || []).includes(state.pickupLocation));
  const datesOk    = state.days >= 1 && state.days <= 30;
  const noConflict = state.bookedDates.length === 0 || !hasConflict(state.startDate, state.endDate, state.bookedDates);
  const aadhaarOk  = isValidAadhaar(state.aadhaar);
  const dlOk       = isValidDL(state.dl);
  const allOk      = cityOk && hubOk && datesOk && noConflict && aadhaarOk && dlOk && !state.submitting;
  submitBtn.disabled = !allOk;
}

function _clearFieldError(container, field) {
  const el = container.querySelector(`#bk-err-${field}`);
  if (el) el.textContent = '';
  const input = container.querySelector(`#bk-${field}`);
  if (input) input.classList.remove('bk-input--error');
}

function _setFieldError(container, field, msg) {
  const el = container.querySelector(`#bk-err-${field}`);
  if (el) el.textContent = msg;
  const input = container.querySelector(`#bk-${field}`);
  if (input) input.classList.add('bk-input--error');
}

function _runValidation(container, state, car) {
  let ok = true;

  if (!state.pickupCity) {
    _setFieldError(container, 'city', 'Please select a city.'); ok = false;
  }
  if (!state.pickupLocation) {
    _setFieldError(container, 'hub', 'Please select a pickup hub.'); ok = false;
  }
  if (!state.startDate) {
    _setFieldError(container, 'start', 'Please choose a start date.'); ok = false;
  } else if (state.startDate <= todayIST()) {
    _setFieldError(container, 'start', 'Start date must be in the future.'); ok = false;
  }
  if (!state.endDate) {
    _setFieldError(container, 'end', 'Please choose a return date.'); ok = false;
  } else if (state.endDate <= state.startDate) {
    _setFieldError(container, 'end', 'Return date must be at least 1 day after start.'); ok = false;
  } else if (state.days > 30) {
    _setFieldError(container, 'end', 'Maximum rental is 30 days.'); ok = false;
  }
  if (state.bookedDates.length > 0 && hasConflict(state.startDate, state.endDate, state.bookedDates)) {
    _setFieldError(container, 'end', 'These dates are already booked.'); ok = false;
  }
  if (!isValidAadhaar(state.aadhaar)) {
    _setFieldError(container, 'aadhaar', 'Enter a 12-digit Aadhaar number (first digit 2–9).'); ok = false;
  }
  if (!isValidDL(state.dl)) {
    _setFieldError(container, 'dl', 'DL must be 4–20 alphanumeric characters (no spaces or hyphens).'); ok = false;
  }
  return ok;
}

function _handleSubmitError(container, err) {
  const generalError = container.querySelector('#bk-general-error');
  if (!generalError) return;

  if (err instanceof ApiError) {
    // Map field errors back to individual inputs
    if (Array.isArray(err.fieldErrors) && err.fieldErrors.length > 0) {
      for (const fe of err.fieldErrors) {
        // Map server field names to our IDs
        const fieldMap = { pickupCity: 'city', pickupLocation: 'hub', startDate: 'start', endDate: 'end', aadhaar: 'aadhaar', dl: 'dl' };
        const domField = fieldMap[fe.field] || fe.field;
        _setFieldError(container, domField, fe.message);
      }
    }
    if (err.status === 409) {
      generalError.textContent = 'This car is no longer available for those dates. Please choose different dates.';
    } else if (err.status === 0) {
      generalError.textContent = 'Cannot reach the server. Please check your connection.';
    } else if (err.status === 401) {
      generalError.textContent = 'Your session has expired. Please sign in again.';
    } else {
      generalError.textContent = err.message || 'Something went wrong. Please try again.';
    }
  } else {
    generalError.textContent = 'An unexpected error occurred. Please try again.';
  }
}

function _renderSuccess(container, booking, car, close) {
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const panel = container.querySelector('.bk-panel');
  if (!panel) return;

  // All values come from the server response — never from local state or car object.
  panel.innerHTML = `
    <div class="bk-success">
      <div class="bk-success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="9 12 11 14 15 10"></polyline>
        </svg>
      </div>
      <h2 class="bk-success-title">Booking Confirmed!</h2>
      <p class="bk-success-ref">Reference: <strong>${booking.bookingReference}</strong></p>
      <div class="bk-success-summary">
        <div class="bk-sum-row"><span>Vehicle</span><span>${booking.carName}</span></div>
        <div class="bk-sum-row"><span>Pickup City</span><span>${booking.pickupCity}</span></div>
        <div class="bk-sum-row"><span>Pickup Hub</span><span>${booking.pickupLocation}</span></div>
        <div class="bk-sum-row"><span>Dates</span><span>${booking.startDate} → ${booking.endDate}</span></div>
        <div class="bk-sum-row"><span>Duration</span><span>${booking.durationDays} day${booking.durationDays > 1 ? 's' : ''}</span></div>
        <div class="bk-sum-row"><span>Subtotal</span><span>${fmt(booking.subtotal)}</span></div>
        <div class="bk-sum-row"><span>Tax (GST)</span><span>${fmt(booking.taxAmount)}</span></div>
        <div class="bk-sum-row bk-sum-row--total"><span>Total (incl. GST)</span><span>${fmt(booking.totalCost)}</span></div>
        <div class="bk-sum-row"><span>Aadhaar (last 4)</span><span>••••••••${booking.aadhaarLast4}</span></div>
        <div class="bk-sum-row"><span>DL (last 4)</span><span>••••••••${booking.dlLast4}</span></div>
        <div class="bk-sum-row"><span>Payment Status</span><span class="bk-status-badge">${booking.paymentStatus}</span></div>
      </div>
      <p class="bk-success-note">Your booking is confirmed. View all trips in <strong>My Bookings</strong>.</p>
      <div class="bk-success-actions">
        <a href="#bookings" class="btn btn-brand" id="bk-go-bookings">My Bookings <span class="btn-arrow">→</span></a>
        <button type="button" class="btn btn-outline" id="bk-close-success">Close</button>
      </div>
    </div>
  `;

  // Focus first button in success view
  requestAnimationFrame(() => {
    panel.querySelector('#bk-go-bookings')?.focus();
  });

  panel.querySelector('#bk-go-bookings')?.addEventListener('click', () => close());
  panel.querySelector('#bk-close-success')?.addEventListener('click', () => close());
}

// ── Modal HTML template ───────────────────────────────────────────────────────

function _modalHtml(car) {
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  return `
    <div class="bk-backdrop" role="dialog" aria-modal="true" aria-labelledby="bk-title">
      <div class="bk-panel">
        <!-- Header -->
        <div class="bk-header">
          <div>
            <span class="bk-eyebrow">Book Vehicle</span>
            <h2 id="bk-title" class="bk-title">${car.brand} ${car.name}</h2>
            <p class="bk-subtitle">${fmt(car.pricePerDay)} / day &nbsp;•&nbsp; 250 km/day included</p>
          </div>
          <button type="button" class="bk-close-btn" id="bk-close-btn" aria-label="Close booking form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- General error banner -->
        <div id="bk-general-error" class="bk-general-error" role="alert" aria-live="assertive"></div>

        <!-- Form body -->
        <div class="bk-body">

          <!-- SECTION: Location -->
          <fieldset class="bk-section">
            <legend class="bk-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Pickup Location
            </legend>

            <div class="bk-row">
              <div class="bk-field">
                <label class="bk-label" for="bk-city">City</label>
                <select class="bk-input bk-select" id="bk-city" required>
                  <option value="">— Select a city —</option>
                </select>
                <span class="bk-field-error" id="bk-err-city" role="alert"></span>
              </div>

              <div class="bk-field">
                <label class="bk-label" for="bk-hub">Pickup Hub</label>
                <select class="bk-input bk-select" id="bk-hub" disabled required>
                  <option value="">— Select a hub —</option>
                </select>
                <span class="bk-field-error" id="bk-err-hub" role="alert"></span>
              </div>
            </div>
          </fieldset>

          <!-- SECTION: Dates -->
          <fieldset class="bk-section">
            <legend class="bk-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Rental Dates
            </legend>

            <div class="bk-row">
              <div class="bk-field">
                <label class="bk-label" for="bk-start">Pick-up Date</label>
                <input type="date" class="bk-input" id="bk-start" required />
                <span class="bk-field-error" id="bk-err-start" role="alert"></span>
              </div>

              <div class="bk-field">
                <label class="bk-label" for="bk-end">Return Date</label>
                <input type="date" class="bk-input" id="bk-end" required />
                <span class="bk-field-error" id="bk-err-end" role="alert"></span>
              </div>
            </div>

            <span class="bk-date-conflict" id="bk-date-conflict" role="alert"></span>
            <span class="bk-date-info" id="bk-date-info"></span>
          </fieldset>

          <!-- SECTION: Price Preview -->
          <div class="bk-price-preview" id="bk-price-preview" aria-live="polite">
            <span class="bk-price-hint">Select dates to see pricing</span>
          </div>

          <!-- SECTION: Identity Documents -->
          <fieldset class="bk-section">
            <legend class="bk-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              Identity Verification
            </legend>
            <p class="bk-privacy-note">Your documents are never stored in full — only the last 4 digits are saved.</p>

            <div class="bk-field">
              <label class="bk-label" for="bk-aadhaar">Aadhaar Number (12 digits)</label>
              <input
                type="text"
                inputmode="numeric"
                class="bk-input"
                id="bk-aadhaar"
                maxlength="12"
                autocomplete="off"
                placeholder="Enter 12-digit Aadhaar"
                required
              />
              <span class="bk-field-error" id="bk-err-aadhaar" role="alert"></span>
            </div>

            <div class="bk-field">
              <label class="bk-label" for="bk-dl">Driving Licence Number</label>
              <input
                type="text"
                class="bk-input"
                id="bk-dl"
                maxlength="20"
                autocomplete="off"
                placeholder="e.g. MH12AB1234567"
                required
              />
              <span class="bk-field-error" id="bk-err-dl" role="alert"></span>
            </div>
          </fieldset>

        </div><!-- /bk-body -->

        <!-- Footer -->
        <div class="bk-footer">
          <button type="button" class="btn btn-outline bk-cancel-btn" id="bk-cancel-btn">Cancel</button>
          <button type="button" class="btn btn-brand bk-submit-btn" id="bk-submit" disabled>Confirm Booking</button>
        </div>
      </div>
    </div>
  `;
}

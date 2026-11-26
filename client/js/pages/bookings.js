/**
 * EasyDrive Bookings Page (pages/bookings.js)
 * Phase 3d — shows the authenticated user's real bookings from the API.
 *
 * States:
 *   logged-out  → auth gate  (unchanged from Phase 3a)
 *   logged-in   → fetch → skeletons → trip cards | empty state | error state
 *
 * Rules:
 *  - Re-fetches on every visit so a just-made booking appears immediately.
 *  - 401 from the API clears the session (handled by api.js set401Handler) and
 *    re-renders the auth gate via the auth subscribe callback.
 *  - Dates are formatted with timeZone:'UTC' so midnight-UTC dates never shift
 *    to the previous day in IST.
 *  - Aadhaar / DL last-4 are shown only as "••••••••XXXX" — never logged.
 *  - No cancel, invoice or payment features (Phase 4).
 */

import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';
import { isLoggedIn, subscribe as authSubscribe } from '../auth.js';
import { openAuthDialog } from '../components/authDialog.js';
import { fetchMyBookings, ApiError } from '../api.js';
import { getState } from '../state.js';
import { showToast } from '../components/toast.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format an ISO date string using UTC so it never shifts in IST. */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format a rupee amount with Indian grouping (₹1,23,456). */
function fmtMoney(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

/** Map booking.status to a CSS modifier and label. */
const STATUS_META = {
  confirmed: { cls: 'trip-badge--confirmed', label: 'Confirmed' },
  active:    { cls: 'trip-badge--active',    label: 'Active'     },
  completed: { cls: 'trip-badge--completed', label: 'Completed'  },
  cancelled: { cls: 'trip-badge--cancelled', label: 'Cancelled'  },
};

/** Map booking.paymentStatus to a CSS modifier and label. */
const PAYMENT_META = {
  pending:   { cls: 'trip-badge--pending',   label: 'Payment Pending'   },
  paid:      { cls: 'trip-badge--paid',      label: 'Paid'               },
  failed:    { cls: 'trip-badge--failed',    label: 'Payment Failed'     },
  refunded:  { cls: 'trip-badge--refunded',  label: 'Refunded'           },
};

/** Look up a car image path from the loaded fleet by carSlug. */
function _imageForSlug(slug) {
  const { cars } = getState();
  const car = cars.find(c => (c.slug || c.id) === slug);
  return car?.image ?? null; // null → show placeholder
}

// ── Skeleton HTML ─────────────────────────────────────────────────────────────

function _skeletonHtml(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="trip-card trip-card--skeleton" aria-hidden="true">
      <div class="trip-card-img skeleton"></div>
      <div class="trip-card-body">
        <div class="skeleton skeleton-line skeleton-line-sm" style="width:40%;margin-bottom:6px;"></div>
        <div class="skeleton skeleton-line skeleton-line-lg" style="width:65%;margin-bottom:14px;"></div>
        <div class="skeleton skeleton-line skeleton-line-md" style="width:55%;margin-bottom:8px;"></div>
        <div class="skeleton skeleton-line skeleton-line-sm" style="width:45%;margin-bottom:8px;"></div>
        <div class="skeleton skeleton-line skeleton-line-sm" style="width:30%;margin-bottom:0;"></div>
      </div>
    </div>
  `).join('');
}

// ── Single booking card HTML ──────────────────────────────────────────────────

function _tripCardHtml(b) {
  const imgSrc  = _imageForSlug(b.carSlug);
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${b.carName}" class="trip-card-img-el" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />`
    : '';
  const placeholderHtml = `
    <div class="trip-card-img-placeholder" ${imgSrc ? 'style="display:none"' : ''} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" opacity="0.4">
        <rect x="1" y="3" width="15" height="13" rx="2"></rect>
        <path d="m16 8 2 2 4-4"></path>
        <path d="M4 7h8M4 11h4"></path>
      </svg>
    </div>`;

  const st  = STATUS_META[b.status]  || { cls: 'trip-badge--confirmed', label: b.status };
  const pay = PAYMENT_META[b.paymentStatus] || { cls: 'trip-badge--pending', label: b.paymentStatus };

  return `
    <article class="trip-card reveal-on-scroll" data-ref="${b.bookingReference}">
      <!-- Car image strip -->
      <div class="trip-card-img-wrap">
        ${imgHtml}
        ${placeholderHtml}
      </div>

      <!-- Card body -->
      <div class="trip-card-body">
        <!-- Header row: car name + badges -->
        <div class="trip-card-header">
          <div class="trip-card-name-wrap">
            <span class="trip-card-eyebrow">${b.pickupCity}</span>
            <h3 class="trip-card-name">${b.carName}</h3>
          </div>
          <div class="trip-badges">
            <span class="trip-badge ${st.cls}">${st.label}</span>
            <span class="trip-badge ${pay.cls}">${pay.label}</span>
          </div>
        </div>

        <!-- Reference row with copy button -->
        <div class="trip-card-ref-row">
          <span class="trip-card-ref" title="Booking reference">${b.bookingReference}</span>
          <button
            type="button"
            class="trip-copy-btn"
            data-copy="${b.bookingReference}"
            aria-label="Copy booking reference ${b.bookingReference}"
            title="Copy reference"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>

        <!-- Details grid -->
        <dl class="trip-details">
          <div class="trip-detail-row">
            <dt>Hub</dt>
            <dd>${b.pickupLocation}</dd>
          </div>
          <div class="trip-detail-row">
            <dt>Pick-up</dt>
            <dd>${fmtDate(b.startDate)}</dd>
          </div>
          <div class="trip-detail-row">
            <dt>Return</dt>
            <dd>${fmtDate(b.endDate)}</dd>
          </div>
          <div class="trip-detail-row">
            <dt>Duration</dt>
            <dd>${b.durationDays} day${b.durationDays !== 1 ? 's' : ''}</dd>
          </div>
          <div class="trip-detail-row trip-detail-row--total">
            <dt>Total</dt>
            <dd>${fmtMoney(b.totalCost)}</dd>
          </div>
        </dl>

        <!-- Masked identity note -->
        <p class="trip-identity-note">
          Aadhaar ending ${b.aadhaarLast4} &middot; DL ending ${b.dlLast4}
        </p>
      </div>
    </article>
  `;
}

// ── Page sections ─────────────────────────────────────────────────────────────

function _pageShell(innerHtml) {
  return `
    <div class="page-fade-in">
      <div style="margin-bottom:var(--space-8);">
        <span style="font-size:var(--text-xs);color:var(--brand);font-weight:700;text-transform:uppercase;">Trips Manager</span>
        <h1 class="section-title">My Bookings</h1>
        <p style="color:var(--muted);font-size:var(--text-sm);">
          Your confirmed reservations, newest first.
        </p>
      </div>
      ${innerHtml}
      ${_footerHtml()}
    </div>
  `;
}

function _loadingHtml() {
  return _pageShell(`
    <div class="trip-list" aria-busy="true" aria-label="Loading bookings">
      ${_skeletonHtml(3)}
    </div>
  `);
}

function _emptyHtml() {
  return _pageShell(`
    <div class="empty-state-card reveal-on-scroll">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h2 style="font-size:var(--text-2xl);">No Bookings Yet</h2>
      <p style="color:var(--muted);font-size:var(--text-sm);max-width:420px;">
        You haven't made any reservations. Explore our fleet across 8 Indian cities and book your first trip!
      </p>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2);">
        <a href="#catalogue" class="btn btn-brand">Explore Cars <span class="btn-arrow">&rarr;</span></a>
        <a href="#home" class="btn btn-outline">Back to Home</a>
      </div>
    </div>
  `);
}

function _errorHtml(message) {
  return _pageShell(`
    <div class="empty-state-card reveal-on-scroll">
      <div class="empty-state-icon" style="color:var(--error);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 style="font-size:var(--text-xl);">Could Not Load Bookings</h2>
      <p style="color:var(--muted);font-size:var(--text-sm);max-width:420px;">${message}</p>
      <button type="button" class="btn btn-brand" id="bookings-retry-btn" style="margin-top:var(--space-2);">
        Retry
      </button>
    </div>
  `);
}

// ── Core render logic ─────────────────────────────────────────────────────────

/**
 * Fetch and render the user's bookings into the given container.
 * Shows skeletons while loading, then cards / empty / error.
 */
async function _fetchAndRender(container) {
  // Show skeletons immediately
  container.innerHTML = _loadingHtml();

  // Reveal skeleton cards
  container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));

  let bookings;
  try {
    bookings = await fetchMyBookings();
  } catch (err) {
    // 401 is handled by api.js (clears session, fires _on401 → auth re-render).
    // For every other error show the error state with Retry.
    const msg = (err instanceof ApiError && err.status !== 401)
      ? (err.status === 0 ? 'Cannot reach the server. Is the API running?' : err.message)
      : 'An unexpected error occurred. Please try again.';

    container.innerHTML = _errorHtml(msg);
    container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));

    document.getElementById('bookings-retry-btn')?.addEventListener('click', () => {
      _fetchAndRender(container);
    });
    return;
  }

  if (bookings.length === 0) {
    container.innerHTML = _emptyHtml();
    container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));
    return;
  }

  // Render trip cards
  container.innerHTML = _pageShell(`
    <p class="trip-count">${bookings.length} booking${bookings.length !== 1 ? 's' : ''}</p>
    <div class="trip-list">
      ${bookings.map(_tripCardHtml).join('')}
    </div>
  `);

  // Reveal cards (scroll-reveal for items above fold; immediate for visible ones)
  container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));

  // Wire copy buttons
  container.querySelectorAll('.trip-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ref = btn.getAttribute('data-copy');
      if (!ref) return;
      navigator.clipboard?.writeText(ref).then(() => {
        showToast('Reference copied', 'info', 2000);
      }).catch(() => {
        // Clipboard not available (e.g. non-HTTPS) — silent fail, toast anyway
        showToast('Reference copied', 'info', 2000);
      });
    });
  });
}

// ── Public entry point ────────────────────────────────────────────────────────

export function renderBookingsPage(container) {
  if (isLoggedIn()) {
    _fetchAndRender(container);
  } else {
    _renderAuthGate(container);
  }

  // Re-render whenever auth state changes (login, logout, 401 auto-clear)
  const unsub = authSubscribe(() => {
    if (!document.body.contains(container)) { unsub(); return; }
    if (isLoggedIn()) {
      _fetchAndRender(container);
    } else {
      _renderAuthGate(container);
    }
  });
}

// ── Auth gate (unchanged from Phase 3a) ──────────────────────────────────────

function _renderAuthGate(container) {
  container.innerHTML = `
    <div class="page-fade-in">
      <div style="margin-bottom:var(--space-8);">
        <span style="font-size:var(--text-xs);color:var(--brand);font-weight:700;text-transform:uppercase;">Trips Manager</span>
        <h1 class="section-title">My Bookings</h1>
        <p style="color:var(--muted);font-size:var(--text-sm);">
          Track upcoming departures, download trip invoices, and manage vehicle returns.
        </p>
      </div>

      <div class="empty-state-card reveal-on-scroll">
        <div class="bookings-auth-gate">
          <svg class="gate-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h2>Sign In to See Your Bookings</h2>
          <p>
            Your trip history and upcoming reservations are waiting. Sign in or create a free account
            to access your personalised bookings dashboard.
          </p>
          <div class="gate-actions">
            <button type="button" class="btn btn-brand" id="bookings-signin-btn">
              Sign In <span class="btn-arrow">&rarr;</span>
            </button>
            <button type="button" class="btn btn-outline" id="bookings-signup-btn">
              Create Account
            </button>
          </div>
        </div>
      </div>

      ${_footerHtml()}
    </div>
  `;

  // Reveal the auth gate card
  container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));

  document.getElementById('bookings-signin-btn')?.addEventListener('click', (e) => {
    openAuthDialog('login', e.currentTarget);
  });
  document.getElementById('bookings-signup-btn')?.addEventListener('click', (e) => {
    openAuthDialog('register', e.currentTarget);
  });
}

// ── Footer ────────────────────────────────────────────────────────────────────

function _footerHtml() {
  return `
    <footer class="app-footer" style="margin-top:var(--space-12);">
      <div class="footer-brand-wrap">
        <div class="brand-icon-wrap" style="width:24px;height:24px;">
          ${getLogoMarkSvg()}
        </div>
        ${getWordmarkHtml()}
      </div>
      <div class="footer-demo-notice">Demo project built for learning. Portfolio showcase.</div>
      <div>8 Metro Hubs &bull; 12 Vehicles</div>
    </footer>
  `;
}

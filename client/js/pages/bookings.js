/**
 * EasyDrive Bookings Page (pages/bookings.js)
 * Phase 3a: Shows an auth gate when logged out; keeps the Phase 1 placeholder
 * when logged in (Phase 3d will replace it with live booking cards).
 */

import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';
import { isLoggedIn, subscribe as authSubscribe } from '../auth.js';
import { openAuthDialog } from '../components/authDialog.js';

export function renderBookingsPage(container) {
  _render(container);

  // Re-render when auth state changes while this page is mounted
  const unsub = authSubscribe(() => {
    if (document.body.contains(container)) {
      _render(container);
    } else {
      unsub();
    }
  });
}

function _render(container) {
  if (isLoggedIn()) {
    _renderPlaceholder(container);
  } else {
    _renderAuthGate(container);
  }
}

function _renderAuthGate(container) {
  container.innerHTML = `
    <div class="page-fade-in">
      <div style="margin-bottom: var(--space-8);">
        <span style="font-size: var(--text-xs); color: var(--brand); font-weight: 700; text-transform: uppercase;">Trips Manager</span>
        <h1 class="section-title">My Bookings</h1>
        <p style="color: var(--muted); font-size: var(--text-sm);">
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
              Sign In
              <span class="btn-arrow">&rarr;</span>
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

  document.getElementById('bookings-signin-btn')?.addEventListener('click', (e) => {
    openAuthDialog('login', e.currentTarget);
  });
  document.getElementById('bookings-signup-btn')?.addEventListener('click', (e) => {
    openAuthDialog('register', e.currentTarget);
  });
}

function _renderPlaceholder(container) {
  container.innerHTML = `
    <div class="page-fade-in">
      <div style="margin-bottom: var(--space-8);">
        <span style="font-size: var(--text-xs); color: var(--brand); font-weight: 700; text-transform: uppercase;">Trips Manager</span>
        <h1 class="section-title">My Bookings</h1>
        <p style="color: var(--muted); font-size: var(--text-sm);">
          Track upcoming departures, download trip invoices, and manage vehicle returns.
        </p>
      </div>

      <div class="empty-state-card reveal-on-scroll">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h2 style="font-size: var(--text-2xl);">No Active Bookings Yet</h2>
        <p style="color: var(--muted); font-size: var(--text-sm); max-width: 440px;">
          You haven't scheduled any journeys yet. Explore our verified fleet across 8 major Indian cities and hit the road!
        </p>
        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2);">
          <a href="#catalogue" class="btn btn-brand">
            Explore 12 Cars <span class="btn-arrow">&rarr;</span>
          </a>
          <a href="#home" class="btn btn-outline">
            Back to Home
          </a>
        </div>
      </div>

      ${_footerHtml()}
    </div>
  `;
}

function _footerHtml() {
  return `
    <footer class="app-footer" style="margin-top: var(--space-12);">
      <div class="footer-brand-wrap">
        <div class="brand-icon-wrap" style="width: 24px; height: 24px;">
          ${getLogoMarkSvg()}
        </div>
        ${getWordmarkHtml()}
      </div>
      <div class="footer-demo-notice">
        Demo project built for learning. Portfolio showcase.
      </div>
      <div>8 Metro Hubs &bull; 12 Vehicles</div>
    </footer>
  `;
}

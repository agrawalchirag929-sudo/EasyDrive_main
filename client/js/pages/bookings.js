/**
 * EasyDrive Bookings Page Placeholder (pages/bookings.js)
 * -----------------------------------------------------------
 * Clean empty state for Phase 1. In Phase 4, connects to live booking records.
 */

import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';

export function renderBookingsPage(container) {
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

      <!-- Footer -->
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
        <div>
          8 Metro Hubs • 12 Vehicles
        </div>
      </footer>
    </div>
  `;
}

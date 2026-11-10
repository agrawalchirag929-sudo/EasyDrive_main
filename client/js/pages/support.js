/**
 * EasyDrive Support Page (pages/support.js)
 * -----------------------------------------------------------
 * Features:
 * - 3-Card Support Contact Grid (3 cols >=900px, 1 col <900px - No orphans)
 * - Styled FAQ accordion with custom animated chevrons
 * - WCAG AA compliant contrast with var(--brand-text)
 * - Demo project notice
 */

import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';
import { showToast } from '../components/toast.js';

const FAQS = [
  {
    q: 'What documents are required to book a self-drive car?',
    a: 'You need an active Indian Driving Licence (valid for at least 1 year) and an Aadhaar number for identity verification. To protect your privacy, EasyDrive validates your Aadhaar and securely stores ONLY the last 4 digits.'
  },
  {
    q: 'What is included in the driving kilometre allowance?',
    a: 'All rentals include an allowance of 250 km per day. Driving beyond this limit is charged at a transparent nominal rate (₹9 to ₹25/km depending on vehicle tier), billed at vehicle return.'
  },
  {
    q: 'How does the security deposit refund work?',
    a: 'If a refundable security deposit is applicable to your selected car, it is processed back to your original payment method within 24 to 48 hours of vehicle check-in and post-trip inspection.'
  },
  {
    q: 'What should I do in case of a roadside breakdown or flat tire?',
    a: 'All EasyDrive bookings include on-demand 24x7 roadside assistance. You can call our demo helpline at 1800-123-4567 or reach out via WhatsApp from this screen for swift recovery coordination.'
  },
  {
    q: 'What is the cancellation policy?',
    a: 'Cancellation is free until 6 hours before the booking start time directly from the "My Bookings" manager.'
  }
];

export function renderSupportPage(container) {
  container.innerHTML = `
    <div class="page-fade-in">
      <div style="margin-bottom: var(--space-8);">
        <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase;">24x7 Assistance</span>
        <h1 class="section-title">Help & Roadside Support</h1>
        <p style="color: var(--muted); font-size: var(--text-sm);">
          Find answers to common rental questions or connect with our support team across all 8 Indian hubs.
        </p>
      </div>

      <!-- Quick Contact Cards Grid (Strict 3 cols >=900px, 1 col <900px) -->
      <section class="support-cards-container" aria-label="Support channels" style="margin-bottom: var(--space-10);">
        <div class="support-cards-grid">
          <!-- Card 1 -->
          <div class="step-card reveal-on-scroll">
            <div class="step-badge" style="background: rgba(239, 68, 68, 0.12); color: var(--error);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <h3 class="step-title">Emergency Roadside</h3>
            <p class="step-desc">Toll-free emergency recovery and mechanic dispatch across major highways.</p>
            <a href="tel:18001234567" class="btn btn-outline btn-sm" style="margin-top: auto;">
              1800-123-4567 (Demo helpline)
            </a>
          </div>

          <!-- Card 2 -->
          <div class="step-card reveal-on-scroll">
            <div class="step-badge" style="background: var(--brand-light); color: var(--brand-text);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h3 class="step-title">WhatsApp Concierge</h3>
            <p class="step-desc">Quick itinerary updates, extension requests, or pickup point guidance.</p>
            <button type="button" class="btn btn-outline btn-sm" id="whatsapp-demo-btn" style="margin-top: auto;">
              Chat on WhatsApp (Demo)
            </button>
          </div>

          <!-- Card 3 -->
          <div class="step-card reveal-on-scroll">
            <div class="step-badge" style="background: var(--brand-light); color: var(--brand-text);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h3 class="step-title">Customer Support</h3>
            <p class="step-desc">General feedback, billing queries, or invoice assistance.</p>
            <a href="mailto:support@easydrive.demo" class="btn btn-outline btn-sm" style="margin-top: auto;">
              support@easydrive.demo
            </a>
          </div>
        </div>
      </section>

      <!-- Styled FAQ Accordion with Custom Chevrons -->
      <section style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-8);" aria-labelledby="faq-heading">
        <h2 id="faq-heading" style="font-size: var(--text-2xl); margin-bottom: var(--space-2);">Frequently Asked Questions</h2>
        <p style="color: var(--muted); font-size: var(--text-sm); margin-bottom: var(--space-6);">Clear answers to common questions about driving with EasyDrive.</p>
        
        <div class="faq-accordion">
          ${FAQS.map((faq, index) => `
            <details class="faq-item" ${index === 0 ? 'open' : ''}>
              <summary class="faq-summary">
                <span>${faq.q}</span>
                <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <div class="faq-answer">
                ${faq.a}
              </div>
            </details>
          `).join('')}
        </div>
      </section>

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

  document.getElementById('whatsapp-demo-btn')?.addEventListener('click', () => {
    showToast('Demo: WhatsApp helpline simulated.', 'info');
  });
}

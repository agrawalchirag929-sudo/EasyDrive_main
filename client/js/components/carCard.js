/**
 * EasyDrive Car Card Component (carCard.js)
 * -----------------------------------------------------------
 * Renders individual vehicle cards with:
 * - Fixed 16:10 aspect ratio image box
 * - Clean error placeholder: car silhouette + "Photo coming soon" (no repeated name)
 * - Compare icon button + favorite heart button in top-right media actions group
 * - Spec icons (Seats, Transmission, Fuel) & 250 km/day included line
 * - Footer: price + taxes, "Specs" text link, and single primary "Book" button
 * - Zero overlap across viewports (320px to 1920px)
 */

import { getLogoMarkSvg } from './sidebar.js';

/**
 * Returns HTML string for an individual vehicle card.
 * @param {Object} car - Vehicle data object
 * @param {Object} options - State options: { isFavorite, isCompared }
 * @returns {string} HTML markup string
 */
export function renderCarCard(car, { isFavorite = false, isCompared = false } = {}) {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(car.pricePerDay);

  const kmAllowance = car.kmPerDay || 250;
  const extraRate = car.extraKmRate || 12;

  return `
    <article class="car-card reveal-on-scroll" data-car-id="${car.id}">
      <!-- 16:10 Media Header with Fallback Error Placeholder -->
      <div class="car-card-media" id="media-${car.id}">
        <!-- Shimmer Skeleton while loading -->
        <div id="skeleton-${car.id}" class="car-img-skeleton skeleton" aria-hidden="true"></div>

        <!-- Zoom Wrapper (scales on card hover) -->
        <div class="car-img-zoom-wrap">
          <img 
            src="${car.image}" 
            alt="${car.brand} ${car.name}" 
            class="car-card-img" 
            width="800"
            height="500"
            loading="lazy"
            data-car-id="${car.id}"
            onload="window.__handleCarImgLoad && window.__handleCarImgLoad(this, '${car.id}')"
            onerror="window.__handleCarImgError ? window.__handleCarImgError(this, '${car.id}') : (this.style.display='none', document.getElementById('placeholder-${car.id}').style.display='flex')"
          />
        </div>

        <!-- Clean Placeholder: Silhouette + 'Photo coming soon' only -->
        <div id="placeholder-${car.id}" class="car-fallback-placeholder" style="display: none;" aria-hidden="true">
          ${getLogoMarkSvg()}
          <span class="car-fallback-sub">Photo coming soon</span>
        </div>
        
        ${car.badge ? `<span class="car-badge">${car.badge}</span>` : ''}

        <!-- Top-right Action Icons: Compare + Favorite Heart -->
        <div class="car-media-actions">
          <!-- Compare Icon Button -->
          <button 
            type="button" 
            class="compare-icon-btn ${isCompared ? 'active' : ''}" 
            data-action="compare" 
            data-car-id="${car.id}"
            role="checkbox"
            aria-checked="${isCompared ? 'true' : 'false'}"
            aria-label="Compare ${car.brand} ${car.name}"
            title="${isCompared ? 'Remove from comparison' : 'Add to comparison'}"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </button>

          <!-- Favorite Heart Button -->
          <button 
            type="button" 
            class="favorite-btn ${isFavorite ? 'active' : ''}" 
            data-action="favorite" 
            data-car-id="${car.id}"
            aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Card Content -->
      <div class="car-card-body">
        <div class="car-header-row">
          <div>
            <span class="car-brand-name">${car.brand}</span>
            <h3 class="car-model-name">${car.name}</h3>
          </div>
          <div class="car-rating" title="Rated ${(car.rating || 4.8).toFixed(1)} / 5.0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>${(car.rating || 4.8).toFixed(1)}</span>
          </div>
        </div>

        <!-- Specifications Grid -->
        <div class="car-specs-grid">
          <div class="spec-item" title="${car.seats} Passenger Seats">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>${car.seats} Seats</span>
          </div>

          <div class="spec-item" title="${car.transmission} Transmission">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <span>${car.transmission}</span>
          </div>

          <div class="spec-item" title="${car.fuel} • ${car.mileage}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 22h12"></path>
              <path d="M4 9h10"></path>
              <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path>
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path>
            </svg>
            <span>${car.fuel}</span>
          </div>
        </div>

        <!-- Kilometres Allowance Notice -->
        <div class="car-km-allowance">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--brand);">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span><strong>${kmAllowance} km/day</strong> included • ₹${extraRate}/extra km</span>
        </div>

        <!-- Card Footer: Price + taxes, Specs text link, ONE primary Book button -->
        <div class="car-card-footer">
          <div class="car-price-block">
            <span class="car-price-value">${formattedPrice}</span>
            <span class="car-price-unit">per day <span class="tax-note">+ taxes</span></span>
          </div>

          <div class="car-footer-actions">
            <!-- Specs text link -->
            <button 
              type="button" 
              class="specs-link-btn" 
              data-action="quickview" 
              data-car-id="${car.id}"
            >
              Specs
            </button>

            <!-- Primary Book button -->
            <button 
              type="button" 
              class="btn btn-brand btn-sm" 
              data-action="book" 
              data-car-id="${car.id}"
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Opens detailed Quick View modal for a car.
 */
export function openQuickViewModal(car, triggerEl) {
  const MODAL_CONTAINER_ID = 'modal-container';
  let modalContainer = document.getElementById(MODAL_CONTAINER_ID);
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = MODAL_CONTAINER_ID;
    document.body.appendChild(modalContainer);
  }

  const kmAllowance = car.kmPerDay || 250;
  const extraRate = car.extraKmRate || 12;

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="quickview-overlay" role="dialog" aria-modal="true" aria-labelledby="quickview-title">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span style="font-size: var(--text-xs); color: var(--muted); text-transform: uppercase; font-weight: 600;">${car.brand} • ${car.type}</span>
            <h2 id="quickview-title" style="font-size: var(--text-2xl);">${car.name}</h2>
          </div>
          <button type="button" class="modal-close-btn" id="close-quickview-btn" aria-label="Close modal">&times;</button>
        </div>

        <div style="aspect-ratio: 16 / 10; width: 100%; border-radius: var(--radius-md); overflow: hidden; background: var(--car-stage, #F4EFE9); margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: center;">
          <img 
            src="${car.image}" 
            alt="${car.brand} ${car.name}" 
            style="width: 100%; height: 100%; object-fit: contain;"
            onerror="this.style.display='none'; document.getElementById('qv-fallback').style.display='flex';"
          />
          <div id="qv-fallback" class="car-fallback-placeholder" style="display: none; height: 100%;">
            ${getLogoMarkSvg()}
            <span class="car-fallback-sub">Photo coming soon</span>
          </div>
        </div>

        <!-- Photo Credit Notice -->
        <div class="quickview-photo-credit">
          <strong>Photo Credit:</strong> ${car.credit || 'Pending User Upload in client/assets/cars/'}
        </div>

        <!-- Key specs summary -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); margin: var(--space-4) 0;">
          <div style="background: var(--surface-elevated); padding: var(--space-3); border-radius: var(--radius-sm);">
            <div style="font-size: var(--text-xs); color: var(--muted);">Daily Rate</div>
            <div style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--brand-text);">₹${car.pricePerDay.toLocaleString('en-IN')} / day</div>
          </div>
          <div style="background: var(--surface-elevated); padding: var(--space-3); border-radius: var(--radius-sm);">
            <div style="font-size: var(--text-xs); color: var(--muted);">Driving Allowance</div>
            <div style="font-size: var(--text-sm); font-weight: var(--fw-bold); color: var(--text);">${kmAllowance} km/day (₹${extraRate}/extra km)</div>
          </div>
          <div style="background: var(--surface-elevated); padding: var(--space-3); border-radius: var(--radius-sm);">
            <div style="font-size: var(--text-xs); color: var(--muted);">Refundable Security Deposit</div>
            <div style="font-size: var(--text-sm); font-weight: var(--fw-bold); color: var(--text);">₹${car.securityDeposit?.toLocaleString('en-IN') || '3,000'}</div>
          </div>
          <div style="background: var(--surface-elevated); padding: var(--space-3); border-radius: var(--radius-sm);">
            <div style="font-size: var(--text-xs); color: var(--muted);">Fuel & Mileage</div>
            <div style="font-size: var(--text-sm); font-weight: var(--fw-bold); color: var(--text);">${car.fuel} (${car.mileage})</div>
          </div>
        </div>

        <div style="margin-top: var(--space-4);">
          <h4 style="font-size: var(--text-sm); text-transform: uppercase; color: var(--muted); margin-bottom: var(--space-2);">Vehicle Equipment & Features</h4>
          <ul style="list-style: disc; padding-left: 20px; font-size: var(--text-sm); color: var(--text); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 4px;">
            ${car.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top: var(--space-6); display: flex; justify-content: flex-end; gap: var(--space-3);">
          <button type="button" class="btn btn-outline" id="close-quickview-btn2">Close</button>
          <button type="button" class="btn btn-brand" data-action="book" data-car-id="${car.id}">Book This Car</button>
        </div>
      </div>
    </div>
  `;

  const previousActiveElement = triggerEl || document.activeElement;

  const getFocusableElements = () => {
    return Array.from(modalContainer.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
  };

  let isClosed = false;
  const close = () => {
    if (isClosed) return;
    isClosed = true;
    document.removeEventListener('keydown', handleKeyDown);
    modalContainer.innerHTML = '';
    activeQuickViewClose = null;
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };
  activeQuickViewClose = close;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !modalContainer.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !modalContainer.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  document.getElementById('close-quickview-btn')?.addEventListener('click', close);
  document.getElementById('close-quickview-btn2')?.addEventListener('click', close);
  document.getElementById('quickview-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'quickview-overlay') close();
  });

  // Move initial focus to the close button or first focusable element
  const closeBtn = document.getElementById('close-quickview-btn');
  if (closeBtn) {
    closeBtn.focus();
  } else {
    const focusables = getFocusableElements();
    if (focusables.length > 0) focusables[0].focus();
  }
}

let activeQuickViewClose = null;

export function closeQuickViewModal() {
  if (activeQuickViewClose) {
    activeQuickViewClose();
  } else {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }
}

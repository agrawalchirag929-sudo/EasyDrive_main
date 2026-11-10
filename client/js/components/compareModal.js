/**
 * EasyDrive Compare Component & Modal (compareModal.js)
 * -----------------------------------------------------------
 * Smart compare dock and spec matrix modal:
 * - Only visible on Home (#home) and Catalogue (#catalogue) routes
 * - Only visible when 2 or more cars are selected (2+ cars)
 * - Adds at least 120px bottom clearance (.has-compare-dock) to page-wrapper
 * - "Clear" fully resets state and unchecks all active card checkboxes
 * - On mobile, docks cleanly above the mobile bottom nav
 */

import { getState, clearCompare } from '../state.js';
import { showToast } from './toast.js';

const COMPARE_DOCK_ID = 'compare-dock-container';
const MODAL_CONTAINER_ID = 'modal-container';

/**
 * Updates or renders the floating dock.
 * Condition: Only on #home or #catalogue, and only when 2+ cars are selected.
 */
export function updateCompareDock() {
  const { compareList, currentRoute } = getState();
  let dockContainer = document.getElementById(COMPARE_DOCK_ID);
  if (!dockContainer) {
    dockContainer = document.createElement('div');
    dockContainer.id = COMPARE_DOCK_ID;
    document.body.appendChild(dockContainer);
  }

  const pageWrapper = document.getElementById('main-content');
  const isAllowedRoute = currentRoute === '#home' || currentRoute === '#catalogue' || currentRoute === '';

  // Only show when 2+ cars selected and on Home/Catalogue
  if (!isAllowedRoute || compareList.length < 2) {
    dockContainer.innerHTML = '';
    pageWrapper?.classList.remove('has-compare-dock');
    return;
  }

  // Add 140px bottom padding so compare bar never covers cards or footer
  pageWrapper?.classList.add('has-compare-dock');

  dockContainer.innerHTML = `
    <aside class="compare-dock" role="region" aria-label="Vehicle comparison dock">
      <span class="compare-dock-text">Comparing ${compareList.length} of 3 cars</span>
      <button type="button" class="btn btn-brand btn-sm" id="open-compare-btn">
        View Comparison
      </button>
      <button type="button" class="btn btn-ghost btn-sm" id="clear-compare-btn" title="Clear selection">
        &times; Clear
      </button>
    </aside>
  `;

  document.getElementById('open-compare-btn')?.addEventListener('click', openCompareModal);
  
  // Full reset: clears state and unchecks every compare button/checkbox in the view
  document.getElementById('clear-compare-btn')?.addEventListener('click', () => {
    clearCompare();
    document.querySelectorAll('.compare-icon-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    });
    document.querySelectorAll('input[data-action="compare"]').forEach(cb => {
      cb.checked = false;
    });
    pageWrapper?.classList.remove('has-compare-dock');
    showToast('Comparison cleared', 'info');
  });
}

/**
 * Opens comparison modal comparing 2 or 3 selected cars side-by-side.
 */
export function openCompareModal() {
  const { compareList, cars } = getState();
  if (compareList.length < 2) {
    showToast('Select at least 2 cars to compare specs', 'info');
    return;
  }

  const selectedCars = cars.filter(c => compareList.includes(c.id));
  let modalContainer = document.getElementById(MODAL_CONTAINER_ID);
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = MODAL_CONTAINER_ID;
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="compare-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
      <div class="modal-content" style="max-width: 880px;">
        <div class="modal-header">
          <div>
            <span style="font-size: var(--text-xs); color: var(--brand); text-transform: uppercase; font-weight: 700;">Side-by-Side Specs</span>
            <h2 id="compare-modal-title" style="font-size: var(--text-2xl);">Vehicle Comparison</h2>
          </div>
          <button type="button" class="modal-close-btn" id="close-modal-btn" aria-label="Close modal">&times;</button>
        </div>

        <div style="overflow-x: auto;">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                ${selectedCars.map(car => `
                  <th style="min-width: 190px;">
                    <div style="aspect-ratio: 16 / 10; width: 100%; max-width: 170px; border-radius: var(--radius-sm); overflow: hidden; background: var(--car-stage, #F4EFE9); margin-bottom: var(--space-2); display: flex; align-items: center; justify-content: center;">
                      <img src="${car.image}" alt="${car.brand} ${car.name}" style="width: 100%; height: 100%; object-fit: contain;" />
                    </div>
                    <div style="font-weight: var(--fw-bold); font-size: var(--text-base); color: var(--text);">${car.brand} ${car.name}</div>
                    <div style="color: var(--brand); font-size: var(--text-xs);">${car.type}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Daily Rate</th>
                ${selectedCars.map(car => `
                  <td><strong style="color: var(--brand); font-size: var(--text-lg);">₹${car.pricePerDay.toLocaleString('en-IN')}</strong> / day</td>
                `).join('')}
              </tr>
              <tr>
                <th>Driving Allowance</th>
                ${selectedCars.map(car => `
                  <td><strong>${car.kmPerDay || 250} km/day</strong><br /><span style="font-size: 11px; color: var(--muted);">(₹${car.extraKmRate || 12}/extra km)</span></td>
                `).join('')}
              </tr>
              <tr>
                <th>Seating Capacity</th>
                ${selectedCars.map(car => `
                  <td>${car.seats} Passengers</td>
                `).join('')}
              </tr>
              <tr>
                <th>Fuel & Range</th>
                ${selectedCars.map(car => `
                  <td>${car.fuel} (${car.mileage})</td>
                `).join('')}
              </tr>
              <tr>
                <th>Transmission</th>
                ${selectedCars.map(car => `
                  <td>${car.transmission}</td>
                `).join('')}
              </tr>
              <tr>
                <th>Security Deposit</th>
                ${selectedCars.map(car => `
                  <td>₹${car.securityDeposit?.toLocaleString('en-IN') || '3,000'} (Refundable)</td>
                `).join('')}
              </tr>
              <tr>
                <th>User Rating</th>
                ${selectedCars.map(car => `
                  <td>★ ${(car.rating || 4.8).toFixed(1)} / 5.0</td>
                `).join('')}
              </tr>
              <tr>
                <th>Features</th>
                ${selectedCars.map(car => `
                  <td>
                    <ul style="list-style: disc; padding-left: 18px; font-size: 11px; color: var(--muted);">
                      ${car.features.slice(0, 4).map(f => `<li>${f}</li>`).join('')}
                    </ul>
                  </td>
                `).join('')}
              </tr>
              <tr>
                <th>Action</th>
                ${selectedCars.map(car => `
                  <td>
                    <button type="button" class="btn btn-brand btn-sm" data-action="book" data-car-id="${car.id}">
                      Book Now
                    </button>
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const previousActiveElement = document.activeElement;

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
    activeCompareClose = null;
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };
  activeCompareClose = close;

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

  document.getElementById('close-modal-btn')?.addEventListener('click', close);
  document.getElementById('compare-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'compare-modal-overlay') close();
  });

  // Move initial focus to the close button or first focusable element
  const closeBtn = document.getElementById('close-modal-btn');
  if (closeBtn) {
    closeBtn.focus();
  } else {
    const focusables = getFocusableElements();
    if (focusables.length > 0) focusables[0].focus();
  }
}

let activeCompareClose = null;

export function closeCompareModal() {
  if (activeCompareClose) {
    activeCompareClose();
  } else {
    const modalContainer = document.getElementById(MODAL_CONTAINER_ID);
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }
}

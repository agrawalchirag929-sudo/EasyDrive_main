/**
 * EasyDrive Main Application Orchestrator (app.js)
 * -----------------------------------------------------------
 * Root entry point for the frontend SPA:
 * - Bootstraps design tokens and system/stored theme settings
 * - Loads 12-car fleet from the backend API (GET /api/cars)
 * - Mounts persistent sidebar & mobile navigation
 * - Initializes client-side hash router
 * - Global event delegation: Quick View modal, Compare toggles, Favorites
 */

import { getState, setTheme, setCars, toggleFavorite, toggleCompare, subscribe } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { initRouter } from './router.js';
import { updateCompareDock } from './components/compareModal.js';
import { openQuickViewModal } from './components/carCard.js';
import { showToast } from './components/toast.js';
import { initInteractionEffects } from './effects.js';
import { restoreSession } from './auth.js';
import { fetchCars } from './api.js';

/**
 * Initializes the EasyDrive application.
 */
async function initApp() {
  // 1. Initialize Theme (system preference or localStorage)
  const { theme } = getState();
  setTheme(theme);

  // 2. Restore auth session — validate stored token with the API before
  //    rendering the sidebar so isLoggedIn() returns the correct value
  //    immediately (avoids a logged-in flash of the "Sign In" button).
  await restoreSession();

  // 3. Mount persistent sidebar and mobile navigation
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    renderSidebar(sidebarContainer);
  }

  // 4. Load fleet from backend API (Phase 3b)
  //    fetchCars() with no filters returns the full active fleet.
  //    On error, state.cars stays [] so skeleton loaders keep showing
  //    and each page renders its own error state with a Retry button.
  try {
    const cars = await fetchCars();
    setCars(cars);
  } catch (err) {
    if (err && err.name !== 'AbortError') {
      console.error('[EasyDrive] Failed to load fleet from API:', err.message);
      setCars([]); // keep state clean; pages will show their error UI
    }
  }

  // 5. Initialize client-side router
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    initRouter(mainContent);
  }

  // 6. Initial compare dock check
  updateCompareDock();

  // 7. Subscribe to state changes for UI synchronization
  subscribe((state, changeType) => {
    if (changeType === 'COMPARE_UPDATED' || changeType === 'ROUTE_CHANGED') {
      updateCompareDock();
    }
  });

  // 8. Register Global Event Delegation
  registerGlobalEvents();

  // 9. Initialize Phase 1j Interaction Effects
  initInteractionEffects();
}

/**
 * Global event listener using event delegation.
 */
function registerGlobalEvents() {
  document.addEventListener('click', async (e) => {
    // 1. Quick View Modal Trigger
    const qvBtn = e.target.closest('[data-action="quickview"]');
    if (qvBtn) {
      e.preventDefault();
      const carId = qvBtn.getAttribute('data-car-id');
      const { cars } = getState();
      const car = cars.find(c => c.id === carId);
      if (car) {
        openQuickViewModal(car, qvBtn);
      }
      return;
    }

    // 2. Favorite Heart Button
    const favBtn = e.target.closest('[data-action="favorite"]');
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      const carId = favBtn.getAttribute('data-car-id');
      const isFav = toggleFavorite(carId);

      favBtn.classList.toggle('active', isFav);
      const svgPath = favBtn.querySelector('path');
      if (svgPath) {
        favBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
      }

      showToast(
        isFav ? 'Added vehicle to your favorites!' : 'Removed from favorites',
        'info',
        2000
      );
      return;
    }

    // 3. Compare Icon Button
    const compareBtn = e.target.closest('[data-action="compare"]');
    if (compareBtn) {
      e.preventDefault();
      e.stopPropagation();
      const carId = compareBtn.getAttribute('data-car-id');
      const result = toggleCompare(carId);

      if (!result.success) {
        showToast(result.message, 'warning', 3200);
      } else {
        const isNowCompared = result.action === 'added';
        compareBtn.classList.toggle('active', isNowCompared);
        compareBtn.setAttribute('aria-checked', isNowCompared ? 'true' : 'false');
        if (isNowCompared) {
          showToast(`Vehicle added to comparison (${result.count}/3)`, 'info', 1800);
        } else {
          showToast(`Vehicle removed from comparison (${result.count}/3)`, 'info', 1800);
        }
      }
      return;
    }

    // 4. "Book" Button — requires sign-in; opens booking modal (Phase 3c)
    const bookBtn = e.target.closest('[data-action="book"]');
    if (bookBtn) {
      const { isLoggedIn } = await import('./auth.js');
      if (!isLoggedIn()) {
        const { openAuthDialog } = await import('./components/authDialog.js');
        openAuthDialog('login', bookBtn);
        return;
      }
      const carId = bookBtn.getAttribute('data-car-id');
      const { cars } = getState();
      const car = cars.find(c => c.id === carId);
      if (!car) {
        showToast('Car details not available. Please refresh and try again.', 'warning', 3000);
        return;
      }
      const { openBookingModal } = await import('./components/bookingModal.js');
      openBookingModal(car, bookBtn);
      return;
    }
  });

  // Backward compatible change listener if any input checkboxes are used
  document.addEventListener('change', (e) => {
    if (e.target && e.target.getAttribute('data-action') === 'compare') {
      const carId = e.target.getAttribute('data-car-id');
      const result = toggleCompare(carId);

      if (!result.success) {
        e.target.checked = false;
        showToast(result.message, 'warning', 3200);
      } else {
        if (result.action === 'added') {
          showToast(`Vehicle added to comparison (${result.count}/3)`, 'info', 1800);
        } else {
          showToast(`Vehicle removed from comparison (${result.count}/3)`, 'info', 1800);
        }
      }
    }
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

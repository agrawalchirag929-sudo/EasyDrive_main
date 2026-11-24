/**
 * EasyDrive Main Application Orchestrator (app.js)
 * -----------------------------------------------------------
 * Root entry point for the frontend SPA:
 * - Bootstraps design tokens and system/stored theme settings
 * - Loads 12-car fleet data from assets/cars.json
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

  // 4. Load fleet data (12 Indian cars)
  try {
    const response = await fetch('./assets/cars.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const carsData = await response.json();
    setCars(carsData);
  } catch (error) {
    console.error('Failed to load fleet data:', error);
    showToast('Failed to load vehicle catalogue. Please check file server.', 'error');
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
  document.addEventListener('click', (e) => {
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

    // 4. "Book" Button — requires sign-in (Phase 3a gate)
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
      const carName = car ? `${car.brand} ${car.name}` : 'Selected vehicle';

      showToast(
        `Selected ${carName}. Full booking flow connects in Phase 3b!`,
        'success',
        3500
      );
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

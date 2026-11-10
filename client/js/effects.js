/**
 * EasyDrive Interaction Effects Runtime (js/effects.js)
 * -----------------------------------------------------------
 * Implements scripts for Phase 1j interaction effects:
 * 1. Card Spotlight (tracks pointermove on car cards and sets --mx, --my)
 * 2. Sticky Filter Bar Sentinel Observer (for Catalogue >= 900px, toggles .is-stuck past 6px scroll)
 * 3. Image Fade-In & Cached Image Check (manages skeleton visibility and loaded class)
 * 4. Button Arrow wrapper helper
 */

import { subscribe } from './state.js';

let stickyObserver = null;

/**
 * Initializes all interaction effects.
 */
export function initInteractionEffects() {
  initCardSpotlight();
  initImageHandlers();
  initButtonArrows();
  initStickyFilterBar();

  // Re-run checks on state / route transitions
  subscribe((state, changeType) => {
    if (changeType === 'ROUTE_CHANGED') {
      setTimeout(() => {
        initImageHandlers();
        initButtonArrows();
        initStickyFilterBar();
      }, 50);
    }
  });

  // Also handle resize for sticky filter bar (>= 900px only)
  window.addEventListener('resize', () => {
    initStickyFilterBar();
  }, { passive: true });
}

/**
 * 1. Card Spotlight: pointermove tracks cursor within .car-card
 */
export function initCardSpotlight() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.car-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
  }, { passive: true });
}

/**
 * 3. Image Fade-In:
 * - Checks cached images immediately (no transition)
 * - Sets up global image load & error listeners
 */
export function initImageHandlers(container = document) {
  const images = container.querySelectorAll('.car-card-img');
  images.forEach(img => {
    const cardId = img.getAttribute('data-car-id') || img.closest('.car-card')?.getAttribute('data-car-id');
    const skeleton = cardId ? document.getElementById(`skeleton-${cardId}`) : null;

    if (img.complete && img.naturalWidth > 0) {
      if (skeleton) skeleton.style.display = 'none';
      img.classList.remove('is-loading');
      img.classList.add('instant-loaded');
    } else {
      img.classList.add('is-loading');
    }
  });

  // Failsafe: after 600ms at most, ensure any loaded image clears skeleton and loading state
  setTimeout(() => {
    images.forEach(img => {
      const cardId = img.getAttribute('data-car-id') || img.closest('.car-card')?.getAttribute('data-car-id');
      const skeleton = cardId ? document.getElementById(`skeleton-${cardId}`) : null;
      if (img.complete && img.naturalWidth > 0) {
        if (skeleton) skeleton.style.display = 'none';
        img.classList.remove('is-loading');
        img.classList.add('instant-loaded');
      }
    });
  }, 600);
}

// Global window hooks used by onload / onerror inline handlers in carCard.js
window.__handleCarImgLoad = function(img, carId) {
  const skeleton = document.getElementById(`skeleton-${carId}`);
  if (skeleton) {
    skeleton.style.display = 'none';
  }
  img.classList.remove('is-loading');
  img.classList.add('loaded');
};

window.__handleCarImgError = function(img, carId) {
  const skeleton = document.getElementById(`skeleton-${carId}`);
  if (skeleton) {
    skeleton.style.display = 'none';
  }
  img.style.display = 'none';
  const placeholder = document.getElementById(`placeholder-${carId}`);
  if (placeholder) {
    placeholder.style.display = 'flex';
  }
};

/**
 * 4. Button Arrow: wraps existing arrows in <span class="btn-arrow">
 * Nudges arrow 4px to the right on hover without adding arrows to other buttons.
 */
export function initButtonArrows(container = document) {
  const buttons = container.querySelectorAll('.btn');
  buttons.forEach(btn => {
    // If it already has .btn-arrow, skip
    if (btn.querySelector('.btn-arrow')) return;

    // Check if innerHTML contains &rarr; or →
    const html = btn.innerHTML;
    if (html.includes('&rarr;')) {
      btn.innerHTML = html.replace('&rarr;', '<span class="btn-arrow">&rarr;</span>');
    } else if (html.includes('→')) {
      btn.innerHTML = html.replace('→', '<span class="btn-arrow">→</span>');
    }
  });
}

/**
 * 5. Sticky Filter Bar:
 * Watches #catalogue-sentinel on Catalogue page when screen width >= 900px.
 * Toggles .is-stuck when scrolled more than 6px.
 */
export function initStickyFilterBar() {
  const sentinel = document.getElementById('catalogue-sentinel');
  const stickyBar = document.getElementById('catalogue-sticky-filter-bar');

  if (stickyObserver) {
    stickyObserver.disconnect();
    stickyObserver = null;
  }

  if (!sentinel || !stickyBar) return;

  if (window.innerWidth < 900) {
    stickyBar.classList.remove('is-stuck');
    return;
  }

  stickyObserver = new IntersectionObserver(
    ([entry]) => {
      // If sentinel has scrolled out of view past top by > 6px
      if (!entry.isIntersecting) {
        stickyBar.classList.add('is-stuck');
      } else {
        stickyBar.classList.remove('is-stuck');
      }
    },
    {
      root: null,
      threshold: 0,
      rootMargin: '-6px 0px 0px 0px'
    }
  );

  stickyObserver.observe(sentinel);

  // Initial check on load/mount
  const rect = sentinel.getBoundingClientRect();
  if (rect.bottom < 6) {
    stickyBar.classList.add('is-stuck');
  } else {
    stickyBar.classList.remove('is-stuck');
  }
}

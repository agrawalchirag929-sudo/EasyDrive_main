/**
 * EasyDrive Client-Side Hash Router (router.js)
 * -----------------------------------------------------------
 * Implements a lightweight Single-Page Application (SPA) routing mechanism:
 * - Listens for 'hashchange' and 'load' events
 * - Dynamically mounts page view components into the main container
 * - Manages scroll restoration and page-transition animations
 * - Observes scroll-reveal micro-interactions
 *
 * Beginners note for interviews:
 * Hash routing (#home, #catalogue) is ideal for static hosting and SPAs
 * because hashes are never sent to the server in HTTP requests, avoiding
 * 404 errors without requiring specialized server URL rewrite rules.
 */

import { setCurrentRoute } from './state.js';
import { updateActiveNav } from './components/sidebar.js';
import { renderHomePage } from './pages/home.js';
import { renderCataloguePage } from './pages/catalogue.js';
import { renderBookingsPage } from './pages/bookings.js';
import { renderSupportPage } from './pages/support.js';

// Route registry mapping hash patterns to page render functions
const ROUTES = {
  '#home': renderHomePage,
  '#catalogue': renderCataloguePage,
  '#bookings': renderBookingsPage,
  '#support': renderSupportPage
};

let mainContentContainer = null;
let scrollObserver = null;

/**
 * Initializes the client-side router.
 * @param {HTMLElement} container - The DOM node where page contents are injected
 */
export function initRouter(container) {
  mainContentContainer = container;

  // Listen for hash change events
  window.addEventListener('hashchange', handleRouteChange);

  // Initial route handle on page boot
  handleRouteChange();
}

/**
 * Parses current location.hash and invokes the matching page renderer.
 */
function handleRouteChange() {
  let hash = window.location.hash.toLowerCase().trim();

  // Default route fallback to '#home'
  if (!hash || hash === '#' || !ROUTES[hash]) {
    hash = '#home';
    if (window.location.hash !== '#home') {
      window.location.hash = '#home';
      return;
    }
  }

  // Update global state & sidebar active indicators
  setCurrentRoute(hash);
  updateActiveNav(hash);

  // Invoke corresponding page renderer
  const renderPage = ROUTES[hash];
  if (renderPage && mainContentContainer) {
    // Clear existing content and render new view
    mainContentContainer.innerHTML = '';
    renderPage(mainContentContainer);

    // Reset scroll to top without animation on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Re-initialize scroll-reveal intersection observers
    initScrollReveal();
  }
}

/**
 * Sets up IntersectionObserver for scroll-reveal animations.
 * Respects user's prefers-reduced-motion preference.
 */
export function initScrollReveal(container = document) {
  // If user prefers reduced motion, elements are already visible via CSS
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    container.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));
    return;
  }

  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  scrollObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: '0px 0px 50px 0px'
    }
  );

  const targets = container.querySelectorAll('.reveal-on-scroll:not(.revealed)');
  targets.forEach(el => {
    scrollObserver.observe(el);
  });

  // Failsafe: anything hidden for a reveal animation becomes visible after 600ms at most
  setTimeout(() => {
    container.querySelectorAll('.reveal-on-scroll:not(.revealed)').forEach(el => {
      el.classList.add('revealed');
    });
  }, 600);
}

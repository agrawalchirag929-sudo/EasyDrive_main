/**
 * EasyDrive Catalogue Page (pages/catalogue.js) — Phase 3b
 * -----------------------------------------------------------
 * Loads cars from GET /api/cars with server-side filtering:
 *   city, category, q (search), sort (featured|price_asc|price_desc)
 *
 * UX behaviour:
 *   - First load: skeleton loaders shown while API request is in-flight.
 *   - Filter changes: existing cards dimmed (opacity 0.4) until new results arrive.
 *   - Each new filter request cancels any pending one (AbortController).
 *   - Search box debounced ~300 ms.
 *   - API error → friendly error card with Retry button.
 *   - Count text, empty state, sticky filter bar, and all effects preserved.
 *
 * Does NOT touch: booking form, Bookings page (3c/3d).
 */

import { getState, updateFilters, setCars } from '../state.js';
import { renderCarCard } from '../components/carCard.js';
import { renderCarSkeleton } from '../components/skeleton.js';
import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';
import { initScrollReveal } from '../router.js';
import { initImageHandlers } from '../effects.js';
import { fetchCars, ApiError } from '../api.js';

const CITIES = [
  'All',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad'
];

const CATEGORIES = ['All', 'Hatchback', 'Sedan', 'SUV', 'MPV', 'EV', 'Luxury'];

// Module-level AbortController for in-flight catalogue requests.
let _abortController = null;

/**
 * Map catalogue filter state to the API query format.
 * State uses { type, searchQuery, sortBy } while the API uses { category, q, sort }.
 * Sort values: state uses 'price-asc'/'price-desc'; API accepts both 'price_asc' and 'price-asc'.
 */
function filtersToApiParams(filters) {
  return {
    city:     filters.city     || 'All',
    category: filters.type     || 'All',
    q:        filters.searchQuery || '',
    sort:     filters.sortBy   || 'featured',
  };
}

/** Escape HTML attribute values. */
function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

/** Build the sticky filter bar HTML. */
function buildFilterBarHtml(filters) {
  return `
    <!-- Category Pills (All, Hatchback, Sedan, SUV, MPV, EV, Luxury) -->
    <div class="filter-pills-row" role="tablist" aria-label="Car Category Filter">
      ${CATEGORIES.map(cat => `
        <button
          type="button"
          class="filter-pill ${filters.type === cat || (cat === 'All' && (!filters.type || filters.type === 'All')) ? 'active' : ''}"
          data-category="${cat}"
          role="tab"
          aria-selected="${filters.type === cat || (cat === 'All' && (!filters.type || filters.type === 'All'))}"
        >
          ${cat}
        </button>
      `).join('')}
    </div>

    <!-- Filter Controls Bar with Unclipped Dropdowns -->
    <div class="catalogue-controls-bar">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          id="catalogue-search-input"
          class="form-control"
          placeholder="Search by brand or model (e.g. Swift, Creta, Thar, EV)..."
          value="${escapeAttr(filters.searchQuery)}"
          aria-label="Search cars"
        />
      </div>

      <!-- City Dropdown -->
      <div class="filter-dropdown-group">
        <label for="catalogue-city-select">City:</label>
        <select id="catalogue-city-select" class="form-control" aria-label="Filter by city">
          ${CITIES.map(c => `
            <option value="${c}" ${filters.city === c ? 'selected' : ''}>${c === 'All' ? 'All Cities' : c}</option>
          `).join('')}
        </select>
      </div>

      <!-- Sort Dropdown -->
      <div class="filter-dropdown-group">
        <label for="catalogue-sort-select">Sort:</label>
        <select id="catalogue-sort-select" class="form-control" aria-label="Sort cars">
          <option value="featured"   ${filters.sortBy === 'featured'   ? 'selected' : ''}>Featured First</option>
          <option value="price-asc"  ${filters.sortBy === 'price-asc'  ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-desc" ${filters.sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
          <option value="rating"     ${filters.sortBy === 'rating'     ? 'selected' : ''}>Top Rated</option>
        </select>
      </div>
    </div>
  `;
}

/** Render an error card with a Retry button. */
function renderErrorCard(message) {
  return `
    <div class="empty-state-card reveal-on-scroll revealed"
         style="grid-column: 1 / -1; text-align: center; padding: var(--space-10) var(--space-4);"
         role="alert" aria-live="assertive">
      <div class="empty-state-icon" style="margin: 0 auto var(--space-3); width: 48px; height: 48px; color: var(--error, #EF4444);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 style="font-size: var(--text-xl); margin-bottom: var(--space-2);">We couldn't load the cars</h3>
      <p style="color: var(--muted); font-size: var(--text-sm); max-width: 440px; margin: 0 auto var(--space-4);">
        ${message || 'Could not reach the API. Please make sure the server is running.'}
      </p>
      <button type="button" class="btn btn-brand btn-sm" id="catalogue-retry-btn">
        Retry
      </button>
    </div>
  `;
}

/** Render empty-search state. */
function renderEmptyState() {
  return `
    <div class="empty-state-card reveal-on-scroll revealed"
         style="grid-column: 1 / -1; text-align: center; padding: var(--space-10) var(--space-4);">
      <div class="empty-state-icon" style="margin: 0 auto var(--space-3); width: 48px; height: 48px; color: var(--muted);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      </div>
      <h3 style="font-size: var(--text-xl); margin-bottom: var(--space-2);">No vehicles match your search</h3>
      <p style="color: var(--muted); font-size: var(--text-sm); max-width: 440px; margin: 0 auto var(--space-4);">
        No vehicles match your filters. Try a different city, category, or clear the filters.
      </p>
      <button type="button" class="btn btn-brand btn-sm" id="reset-catalogue-filters-btn">
        Clear filters
      </button>
    </div>
  `;
}

export function renderCataloguePage(container) {
  const { filters } = getState();

  container.innerHTML = `
    <div class="page-fade-in">
      <div class="catalogue-header">
        <div>
          <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase;">Fleet Selection</span>
          <h1 class="section-title" style="margin-top: 4px;">Explore All Vehicles</h1>
          <p style="color: var(--muted); font-size: var(--text-sm);">
            Showing <strong id="car-results-count" style="color: var(--text);">—</strong> <span id="car-results-noun">vehicles</span> ready for booking across 8 cities.
          </p>
        </div>

        <!-- Sentinel to observe when filter bar scrolls past top -->
        <div id="catalogue-sentinel" class="catalogue-sticky-sentinel" aria-hidden="true"></div>

        <!-- Sticky Filter Bar (>= 900px only) -->
        <div class="catalogue-sticky-filter-bar" id="catalogue-sticky-filter-bar">
          ${buildFilterBarHtml(filters)}
        </div>
      </div>

      <!-- Car Grid Container -->
      <div id="catalogue-grid-container">
        <!-- Rendered via _renderGrid() -->
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

  attachCatalogueListeners(container);
  // Fire the first API load — show skeleton until it resolves
  _loadCars(container, { isFirstLoad: true });
}

/**
 * Core function: cancel any in-flight request, optionally dim the grid,
 * fetch from the API, then render the result or an error card.
 *
 * @param {HTMLElement} container - The page container element
 * @param {{ isFirstLoad?: boolean }} opts
 */
async function _loadCars(container, { isFirstLoad = false } = {}) {
  // Cancel previous request if still in-flight
  if (_abortController) {
    _abortController.abort();
  }
  _abortController = new AbortController();
  const { signal } = _abortController;

  const gridContainer = container.querySelector('#catalogue-grid-container');
  if (!gridContainer) return;

  if (isFirstLoad) {
    // Show skeleton loaders on first load
    gridContainer.innerHTML = `<div class="car-grid">${renderCarSkeleton(6)}</div>`;
  } else {
    // Dim existing cards without replacing them (keeps layout stable)
    const existingGrid = gridContainer.querySelector('.car-grid');
    if (existingGrid) {
      existingGrid.style.opacity = '0.4';
      existingGrid.style.pointerEvents = 'none';
      existingGrid.style.transition = 'opacity 150ms ease';
    }
  }

  const { filters } = getState();
  const apiParams = filtersToApiParams(filters);

  let cars;
  try {
    cars = await fetchCars(apiParams, { signal });
  } catch (err) {
    if (err && err.name === 'AbortError') return; // superseded by newer request — ignore
    console.error('[EasyDrive] Catalogue fetch failed:', err.message);
    gridContainer.innerHTML = `<div class="car-grid">${renderErrorCard(err.message)}</div>`;
    _updateCountText(container, null); // show "—" in count
    _wireRetryButton(container);
    return;
  }

  // Store the full fleet in state so Compare, Quick View, and Home all work
  setCars(cars);

  _renderGrid(container, cars);
}

/** Re-render the grid with the given car list (called after a successful fetch). */
function _renderGrid(container, cars) {
  const { favorites, compareList } = getState();
  const gridContainer = container.querySelector('#catalogue-grid-container');
  if (!gridContainer) return;

  _updateCountText(container, cars.length);

  if (cars.length === 0) {
    gridContainer.innerHTML = `<div class="car-grid">${renderEmptyState()}</div>`;
    _wireResetButton(container);
    return;
  }

  gridContainer.innerHTML = `
    <div class="car-grid">
      ${cars.map(car => renderCarCard(car, {
        isFavorite: favorites.has(car.id),
        isCompared: compareList.includes(car.id)
      })).join('')}
    </div>
  `;

  // Immediately mark cards as revealed (no flash of invisible content)
  gridContainer.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));

  initImageHandlers(gridContainer);
  initScrollReveal(gridContainer);

  _wireResetButton(container);
}

/** Update the "Showing N vehicles" counter. Pass null to show "—". */
function _updateCountText(container, count) {
  const countEl = container.querySelector('#car-results-count');
  const nounEl  = container.querySelector('#car-results-noun');
  if (countEl) countEl.textContent = count === null ? '—' : count;
  if (nounEl)  nounEl.textContent  = count === 1 ? 'vehicle' : 'vehicles';
}

/** Wire the "Clear filters" button in the empty-state card. */
function _wireResetButton(container) {
  const btn = container.querySelector('#reset-catalogue-filters-btn');
  btn?.addEventListener('click', () => {
    updateFilters({ city: 'All', type: 'All', searchQuery: '', sortBy: 'featured' });
    const searchInput = container.querySelector('#catalogue-search-input');
    if (searchInput) searchInput.value = '';
    _syncFilterControls(container);
    _loadCars(container);
  });
}

/** Wire the "Retry" button in the error card. */
function _wireRetryButton(container) {
  const btn = container.querySelector('#catalogue-retry-btn');
  btn?.addEventListener('click', () => _loadCars(container, { isFirstLoad: true }));
}

/**
 * Synchronise pill active states and dropdown values to match current filter state.
 * Called after a programmatic filter reset so the UI stays in sync.
 */
function _syncFilterControls(container) {
  const { filters } = getState();

  // Pills
  container.querySelectorAll('.filter-pill').forEach(pill => {
    const cat = pill.getAttribute('data-category');
    const isActive = filters.type === cat || (cat === 'All' && (!filters.type || filters.type === 'All'));
    pill.classList.toggle('active', isActive);
    pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const citySelect = container.querySelector('#catalogue-city-select');
  if (citySelect) citySelect.value = filters.city || 'All';

  const sortSelect = container.querySelector('#catalogue-sort-select');
  if (sortSelect) sortSelect.value = filters.sortBy || 'featured';
}

function attachCatalogueListeners(container) {
  // Category pills
  container.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const category = pill.getAttribute('data-category');
      updateFilters({ type: category });
      _syncFilterControls(container);
      _loadCars(container);
    });
  });

  // City dropdown
  const citySelect = container.querySelector('#catalogue-city-select');
  citySelect?.addEventListener('change', (e) => {
    updateFilters({ city: e.target.value });
    _loadCars(container);
  });

  // Sort dropdown
  const sortSelect = container.querySelector('#catalogue-sort-select');
  sortSelect?.addEventListener('change', (e) => {
    updateFilters({ sortBy: e.target.value });
    _loadCars(container);
  });

  // Search — debounced 300 ms
  const searchInput = container.querySelector('#catalogue-search-input');
  let _debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      updateFilters({ searchQuery: e.target.value });
      _loadCars(container);
    }, 300);
  });
}

// ── Legacy exports kept for backward compatibility ────────────────────────────
// home.js and app.js used getFilteredCars() / updateCatalogueGrid() previously;
// they now read from state directly (setCars keeps state current after each fetch).

/**
 * @deprecated — catalogue now fetches from the API.
 * Kept so any module that imported getFilteredCars still compiles.
 */
export function getFilteredCars() {
  const { cars, filters } = getState();
  return cars; // server already filtered; just return what we have
}

/**
 * @deprecated — Use _loadCars() internally. Left for external callers.
 */
export function updateCatalogueGrid(container = document) {
  const resolved = container === document
    ? document.getElementById('catalogue-grid-container')?.closest('.page-fade-in')?.parentElement
    : container;
  if (resolved) _renderGrid(resolved, getState().cars);
}

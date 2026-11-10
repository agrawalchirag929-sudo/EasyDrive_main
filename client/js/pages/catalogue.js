/**
 * EasyDrive Catalogue Page (pages/catalogue.js)
 * -----------------------------------------------------------
 * Displays full 12-car fleet with client-side filtering:
 * - Categories: All, Hatchback, Sedan, SUV, MPV, EV, Luxury
 * - Multi-city availability: checks car.cities array
 * - Keyword search across brand and model (case-insensitive, trimmed)
 * - Singular / plural grammar ("Showing 1 vehicle" / "Showing 12 vehicles")
 * - Unclipped City & Sort dropdown controls
 * - Short empty state message with "Clear filters" button restoring all 12
 * - Re-initializes effects and scroll-reveal observer on every filter update
 */

import { getState, updateFilters } from '../state.js';
import { renderCarCard } from '../components/carCard.js';
import { renderCarSkeleton } from '../components/skeleton.js';
import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';
import { initScrollReveal } from '../router.js';
import { initImageHandlers } from '../effects.js';

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

export function getFilteredCars() {
  const { cars, filters } = getState();

  return cars.filter(car => {
    // City match
    if (filters.city && filters.city !== 'All') {
      if (Array.isArray(car.cities)) {
        if (!car.cities.includes(filters.city)) return false;
      } else if (car.city !== filters.city) {
        return false;
      }
    }

    // Category match
    if (filters.type && filters.type !== 'All') {
      if (car.type.toLowerCase() !== filters.type.toLowerCase()) return false;
    }

    // Keyword search match (brand and model, case-insensitive, trimmed)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      const brand = (car.brand || '').toLowerCase();
      const model = (car.name || '').toLowerCase();
      const type = (car.type || '').toLowerCase();
      const full = `${brand} ${model}`;

      const matchBrand = brand.includes(q);
      const matchModel = model.includes(q);
      const matchFull = full.includes(q);
      const matchType = type.includes(q);

      const words = q.split(/\s+/).filter(Boolean);
      const matchAllWords = words.length > 1 && words.every(w => full.includes(w) || type.includes(w));

      if (!matchBrand && !matchModel && !matchFull && !matchType && !matchAllWords) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'price-asc') return a.pricePerDay - b.pricePerDay;
    if (filters.sortBy === 'price-desc') return b.pricePerDay - a.pricePerDay;
    if (filters.sortBy === 'rating') return (b.rating || 4.8) - (a.rating || 4.8);
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });
}

export function renderCataloguePage(container) {
  const { filters } = getState();
  const filteredCars = getFilteredCars();

  container.innerHTML = `
    <div class="page-fade-in">
      <div class="catalogue-header">
        <div>
          <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase;">Fleet Selection</span>
          <h1 class="section-title" style="margin-top: 4px;">Explore All Vehicles</h1>
          <p style="color: var(--muted); font-size: var(--text-sm);">
            Showing <strong id="car-results-count" style="color: var(--text);">${filteredCars.length}</strong> <span id="car-results-noun">${filteredCars.length === 1 ? 'vehicle' : 'vehicles'}</span> ready for booking across 8 cities.
          </p>
        </div>

        <!-- Sentinel to observe when filter bar scrolls past top -->
        <div id="catalogue-sentinel" class="catalogue-sticky-sentinel" aria-hidden="true"></div>

        <!-- Sticky Filter Bar (>= 900px only) -->
        <div class="catalogue-sticky-filter-bar" id="catalogue-sticky-filter-bar">
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
              />
            </div>

            <!-- City Dropdown -->
            <div class="filter-dropdown-group">
              <label for="catalogue-city-select">City:</label>
              <select id="catalogue-city-select" class="form-control">
                ${CITIES.map(c => `
                  <option value="${c}" ${filters.city === c ? 'selected' : ''}>${c === 'All' ? 'All Cities' : c}</option>
                `).join('')}
              </select>
            </div>

            <!-- Sort Dropdown -->
            <div class="filter-dropdown-group">
              <label for="catalogue-sort-select">Sort:</label>
              <select id="catalogue-sort-select" class="form-control">
                <option value="featured" ${filters.sortBy === 'featured' ? 'selected' : ''}>Featured First</option>
                <option value="price-asc" ${filters.sortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-desc" ${filters.sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                <option value="rating" ${filters.sortBy === 'rating' ? 'selected' : ''}>Top Rated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Car Grid Container -->
      <div id="catalogue-grid-container">
        <!-- Rendered via updateCatalogueGrid -->
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
  updateCatalogueGrid(container);
}

function renderGridOrEmpty(carsList, favorites, compareList) {
  const { cars } = getState();

  // Show skeleton loaders if fleet data is not yet loaded
  if (cars.length === 0) {
    return `<div class="car-grid">${renderCarSkeleton(6)}</div>`;
  }

  // Show empty state if filtered results are 0
  if (carsList.length === 0) {
    return `
      <div class="empty-state-card reveal-on-scroll revealed" style="grid-column: 1 / -1; text-align: center; padding: var(--space-10) var(--space-4);">
        <div class="empty-state-icon" style="margin: 0 auto var(--space-3); width: 48px; height: 48px; color: var(--muted);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
        <h3 style="font-size: var(--text-xl); margin-bottom: var(--space-2);">No vehicles match your search</h3>
        <p style="color: var(--muted); font-size: var(--text-sm); max-width: 440px; margin: 0 auto var(--space-4);">
          No vehicles match your search. Try a different city or clear the filters.
        </p>
        <button type="button" class="btn btn-brand btn-sm" id="reset-catalogue-filters-btn">
          Clear filters
        </button>
      </div>
    `;
  }

  return `
    <div class="car-grid">
      ${carsList.map(car => renderCarCard(car, {
        isFavorite: favorites.has(car.id),
        isCompared: compareList.includes(car.id)
      })).join('')}
    </div>
  `;
}

export function updateCatalogueGrid(container = document) {
  const { favorites, compareList, filters } = getState();
  const filteredCars = getFilteredCars();
  const gridContainer = container.querySelector ? container.querySelector('#catalogue-grid-container') : document.getElementById('catalogue-grid-container');
  const countEl = container.querySelector ? container.querySelector('#car-results-count') : document.getElementById('car-results-count');
  const nounEl = container.querySelector ? container.querySelector('#car-results-noun') : document.getElementById('car-results-noun');

  if (countEl) {
    countEl.textContent = filteredCars.length;
  }
  if (nounEl) {
    nounEl.textContent = filteredCars.length === 1 ? 'vehicle' : 'vehicles';
  }

  // Update active pill classes in DOM
  const pills = container.querySelectorAll ? container.querySelectorAll('.filter-pill') : document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    const cat = pill.getAttribute('data-category');
    const isActive = (filters.type === cat) || (cat === 'All' && (!filters.type || filters.type === 'All'));
    pill.classList.toggle('active', isActive);
    pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Keep dropdown selects synchronized
  const citySelect = document.getElementById('catalogue-city-select');
  if (citySelect && citySelect.value !== filters.city) {
    citySelect.value = filters.city;
  }
  const sortSelect = document.getElementById('catalogue-sort-select');
  if (sortSelect && sortSelect.value !== filters.sortBy) {
    sortSelect.value = filters.sortBy;
  }

  if (gridContainer) {
    gridContainer.innerHTML = renderGridOrEmpty(filteredCars, favorites, compareList);

    // Cards must be visible by default: immediately apply .revealed to cards in view
    const cards = gridContainer.querySelectorAll('.reveal-on-scroll');
    cards.forEach(card => {
      card.classList.add('revealed');
    });

    // Re-initialize image handlers (cached image instant display & skeletons)
    initImageHandlers(gridContainer);

    // Re-register with scroll observer if any targets remain unrevealed
    initScrollReveal(gridContainer);
  }
}

function attachCatalogueListeners(container) {
  container.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const category = pill.getAttribute('data-category');
      updateFilters({ type: category });
      updateCatalogueGrid(container);
    });
  });

  const citySelect = document.getElementById('catalogue-city-select');
  citySelect?.addEventListener('change', (e) => {
    updateFilters({ city: e.target.value });
    updateCatalogueGrid(container);
  });

  const sortSelect = document.getElementById('catalogue-sort-select');
  sortSelect?.addEventListener('change', (e) => {
    updateFilters({ sortBy: e.target.value });
    updateCatalogueGrid(container);
  });

  const searchInput = document.getElementById('catalogue-search-input');
  let debounceTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      updateFilters({ searchQuery: e.target.value });
      updateCatalogueGrid(container);
    }, 120);
  });

  container.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'reset-catalogue-filters-btn') {
      updateFilters({ city: 'All', type: 'All', searchQuery: '', sortBy: 'featured' });
      const searchInput = document.getElementById('catalogue-search-input');
      if (searchInput) searchInput.value = '';
      updateCatalogueGrid(container);
    }
  });
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

/**
 * EasyDrive Home Page (pages/home.js)
 * -----------------------------------------------------------
 * Features:
 * 1. Centered Hero with two-line headline ("Easy to book." / "Easy to drive."),
 *    clear subtitle, and search bar.
 * 2. Honest stats row with one-time count-up animation.
 * 3. Featured Vehicles (with skeleton loaders if loading).
 * 4. "Choose your city" 8-tile interactive hub grid.
 * 5. Strict 3-column "How It Works" workflow (3 cols >=900px, 1 col <900px).
 */

import { getState, updateFilters } from '../state.js';
import { renderCarCard } from '../components/carCard.js';
import { renderCarSkeleton } from '../components/skeleton.js';
import { getLogoMarkSvg, getWordmarkHtml } from '../components/sidebar.js';

const CITIES = [
  { name: 'Delhi NCR', hubs: 'IGI Airport T3, New Delhi Station' },
  { name: 'Mumbai', hubs: 'CSMIA Airport (T2), BKC, Mumbai Central' },
  { name: 'Bengaluru', hubs: 'KIA Airport, Majestic Station, Koramangala' },
  { name: 'Chennai', hubs: 'Chennai Airport, Central Station, T. Nagar' },
  { name: 'Kolkata', hubs: 'NSCBI Airport, Howrah Station, Park Street' },
  { name: 'Hyderabad', hubs: 'RGIA Airport, Secunderabad Station, Hitec City' },
  { name: 'Pune', hubs: 'Pune Airport, Pune Junction, Koregaon Park' },
  { name: 'Ahmedabad', hubs: 'SVPI Airport, Kalupur Station, SG Highway' }
];

const CAR_TYPES = ['All Types', 'Hatchback', 'Sedan', 'SUV', 'MPV', 'EV', 'Luxury'];

function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function renderHomePage(container) {
  const { cars, favorites, compareList } = getState();
  const featuredCars = cars.filter(c => c.isFeatured).slice(0, 6);

  const tomorrowStr = getDateString(1);
  const defaultEndStr = getDateString(4);

  container.innerHTML = `
    <div class="page-fade-in">
      <!-- =========================================================
       * 1. CENTERED HERO SECTION
       * ========================================================= -->
      <section class="hero-section" aria-labelledby="hero-title">
        <div class="hero-inner-centered">
          <!-- Headline on two lines (each sentence in its own inline-block span) -->
          <h1 id="hero-title" class="hero-title-main">
            <span class="hero-title-line1"><span class="hero-sentence">Easy to book.</span> <span class="hero-sentence">Easy to drive.</span></span><br class="hero-headline-br" />
            <span class="hero-title-line2"><span class="hero-sentence">Unrestricted freedom.</span></span>
          </h1>

          <!-- Subtitle -->
          <p class="hero-subtitle-clean">
            Pick a car, choose your dates and pickup point, and hit the road. 
            Clear pricing, 250 km/day included and 24x7 support.
          </p>

          <!-- Quick Search Bar -->
          <form class="search-bar-wrapper" id="home-quick-search-form" role="search" aria-label="Quick Car Search">
            <!-- City Field -->
            <div class="search-field">
              <label class="search-label" for="search-city">City Hub</label>
              <select id="search-city" class="form-control" name="city">
                <option value="All">All 8 Cities</option>
                ${CITIES.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
              </select>
            </div>

            <!-- Start Date -->
            <div class="search-field">
              <label class="search-label" for="search-start-date">Pickup Date</label>
              <input type="date" id="search-start-date" name="startDate" min="${tomorrowStr}" value="${tomorrowStr}" class="form-control" />
            </div>

            <!-- End Date -->
            <div class="search-field">
              <label class="search-label" for="search-end-date">Dropoff Date</label>
              <input type="date" id="search-end-date" name="endDate" min="${tomorrowStr}" value="${defaultEndStr}" class="form-control" />
            </div>

            <!-- Car Type -->
            <div class="search-field">
              <label class="search-label" for="search-type">Category</label>
              <select id="search-type" class="form-control" name="type">
                ${CAR_TYPES.map(type => `<option value="${type === 'All Types' ? 'All' : type}">${type}</option>`).join('')}
              </select>
            </div>

            <!-- Submit CTA -->
            <div class="search-submit-col">
              <button type="submit" class="btn btn-brand" style="width: 100%; height: 42px;">
                Find Cars
              </button>
            </div>
          </form>

          <!-- Honest Platform Metrics with One-Time Count-Up -->
          <div class="honest-stats-grid" id="home-stats-grid">
            <div class="stat-item">
              <div class="stat-number" data-target="12">12</div><span style="font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--text);"> Cars</span>
              <div class="stat-label">Verified Fleet</div>
            </div>
            <div class="stat-item">
              <div class="stat-number" data-target="8">8</div><span style="font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--text);"> Cities</span>
              <div class="stat-label">Metro Hubs</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">Free Cancel</div>
              <div class="stat-label">Up to 6 hrs prior</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">24x7 Support</div>
              <div class="stat-label">Roadside Recovery</div>
            </div>
          </div>

          <!-- Clean slot ready for a wide car photo in future -->
          <div class="hero-photo-slot" id="hero-photo-slot" aria-hidden="true"></div>
        </div>
      </section>

      <!-- =========================================================
       * 2. FEATURED CARS SECTION
       * ========================================================= -->
      <section style="margin-bottom: var(--space-16);" aria-labelledby="featured-heading">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-6);">
          <div>
            <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase;">Fleet Preview</span>
            <h2 id="featured-heading" style="font-size: var(--text-2xl); margin-top: 2px;">Featured Vehicles</h2>
            <p style="color: var(--muted); font-size: var(--text-sm);">
              Popular choices for weekend travel, business commutes, and highway journeys.
            </p>
          </div>
          <a href="#catalogue" class="btn btn-outline btn-sm">
            View All 12 Cars <span class="btn-arrow">&rarr;</span>
          </a>
        </div>

        <div class="car-grid" id="home-featured-grid">
          ${cars.length === 0
            ? renderCarSkeleton(6)
            : featuredCars.map(car => renderCarCard(car, {
                isFavorite: favorites.has(car.id),
                isCompared: compareList.includes(car.id)
              })).join('')}
        </div>
      </section>

      <!-- =========================================================
       * 3. "CHOOSE YOUR CITY" 8-TILE INTERACTIVE SECTION
       * ========================================================= -->
      <section class="city-strip-section" aria-labelledby="city-strip-heading">
        <div style="text-align: center; max-width: 600px; margin: 0 auto;">
          <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Metropolitan Hubs</span>
          <h2 id="city-strip-heading" style="font-size: var(--text-2xl); margin-top: 4px;">Choose your city</h2>
          <p style="color: var(--muted); font-size: var(--text-sm);">Select a city hub to view available cars and pickup locations.</p>
        </div>

        <div class="city-tiles-grid">
          ${CITIES.map(city => `
            <div class="city-tile reveal-on-scroll" data-action="pick-city" data-city="${city.name}" role="button" tabindex="0" aria-label="Browse fleet in ${city.name}">
              <div class="city-tile-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div>
                <div class="city-tile-name">${city.name}</div>
                <div class="city-tile-desc">${city.hubs}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- =========================================================
       * 4. "HOW IT WORKS" 3-STEP SECTION (No Orphans)
       * ========================================================= -->
      <section class="how-it-works-section" aria-labelledby="steps-heading">
        <div style="text-align: center; max-width: 600px; margin: 0 auto;">
          <span style="font-size: var(--text-xs); color: var(--brand-text); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Simple & Transparent</span>
          <h2 id="steps-heading" style="font-size: var(--text-2xl); margin-top: 4px;">How It Works</h2>
          <p style="color: var(--muted); font-size: var(--text-sm);">Book in three straightforward steps with no paperwork delays.</p>
        </div>

        <div class="steps-grid">
          <div class="step-card reveal-on-scroll">
            <div class="step-badge">1</div>
            <h3 class="step-title">Choose Car & Dates</h3>
            <p class="step-desc">Pick from hatchbacks, sedans, SUVs, MPVs, or electric vehicles. Filter by city hub and rental dates.</p>
          </div>

          <div class="step-card reveal-on-scroll">
            <div class="step-badge">2</div>
            <h3 class="step-title">Quick ID check</h3>
            <p class="step-desc">Provide your Driving Licence & Aadhaar. For your privacy, EasyDrive securely validates and stores ONLY the last 4 digits of your ID.</p>
          </div>

          <div class="step-card reveal-on-scroll">
            <div class="step-badge">3</div>
            <h3 class="step-title">Drive & Return</h3>
            <p class="step-desc">Enjoy 250 km/day included allowance and 24x7 roadside assistance. Return to your pickup hub with ease.</p>
          </div>
        </div>
      </section>

      <!-- Global Learning Project Footer Notice -->
      <footer class="app-footer">
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

  // Attach Quick Search Form Handler
  const searchForm = document.getElementById('home-quick-search-form');
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(searchForm);
    const city = formData.get('city');
    const type = formData.get('type');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');

    updateFilters({ city, type, startDate, endDate });
    window.location.hash = '#catalogue';
  });

  // Attach City Tile Click Handlers
  container.querySelectorAll('[data-action="pick-city"]').forEach(tile => {
    const handlePick = () => {
      const city = tile.getAttribute('data-city');
      updateFilters({ city, type: 'All', searchQuery: '' });
      window.location.hash = '#catalogue';
    };
    tile.addEventListener('click', handlePick);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePick();
      }
    });
  });

  // Trigger one-time number count-up animation
  initStatCountUp();
}

/**
 * Performs a smooth, one-time count-up animation for numeric stats.
 * Respects prefers-reduced-motion.
 */
function initStatCountUp() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (prefersReduced) return;

  statNumbers.forEach(el => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) return;

    let start = 0;
    const duration = 900; // ms
    const startTime = performance.now();

    function updateNumber(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease out quad
      const current = Math.floor(progress * (2 - progress) * target);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        el.textContent = target;
      }
    }
    requestAnimationFrame(updateNumber);
  });
}

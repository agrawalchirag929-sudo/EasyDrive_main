/**
 * EasyDrive Global State Store (state.js)
 * -----------------------------------------------------------
 * A lightweight, reactive state management module for vanilla JavaScript.
 *
 * Theme handling:
 * - Checks localStorage first for user explicit preference.
 * - Defaults to user's system preference (prefers-color-scheme).
 * - Updates <meta name="theme-color"> tag dynamically.
 */

const STORAGE_KEYS = {
  THEME: 'easydrive_theme',
  FAVORITES: 'easydrive_favorites'
};

// In-memory fallback store for when localStorage is blocked or throws
const memoryStorage = new Map();

function safeGetStorage(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
    // Storage blocked or throws; fall back to in-memory store
  }
  return memoryStorage.has(key) ? memoryStorage.get(key) : null;
}

function safeSetStorage(key, value) {
  const strVal = String(value);
  try {
    localStorage.setItem(key, strVal);
  } catch (e) {
    // Storage blocked; retain in-memory fallback
  }
  memoryStorage.set(key, strVal);
}

/**
 * Resolves initial theme based on localStorage, falling back to system preference.
 * @returns {'dark' | 'light'}
 */
function resolveInitialTheme() {
  try {
    const savedTheme = safeGetStorage(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
  } catch (e) {
    // Fall back to system preference if storage is blocked
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function resolveInitialFavorites() {
  try {
    const raw = safeGetStorage(STORAGE_KEYS.FAVORITES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {
    // Ignore parse or storage errors in private/blocked mode
  }
  return new Set();
}

// Initial state definition
const state = {
  theme: resolveInitialTheme(),
  cars: [],
  favorites: resolveInitialFavorites(),
  compareList: [], // Array of car IDs (max 3)
  filters: {
    city: 'All',
    type: 'All',
    searchQuery: '',
    startDate: '',
    endDate: '',
    sortBy: 'featured'
  },
  currentRoute: '#home'
};

const listeners = new Set();

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify(changeType, payload) {
  listeners.forEach(callback => callback(state, changeType, payload));
}

export function getState() {
  return state;
}

/**
 * Sets theme and synchronizes DOM attribute and meta theme-color.
 */
export function setTheme(themeName) {
  state.theme = themeName === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  try {
    safeSetStorage(STORAGE_KEYS.THEME, state.theme);
  } catch (e) {
    // Ignore storage errors in private browsing
  }

  // Update mobile browser chrome color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', state.theme === 'dark' ? '#0B1218' : '#F5F3EE');
  }

  notify('THEME_CHANGED', state.theme);
}

export function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}

export function setCars(carsList) {
  state.cars = Array.isArray(carsList) ? carsList : [];
  notify('CARS_LOADED', state.cars);
}

export function toggleFavorite(carId) {
  let isFav = false;
  if (state.favorites.has(carId)) {
    state.favorites.delete(carId);
  } else {
    state.favorites.add(carId);
    isFav = true;
  }
  try {
    safeSetStorage(
      STORAGE_KEYS.FAVORITES,
      JSON.stringify(Array.from(state.favorites))
    );
  } catch (e) {
    // Ignore storage errors in private browsing
  }
  notify('FAVORITE_TOGGLED', { carId, isFav });
  return isFav;
}

export function toggleCompare(carId) {
  const index = state.compareList.indexOf(carId);
  if (index !== -1) {
    state.compareList.splice(index, 1);
    notify('COMPARE_UPDATED', state.compareList);
    return { success: true, action: 'removed', count: state.compareList.length };
  } else {
    if (state.compareList.length >= 3) {
      return { 
        success: false, 
        message: 'You can compare a maximum of 3 cars at once.' 
      };
    }
    state.compareList.push(carId);
    notify('COMPARE_UPDATED', state.compareList);
    return { success: true, action: 'added', count: state.compareList.length };
  }
}

export function clearCompare() {
  state.compareList = [];
  notify('COMPARE_UPDATED', state.compareList);
}

export function updateFilters(newFilters) {
  state.filters = { ...state.filters, ...newFilters };
  notify('FILTERS_CHANGED', state.filters);
}

export function setCurrentRoute(route) {
  state.currentRoute = route;
  notify('ROUTE_CHANGED', state.currentRoute);
}

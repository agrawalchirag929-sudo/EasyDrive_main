/**
 * EasyDrive Sidebar & Header Navigation Component (sidebar.js)
 * -----------------------------------------------------------
 * Phase 3a: wired to auth.js.
 * - When logged out: shows "Sign In" button (sidebar footer + mobile top bar).
 * - When logged in:  shows user avatar/name + "Log out" option.
 *   Works in collapsed sidebar (icon-only: avatar replaces buttons).
 */

import { getState, toggleTheme } from '../state.js';
import { showToast } from './toast.js';
import { isLoggedIn, getUser, logout, subscribe as authSubscribe } from '../auth.js';
import { openAuthDialog } from './authDialog.js';

/**
 * Returns inlined SVG logo mark markup.
 * Uses CSS variables for stroke, windows, and wheels.
 */
export function getLogoMarkSvg() {
  return `
    <svg viewBox="0 0 64 64" fill="none" class="easydrive-logo-mark" aria-hidden="true">
      <path 
        d="M17 31 L24 18 C24.8 16.8 26.2 16 27.6 16 H39 C40.4 16 41.8 16.8 42.6 18 L50 31 Z" 
        fill="var(--logo-window)" 
        stroke="var(--brand)" 
        stroke-width="2.5" 
        stroke-linejoin="round"
      />
      <line 
        x1="33" y1="16" x2="33" y2="31" 
        stroke="var(--brand)" 
        stroke-width="2.5" 
        stroke-linecap="round"
      />
      <path 
        d="M7 36 C7 33.2 9.2 31 12 31 H54 C57 31 59.5 33.4 59.8 36.4 L61 44 C61.2 45.7 59.8 47 58.1 47 H53.5 A6.5 6.5 0 0 0 40.5 47 H23.5 A6.5 6.5 0 0 0 10.5 47 H5.9 C4.2 47 2.8 45.7 3 44 Z" 
        fill="var(--surface)" 
        stroke="var(--brand)" 
        stroke-width="2.5" 
        stroke-linejoin="round"
      />
      <circle cx="17" cy="47" r="6" fill="var(--logo-wheel)" stroke="var(--logo-ring)" stroke-width="2.5" />
      <circle cx="17" cy="47" r="2.5" fill="var(--brand)" />
      <circle cx="47" cy="47" r="6" fill="var(--logo-wheel)" stroke="var(--logo-ring)" stroke-width="2.5" />
      <circle cx="47" cy="47" r="2.5" fill="var(--brand)" />
    </svg>
  `;
}

/**
 * Returns live text wordmark markup.
 */
export function getWordmarkHtml() {
  return `
    <span class="brand-wordmark">
      <span class="wordmark-easy">easy</span><span class="wordmark-drive">drive</span>
    </span>
  `;
}

const NAV_ITEMS = [
  {
    label: 'Home',
    hash: '#home',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    `
  },
  {
    label: 'Catalogue',
    hash: '#catalogue',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `
  },
  {
    label: 'My Bookings',
    hash: '#bookings',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    `
  },
  {
    label: 'Support',
    hash: '#support',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"></circle>
      </svg>
    `
  }
];

const SIDEBAR_STORAGE_KEY = 'easydrive_sidebar_collapsed';

export function getSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch (e) {
    // Ignore storage errors in private browsing
  }
}

/** Returns the initial avatar/initial for a user's name. */
function _initial(user) {
  return (user?.name ?? '?')[0].toUpperCase();
}

/** Build the sidebar footer HTML depending on auth state. */
function _buildAuthFooterHtml() {
  if (isLoggedIn()) {
    const user = getUser();
    const initial = _initial(user);
    return `
      <div class="auth-user-row" id="sidebar-auth-row">
        <div class="auth-avatar" aria-hidden="true">${initial}</div>
        <div class="auth-user-info">
          <span class="auth-user-name" title="${user.name}">${user.name}</span>
          <button type="button" class="auth-logout-btn" id="sidebar-logout-btn">Log out</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="sidebar-auth-row" id="sidebar-auth-row">
      <button type="button" class="btn btn-outline auth-btn" id="sidebar-login-btn"
              aria-label="Sign in" data-tooltip="Sign In">
        <svg class="auth-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
        <span class="auth-btn-text">Sign In</span>
      </button>
      <button type="button" class="btn btn-brand auth-btn" id="sidebar-signup-btn"
              aria-label="Create account" data-tooltip="Create Account">
        <svg class="auth-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        <span class="auth-btn-text">Sign Up</span>
      </button>
    </div>
  `;
}

/** Build mobile top-bar auth widget HTML. */
function _buildMobileAuthHtml() {
  if (isLoggedIn()) {
    const user = getUser();
    return `
      <button type="button" class="mobile-user-pill" id="mobile-user-pill"
              aria-label="Account options for ${user.name}">
        <div class="auth-avatar" style="width:28px;height:28px;font-size:var(--text-xs);"
             aria-hidden="true">${_initial(user)}</div>
        <span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.name}</span>
      </button>
    `;
  }
  return `
    <button type="button" class="btn btn-brand btn-sm mobile-signin-btn" id="mobile-signin-btn">
      Sign In
    </button>
  `;
}

/** Rewires event listeners on the sidebar footer auth section. */
function _wireAuthFooter() {
  document.getElementById('sidebar-login-btn')?.addEventListener('click', (e) => {
    openAuthDialog('login', e.currentTarget);
  });
  document.getElementById('sidebar-signup-btn')?.addEventListener('click', (e) => {
    openAuthDialog('register', e.currentTarget);
  });
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
    logout();
    showToast('You have been signed out.', 'info', 2500);
  });
}

/** Rewires event listeners on the mobile top-bar auth section. */
function _wireMobileAuth() {
  document.getElementById('mobile-signin-btn')?.addEventListener('click', (e) => {
    openAuthDialog('login', e.currentTarget);
  });
  document.getElementById('mobile-user-pill')?.addEventListener('click', (e) => {
    // For the mobile pill, show a simple "Log out?" toast + confirm
    const confirmed = window.confirm(`Sign out of ${getUser()?.name ?? 'your account'}?`);
    if (confirmed) {
      logout();
      showToast('You have been signed out.', 'info', 2500);
    }
  });
}

/**
 * Updates only the auth portions of sidebar and mobile bar when auth state changes.
 * Called by the authSubscribe listener — avoids full re-render.
 */
function _refreshAuthUi() {
  const footerRow = document.getElementById('sidebar-auth-row');
  if (footerRow) {
    footerRow.outerHTML = _buildAuthFooterHtml();
    _wireAuthFooter();
  }

  const mobileAuthWrap = document.getElementById('mobile-auth-wrap');
  if (mobileAuthWrap) {
    mobileAuthWrap.innerHTML = _buildMobileAuthHtml();
    _wireMobileAuth();
  }
}

/**
 * Injects desktop sidebar, mobile top header, and mobile bottom bar.
 */
export function renderSidebar(container) {
  const currentTheme = getState().theme;
  const isCollapsed = getSidebarCollapsed();

  // Apply initial collapsed state to body
  if (isCollapsed) {
    document.body.classList.add('sidebar-collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
  }

  container.innerHTML = `
    <!-- =========================================================
     * MOBILE TOP HEADER (Sticky on < 868px)
     * ========================================================= -->
    <header class="mobile-top-header" aria-label="Mobile Header">
      <a href="#home" style="display: flex; align-items: center; gap: 8px;">
        <div class="brand-icon-wrap" style="width: 32px; height: 32px;">
          ${getLogoMarkSvg()}
        </div>
        ${getWordmarkHtml()}
      </a>
      <div style="display:flex;align-items:center;gap:var(--space-2);">
        <div id="mobile-auth-wrap">${_buildMobileAuthHtml()}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="mobile-theme-toggle"
                aria-label="Toggle dark/light theme" style="padding: 6px 10px;">
          <span id="mobile-theme-icon">${currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
        </button>
      </div>
    </header>

    <!-- =========================================================
     * DESKTOP PERSISTENT SIDEBAR
     * ========================================================= -->
    <aside class="sidebar" id="app-sidebar" aria-label="Main Navigation">
      <!-- Header row: Inlined Mark + Wordmark + Collapse Toggle -->
      <div class="sidebar-header">
        <a href="#home" class="sidebar-brand" aria-label="EasyDrive Home">
          <div class="brand-icon-wrap">
            ${getLogoMarkSvg()}
          </div>
          <span class="sidebar-brand-text">${getWordmarkHtml()}</span>
        </a>

        <button 
          type="button" 
          class="sidebar-toggle-btn" 
          id="sidebar-toggle-btn" 
          aria-label="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}" 
          aria-expanded="${!isCollapsed}"
          title="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
          data-tooltip="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
        >
          <svg class="sidebar-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <a href="${item.hash}" class="nav-link" data-hash="${item.hash}"
             aria-label="${item.label}" data-tooltip="${item.label}">
            ${item.icon}
            <span class="nav-link-text">${item.label}</span>
          </a>
        `).join('')}
      </nav>

      <!-- Sidebar Footer (Theme Toggle & Auth) -->
      <div class="sidebar-footer">
        <button type="button" class="theme-toggle-btn" id="sidebar-theme-toggle"
                aria-label="Toggle dark/light theme" data-tooltip="Toggle Theme">
          <span class="theme-toggle-icon-wrap" id="sidebar-theme-indicator"
                aria-hidden="true">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          <span class="theme-toggle-text">
            <span id="theme-label">${currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <span style="font-size: 10px; color: var(--muted); text-transform: uppercase;">Switch</span>
          </span>
        </button>

        <!-- Auth footer section (swapped by _refreshAuthUi on auth change) -->
        ${_buildAuthFooterHtml()}
      </div>
    </aside>

    <!-- =========================================================
     * MOBILE BOTTOM NAVIGATION
     * ========================================================= -->
    <nav class="bottom-nav" aria-label="Mobile Navigation">
      <ul class="bottom-nav-list">
        ${NAV_ITEMS.map(item => `
          <li class="bottom-nav-item">
            <a href="${item.hash}" class="bottom-nav-link" data-hash="${item.hash}">
              ${item.icon}
              <span>${item.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    </nav>
  `;

  // ── Event listeners ──────────────────────────────────────────────────────────

  // Sidebar collapse
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  toggleBtn?.addEventListener('click', () => {
    const isNowCollapsed = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', isNowCollapsed);
    setSidebarCollapsed(isNowCollapsed);
    const label = isNowCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    toggleBtn.setAttribute('aria-expanded', String(!isNowCollapsed));
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);
    toggleBtn.setAttribute('data-tooltip', label);
  });

  // Theme toggles
  const handleToggle = () => {
    const newTheme = toggleTheme();
    updateThemeUI(newTheme);
    showToast(`Switched to ${newTheme} mode`, 'info', 1800);
  };
  document.getElementById('sidebar-theme-toggle')?.addEventListener('click', handleToggle);
  document.getElementById('mobile-theme-toggle')?.addEventListener('click', handleToggle);

  // Auth buttons (initial wire)
  _wireAuthFooter();
  _wireMobileAuth();

  // Subscribe to auth state changes to refresh the auth UI without re-rendering the whole sidebar
  authSubscribe(_refreshAuthUi);
}

export function updateThemeUI(theme) {
  const label = document.getElementById('theme-label');
  const mobIcon = document.getElementById('mobile-theme-icon');
  const indicator = document.getElementById('sidebar-theme-indicator');
  if (label)     label.textContent   = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  if (mobIcon)   mobIcon.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  if (indicator) indicator.textContent = theme === 'dark' ? '🌙' : '☀️';
}

export function updateActiveNav(currentHash) {
  const hash = currentHash || '#home';
  document.querySelectorAll('.nav-link, .bottom-nav-link').forEach(link => {
    const linkHash = link.getAttribute('data-hash');
    link.classList.toggle('active', linkHash === hash);
  });
}

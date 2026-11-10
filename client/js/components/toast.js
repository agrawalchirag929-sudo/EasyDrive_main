/**
 * EasyDrive Toast Notification Component (toast.js)
 * -----------------------------------------------------------
 * Provides non-blocking, accessible visual feedback to the user
 * (e.g., added to favorites, maximum compare reached, filters applied).
 */

const TOAST_CONTAINER_ID = 'toast-container';

/**
 * Ensures the toast container element exists in the DOM.
 */
function getOrCreateToastContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Renders and displays a toast message.
 * @param {string} message - Text notification
 * @param {'success' | 'error' | 'info' | 'warning'} type - Visual category
 * @param {number} duration - Milliseconds before auto-dismissal (default 3200ms)
 */
export function showToast(message, type = 'info', duration = 3200) {
  const container = getOrCreateToastContainer();

  // Pick appropriate SVG icon based on toast type
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  } else if (type === 'error') {
    iconSvg = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else {
    iconSvg = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toastEl.innerHTML = `
    ${iconSvg}
    <div class="toast-message">${escapeHtml(message)}</div>
    <button type="button" class="toast-close-btn" aria-label="Close notification">&times;</button>
  `;

  // Close button handler
  const closeBtn = toastEl.querySelector('.toast-close-btn');
  closeBtn.addEventListener('click', () => removeToast(toastEl));

  container.appendChild(toastEl);

  // Auto dismiss timer
  const timer = setTimeout(() => {
    removeToast(toastEl);
  }, duration);

  // Pause dismissal on hover for user accessibility
  toastEl.addEventListener('mouseenter', () => clearTimeout(timer));
  toastEl.addEventListener('mouseleave', () => {
    setTimeout(() => removeToast(toastEl), 1500);
  });
}

/**
 * Gracefully animates toast exit and removes from DOM.
 */
function removeToast(toastEl) {
  toastEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  toastEl.style.opacity = '0';
  toastEl.style.transform = 'translateX(20px)';
  setTimeout(() => {
    if (toastEl.parentNode) {
      toastEl.parentNode.removeChild(toastEl);
    }
  }, 250);
}

/**
 * Escapes user strings to prevent XSS injection.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

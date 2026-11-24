/**
 * client/js/components/authDialog.js
 * EasyDrive Sign-In / Create-Account dialog.
 *
 * Features:
 *  - Tab-toggle between "Sign In" and "Create Account" modes.
 *  - Accessible: role=dialog, aria-modal, focus trap, Esc closes,
 *    focus returns to the trigger button on close.
 *  - Fields: name (register only), email, password with show/hide toggle.
 *  - Client-side validation mirroring server rules:
 *      email must be a valid address
 *      password ≥ 8 chars with at least one letter and one number
 *  - Maps server fieldErrors to the matching field.
 *  - Loading spinner on submit button.
 *  - Toast on success ("Welcome, <name>").
 *  - prefers-reduced-motion: transitions are instant when active.
 */

import { login, register } from '../auth.js';
import { showToast } from './toast.js';

// ── Dialog state ───────────────────────────────────────────────────────────────

/** The element that opened the dialog, restored on close. */
let _triggerEl = null;
/** Current mode: 'login' | 'register' */
let _mode = 'login';
/** The dialog root element once mounted. */
let _dialog = null;

// ── Mount (once) ──────────────────────────────────────────────────────────────

function _ensureMounted() {
  if (_dialog) return;

  _dialog = document.createElement('div');
  _dialog.id = 'auth-dialog-backdrop';
  _dialog.className = 'auth-backdrop';
  _dialog.setAttribute('role', 'dialog');
  _dialog.setAttribute('aria-modal', 'true');
  _dialog.setAttribute('aria-labelledby', 'auth-dialog-title');
  _dialog.setAttribute('aria-hidden', 'true');
  _dialog.innerHTML = _buildHtml();

  document.body.appendChild(_dialog);

  // Close on backdrop click
  _dialog.addEventListener('click', (e) => {
    if (e.target === _dialog) closeAuthDialog();
  });

  // Close on Esc
  document.addEventListener('keydown', _handleKeydown);

  // Wire internal events
  _dialog.querySelector('#auth-tab-login')?.addEventListener('click', () => _switchMode('login'));
  _dialog.querySelector('#auth-tab-register')?.addEventListener('click', () => _switchMode('register'));
  _dialog.querySelector('#auth-close-btn')?.addEventListener('click', closeAuthDialog);
  _dialog.querySelector('#auth-form')?.addEventListener('submit', _handleSubmit);

  // Password visibility toggle
  _dialog.querySelector('#auth-pw-toggle')?.addEventListener('click', _togglePasswordVisibility);
}

// ── HTML template ──────────────────────────────────────────────────────────────

function _buildHtml() {
  return `
    <div class="auth-dialog" id="auth-dialog-panel">
      <!-- Close button -->
      <button type="button" class="auth-close-btn" id="auth-close-btn" aria-label="Close dialog">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Brand -->
      <div class="auth-brand" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" class="auth-logo-mark">
          <path d="M17 31 L24 18 C24.8 16.8 26.2 16 27.6 16 H39 C40.4 16 41.8 16.8 42.6 18 L50 31 Z"
                fill="var(--logo-window)" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"/>
          <line x1="33" y1="16" x2="33" y2="31" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M7 36 C7 33.2 9.2 31 12 31 H54 C57 31 59.5 33.4 59.8 36.4 L61 44 C61.2 45.7 59.8 47 58.1 47 H53.5 A6.5 6.5 0 0 0 40.5 47 H23.5 A6.5 6.5 0 0 0 10.5 47 H5.9 C4.2 47 2.8 45.7 3 44 Z"
                fill="var(--surface)" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="17" cy="47" r="6" fill="var(--logo-wheel)" stroke="var(--logo-ring)" stroke-width="2.5"/>
          <circle cx="17" cy="47" r="2.5" fill="var(--brand)"/>
          <circle cx="47" cy="47" r="6" fill="var(--logo-wheel)" stroke="var(--logo-ring)" stroke-width="2.5"/>
          <circle cx="47" cy="47" r="2.5" fill="var(--brand)"/>
        </svg>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" id="auth-tab-login" class="auth-tab auth-tab-active"
                aria-selected="true" aria-controls="auth-form">Sign In</button>
        <button type="button" role="tab" id="auth-tab-register" class="auth-tab"
                aria-selected="false" aria-controls="auth-form">Create Account</button>
      </div>

      <h2 class="auth-title" id="auth-dialog-title">Sign In</h2>

      <!-- Form -->
      <form id="auth-form" novalidate autocomplete="on">
        <!-- Name (register only) -->
        <div class="auth-field" id="auth-field-name" style="display:none;">
          <label class="auth-label" for="auth-name">Full Name</label>
          <input
            type="text"
            id="auth-name"
            name="name"
            class="auth-input"
            placeholder="Your full name"
            autocomplete="name"
            maxlength="100"
          />
          <span class="auth-field-error" id="auth-err-name" role="alert" aria-live="polite"></span>
        </div>

        <!-- Email -->
        <div class="auth-field">
          <label class="auth-label" for="auth-email">Email</label>
          <input
            type="email"
            id="auth-email"
            name="email"
            class="auth-input"
            placeholder="you@example.com"
            autocomplete="email"
            inputmode="email"
            required
          />
          <span class="auth-field-error" id="auth-err-email" role="alert" aria-live="polite"></span>
        </div>

        <!-- Password -->
        <div class="auth-field">
          <label class="auth-label" for="auth-password">Password</label>
          <div class="auth-password-wrap">
            <input
              type="password"
              id="auth-password"
              name="password"
              class="auth-input"
              placeholder="At least 8 chars, 1 letter, 1 number"
              autocomplete="current-password"
              required
            />
            <button type="button" class="auth-pw-toggle" id="auth-pw-toggle"
                    aria-label="Show password" aria-pressed="false">
              <svg class="eye-icon eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg class="eye-icon eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   aria-hidden="true" style="display:none;">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
          <span class="auth-field-error" id="auth-err-password" role="alert" aria-live="polite"></span>
        </div>

        <!-- General error (network / server 500) -->
        <div class="auth-general-error" id="auth-err-general" role="alert" aria-live="polite" style="display:none;"></div>

        <!-- Submit -->
        <button type="submit" class="btn btn-brand auth-submit-btn" id="auth-submit-btn">
          <span class="auth-submit-text">Sign In</span>
          <span class="auth-spinner" id="auth-spinner" aria-hidden="true" style="display:none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                 width="18" height="18" class="spin-icon" aria-hidden="true">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </span>
        </button>
      </form>
    </div>
  `;
}

// ── Focus trap ─────────────────────────────────────────────────────────────────

function _getFocusable() {
  if (!_dialog) return [];
  return Array.from(
    _dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => el.offsetParent !== null); // only visible
}

function _trapFocus(e) {
  const focusable = _getFocusable();
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }
}

function _handleKeydown(e) {
  if (e.key === 'Escape' && _dialog && _dialog.getAttribute('aria-hidden') === 'false') {
    closeAuthDialog();
  }
}

// ── Mode switching ─────────────────────────────────────────────────────────────

function _switchMode(mode) {
  _mode = mode;
  const isRegister = mode === 'register';

  const tabLogin    = _dialog.querySelector('#auth-tab-login');
  const tabRegister = _dialog.querySelector('#auth-tab-register');
  const title       = _dialog.querySelector('#auth-dialog-title');
  const nameField   = _dialog.querySelector('#auth-field-name');
  const submitText  = _dialog.querySelector('.auth-submit-text');
  const pwInput     = _dialog.querySelector('#auth-password');

  tabLogin?.classList.toggle('auth-tab-active', !isRegister);
  tabLogin?.setAttribute('aria-selected', String(!isRegister));
  tabRegister?.classList.toggle('auth-tab-active', isRegister);
  tabRegister?.setAttribute('aria-selected', String(isRegister));

  if (title)      title.textContent      = isRegister ? 'Create Account' : 'Sign In';
  if (submitText) submitText.textContent = isRegister ? 'Create Account' : 'Sign In';
  if (nameField)  nameField.style.display = isRegister ? '' : 'none';

  // Toggle autocomplete hint
  if (pwInput) {
    pwInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
    pwInput.placeholder = isRegister ? 'At least 8 chars, 1 letter, 1 number' : 'Your password';
  }

  // Update dialog title for screen readers
  _dialog.setAttribute('aria-labelledby', 'auth-dialog-title');

  _clearErrors();
  _resetForm();

  // Focus first visible input after mode switch
  setTimeout(() => {
    const first = _getFocusable().find(el => el.tagName === 'INPUT');
    first?.focus();
  }, 50);
}

// ── Validation (mirrors server rules) ─────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// At least 8 chars, contains a letter, contains a number
const PW_LETTER_RE = /[a-zA-Z]/;
const PW_NUMBER_RE = /[0-9]/;

function _validateClient(name, email, password) {
  const errors = {};
  if (_mode === 'register') {
    if (!name || name.trim().length === 0)  errors.name     = 'Please enter your full name.';
    if (name && name.trim().length > 100)   errors.name     = 'Name must be 100 characters or fewer.';
  }
  if (!email || !EMAIL_RE.test(email.trim())) errors.email  = 'Please enter a valid email address.';
  if (!password || password.length < 8)        errors.password = 'Password must be at least 8 characters.';
  else if (!PW_LETTER_RE.test(password))        errors.password = 'Password must contain at least one letter.';
  else if (!PW_NUMBER_RE.test(password))        errors.password = 'Password must contain at least one number.';
  return errors;
}

function _showFieldErrors(errs) {
  for (const [field, msg] of Object.entries(errs)) {
    const el = _dialog?.querySelector(`#auth-err-${field}`);
    const input = _dialog?.querySelector(`#auth-${field}`);
    if (el)    { el.textContent = msg; el.style.display = ''; }
    if (input) { input.classList.add('auth-input-error'); input.setAttribute('aria-describedby', `auth-err-${field}`); }
  }
  // Focus first errored field
  const firstField = Object.keys(errs)[0];
  if (firstField) _dialog?.querySelector(`#auth-${firstField}`)?.focus();
}

function _clearErrors() {
  _dialog?.querySelectorAll('.auth-field-error').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
  _dialog?.querySelectorAll('.auth-input-error').forEach(el => el.classList.remove('auth-input-error'));
  const gen = _dialog?.querySelector('#auth-err-general');
  if (gen) { gen.style.display = 'none'; gen.textContent = ''; }
}

function _showGeneralError(msg) {
  const el = _dialog?.querySelector('#auth-err-general');
  if (el) { el.textContent = msg; el.style.display = ''; }
}

// ── Loading state ──────────────────────────────────────────────────────────────

function _setLoading(loading) {
  const btn     = _dialog?.querySelector('#auth-submit-btn');
  const spinner = _dialog?.querySelector('#auth-spinner');
  const text    = _dialog?.querySelector('.auth-submit-text');
  if (btn)     { btn.disabled = loading; }
  if (spinner) { spinner.style.display = loading ? '' : 'none'; }
  if (text)    { text.style.opacity = loading ? '0.5' : '1'; }
}

// ── Form helpers ───────────────────────────────────────────────────────────────

function _resetForm() {
  const form = _dialog?.querySelector('#auth-form');
  form?.reset();
  // Reset password visibility
  const pwInput  = _dialog?.querySelector('#auth-password');
  const toggle   = _dialog?.querySelector('#auth-pw-toggle');
  const eyeOpen  = _dialog?.querySelector('.eye-open');
  const eyeClosed = _dialog?.querySelector('.eye-closed');
  if (pwInput)  pwInput.type = 'password';
  if (toggle)   toggle.setAttribute('aria-pressed', 'false');
  if (eyeOpen)  eyeOpen.style.display = '';
  if (eyeClosed) eyeClosed.style.display = 'none';
}

function _togglePasswordVisibility() {
  const input   = _dialog?.querySelector('#auth-password');
  const toggle  = _dialog?.querySelector('#auth-pw-toggle');
  const eyeOpen = _dialog?.querySelector('.eye-open');
  const eyeClosed = _dialog?.querySelector('.eye-closed');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  toggle?.setAttribute('aria-pressed', String(show));
  toggle?.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  if (eyeOpen)   eyeOpen.style.display   = show ? 'none' : '';
  if (eyeClosed) eyeClosed.style.display = show ? ''     : 'none';
  input.focus();
}

// ── Form submission ────────────────────────────────────────────────────────────

async function _handleSubmit(e) {
  e.preventDefault();
  _clearErrors();

  const nameEl  = _dialog?.querySelector('#auth-name');
  const emailEl = _dialog?.querySelector('#auth-email');
  const pwEl    = _dialog?.querySelector('#auth-password');

  const name     = nameEl?.value.trim() ?? '';
  const email    = emailEl?.value.trim() ?? '';
  const password = pwEl?.value ?? '';

  // Client-side validation first
  const clientErrors = _validateClient(name, email, password);
  if (Object.keys(clientErrors).length) {
    _showFieldErrors(clientErrors);
    return;
  }

  _setLoading(true);

  try {
    let user;
    if (_mode === 'login') {
      user = await login(email, password);
    } else {
      user = await register(name, email, password);
    }
    // On success: close dialog, show welcome toast
    closeAuthDialog();
    showToast(`Welcome, ${user.name}! 👋`, 'success', 3500);
  } catch (err) {
    // Map server fieldErrors to form fields; fall back to general error
    if (err.fieldErrors && err.fieldErrors.length) {
      const serverErrs = {};
      err.fieldErrors.forEach(fe => { serverErrs[fe.field] = fe.message; });
      _showFieldErrors(serverErrs);
    } else {
      _showGeneralError(err.message || 'Something went wrong. Please try again.');
    }
  } finally {
    _setLoading(false);
  }
}

// ── Public open / close ────────────────────────────────────────────────────────

/**
 * Open the auth dialog.
 * @param {'login'|'register'} [initialMode='login']
 * @param {HTMLElement} [triggerEl] element to restore focus to on close
 */
export function openAuthDialog(initialMode = 'login', triggerEl = null) {
  _ensureMounted();
  _triggerEl = triggerEl || document.activeElement;
  _mode = initialMode;
  _dialog.setAttribute('aria-hidden', 'false');
  _dialog.classList.add('auth-backdrop-visible');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  _switchMode(initialMode);

  // Focus first interactive element
  setTimeout(() => {
    const first = _getFocusable()[0];
    first?.focus();
  }, 60);

  // Activate focus trap
  _dialog.addEventListener('keydown', _trapFocus);
}

/**
 * Close the auth dialog and return focus to the trigger.
 */
export function closeAuthDialog() {
  if (!_dialog) return;
  _dialog.setAttribute('aria-hidden', 'true');
  _dialog.classList.remove('auth-backdrop-visible');
  document.body.style.overflow = '';
  _dialog.removeEventListener('keydown', _trapFocus);
  _clearErrors();
  _resetForm();
  // Return focus to the element that opened the dialog
  if (_triggerEl && typeof _triggerEl.focus === 'function') {
    _triggerEl.focus();
  }
  _triggerEl = null;
}

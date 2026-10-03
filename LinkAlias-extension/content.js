/**
 * LinkAlias - Content Script (Phase 8: Extension Authentication + Login/Register UI + JWT Integration)
 * 
 * Flow:
 * 1. Read current hostname (window.location.hostname).
 * 2. Check website eligibility via LinkAliasConfig.isSiteEnabled(hostname).
 * 3. IF DISABLED: Terminate execution (do nothing).
 * 4. IF ENABLED:
 *    - Check chrome.storage.local for access_token.
 *    - If token exists, validate via GET /auth/me.
 *    - If authenticated: fetch user-specific aliases (GET /aliases), update DOM, and render user status badge.
 *    - If unauthenticated / token expired: render login badge & prompt auth modal when clicking pencil icons.
 *    - Support Logout: clear access_token from chrome.storage.local, clear cached aliases, revert DOM.
 */

(function () {
  'use strict';

  // Constants
  const PROCESSED_ATTR = 'data-linkalias-processed';
  const ORIGINAL_TEXT_ATTR = 'data-linkalias-original-text';
  const ALIAS_ATTR = 'data-linkalias-alias';
  const PENCIL_CLASS = 'linkalias-pencil';

  // Module state
  let activePopup = null;
  let activeAuthModal = null;
  let activeGlobalListeners = null;
  let authToken = null;
  let currentUser = null;
  let cachedAliases = {}; // { [url]: { alias, originalText } }

  /**
   * Centralized API URL resolver
   */
  function getApiBaseUrl() {
    if (typeof window.LinkAliasConfig !== 'undefined' && window.LinkAliasConfig.apiBaseUrl) {
      return window.LinkAliasConfig.apiBaseUrl;
    }
    return "http://127.0.0.1:8000";
  }

  /**
   * Storage Wrapper Service for JWT Access Tokens & Local Fallback
   */
  const LinkAliasStorage = {
    getToken: function (callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['access_token'], (result) => {
          callback(result.access_token || null);
        });
      } else {
        try {
          callback(localStorage.getItem('linkalias_access_token'));
        } catch (e) {
          callback(null);
        }
      }
    },

    saveToken: function (token, callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ access_token: token }, () => {
          if (callback) callback();
        });
      } else {
        try {
          localStorage.setItem('linkalias_access_token', token);
        } catch (e) {}
        if (callback) callback();
      }
    },

    removeToken: function (callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['access_token'], () => {
          if (callback) callback();
        });
      } else {
        try {
          localStorage.removeItem('linkalias_access_token');
        } catch (e) {}
        if (callback) callback();
      }
    }
  };

  /**
   * REST API Client Service for LinkAlias Authentication & Alias Endpoints
   */
  const LinkAliasAPI = {
    register: async function (name, email, password) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Registration failed (HTTP ${res.status})`);
      }
      return data;
    },

    login: async function (email, password) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Login failed (HTTP ${res.status})`);
      }
      return data; // { access_token: "...", token_type: "bearer" }
    },

    getMe: async function (token) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      return data; // { id: "...", name: "...", email: "..." }
    },

    getAllAliases: async function (token) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/aliases`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("401 Unauthorized");
      }
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      return await res.json();
    },

    createAlias: async function (token, url, alias) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/aliases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url, alias: alias })
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("401 Unauthorized");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP error ${res.status}`);
      }
      return data;
    },

    updateAlias: async function (token, url, alias) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/aliases`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url, alias: alias })
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("401 Unauthorized");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP error ${res.status}`);
      }
      return data;
    },

    deleteAlias: async function (token, url) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/aliases`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url })
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("401 Unauthorized");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP error ${res.status}`);
      }
      return data;
    },

    getPlatformPreferences: async function (token) {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/preferences/platforms`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("401 Unauthorized");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP error ${res.status}`);
      }
      return data; // { user_id: "...", enabled_platforms: [...] }
    }
  };

  /**
   * Handle 401 Unauthorized response: clear token, reset session, and prompt login.
   */

  function handleUnauthorized() {
    console.warn('[LinkAlias] 401 Unauthorized. Clearing expired token...');
    authToken = null;
    currentUser = null;
    cachedAliases = {};
    LinkAliasStorage.removeToken();
    revertDomAliases();
    removeInjectedAuthUI();
  }

  /**
   * Revert all custom alias text nodes on the webpage back to original text.
   */
  function revertDomAliases() {
    const anchors = document.querySelectorAll(`a[${ALIAS_ATTR}]`);
    anchors.forEach((anchor) => {
      const originalText = anchor.getAttribute(ORIGINAL_TEXT_ATTR);
      if (originalText) {
        anchor.textContent = originalText;
      }
      anchor.removeAttribute(ALIAS_ATTR);
    });
  }

  /**
   * Check if current website is enabled.
   */
  function isCurrentWebsiteEnabled() {
    const hostname = window.location.hostname;
    if (typeof window.LinkAliasConfig !== 'undefined' && typeof window.LinkAliasConfig.isSiteEnabled === 'function') {
      return window.LinkAliasConfig.isSiteEnabled(hostname);
    }
    return hostname === 'web.whatsapp.com';
  }

  /**
   * Validate hyperlink candidate element.
   */
  function isValidHyperlink(anchor) {
    if (!anchor || anchor.tagName !== 'A') return false;
    const href = anchor.getAttribute('href');
    if (!href) return false;

    const trimmedHref = href.trim();
    if (
      trimmedHref === '' ||
      trimmedHref === '#' ||
      trimmedHref.toLowerCase().startsWith('javascript:') ||
      trimmedHref.toLowerCase().startsWith('mailto:') ||
      trimmedHref.toLowerCase().startsWith('tel:') ||
      trimmedHref.toLowerCase().startsWith('data:')
    ) {
      return false;
    }

    try {
      const urlObj = new URL(anchor.href, window.location.href);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  /**
   * Close any open popup modal.
   */
  function closeActivePopup() {
    if (activePopup) {
      if (activePopup.parentNode) {
        activePopup.parentNode.removeChild(activePopup);
      }
      activePopup = null;
    }
    if (activeGlobalListeners) {
      document.removeEventListener('click', activeGlobalListeners.handleClickOutside, true);
      document.removeEventListener('keydown', activeGlobalListeners.handleKeyDown, true);
      activeGlobalListeners = null;
    }
  }

  /**
   * Close active Auth modal dialog.
   */
  function closeAuthModal() {
    if (activeAuthModal) {
      if (activeAuthModal.parentNode) {
        activeAuthModal.parentNode.removeChild(activeAuthModal);
      }
      activeAuthModal = null;
    }
  }

  /**
   * Helper to escape HTML characters.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Position floating popup adjacent to target element.
   */
  function positionPopup(popup, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const popupWidth = 300;
    const popupHeight = 260;

    let top = rect.bottom + 8;
    let left = rect.left;

    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    if (left < 12) left = 12;

    if (top + popupHeight > window.innerHeight - 12) {
      top = rect.top - popupHeight - 8;
    }
    if (top < 12) top = 12;

    popup.style.top = `${Math.round(top)}px`;
    popup.style.left = `${Math.round(left)}px`;
  }

  /**
   * Ensure no top-right authentication bar, status badge, or header UI is injected into host webpages.
   */
  function removeInjectedAuthUI() {
    const badge = document.getElementById('linkalias-auth-status-badge');
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
    const badges = document.querySelectorAll('.linkalias-auth-badge');
    badges.forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  /**
   * Execute Logout: remove token, clear session, revert DOM.
   */
  function handleLogout() {
    console.log('[LinkAlias] Logging out user...');
    authToken = null;
    currentUser = null;
    cachedAliases = {};
    LinkAliasStorage.removeToken();
    revertDomAliases();
    removeInjectedAuthUI();
    closeActivePopup();
    closeAuthModal();
  }

  /**
   * Open Extension Authentication Modal Dialog (Login / Register view)
   */
  function openAuthModal(onSuccessCallback = null) {
    closeAuthModal();

    const modal = document.createElement('div');
    modal.className = 'linkalias-auth-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'LinkAlias Authentication');

    modal.innerHTML = `
      <div class="linkalias-auth-card">
        <div class="linkalias-auth-header">
          <span class="linkalias-auth-title">🔗 LinkAlias</span>
          <button type="button" class="linkalias-close-btn">&times;</button>
        </div>

        <!-- Login View -->
        <div class="linkalias-auth-view" id="linkalias-login-view">
          <h3 class="linkalias-auth-heading">Sign In</h3>
          <p class="linkalias-auth-subtext">Sign in to manage your custom link aliases</p>

          <div class="linkalias-field-group">
            <label class="linkalias-field-label">Email</label>
            <input type="email" class="linkalias-input linkalias-email-input" placeholder="user@example.com" autocomplete="username" />
          </div>

          <div class="linkalias-field-group">
            <label class="linkalias-field-label">Password</label>
            <input type="password" class="linkalias-input linkalias-password-input" placeholder="••••••••" autocomplete="current-password" />
          </div>

          <div class="linkalias-auth-error linkalias-login-error" style="display:none;"></div>

          <button type="button" class="linkalias-btn linkalias-btn-save linkalias-auth-submit-btn" style="width:100%; margin-top:10px;">Login</button>

          <div class="linkalias-auth-toggle">
            Don't have an account? <a href="#" class="linkalias-to-register-link">Register</a>
          </div>
        </div>

        <!-- Register View -->
        <div class="linkalias-auth-view" id="linkalias-register-view" style="display:none;">
          <h3 class="linkalias-auth-heading">Create Account</h3>
          <p class="linkalias-auth-subtext">Register to start assigning custom aliases</p>

          <div class="linkalias-field-group">
            <label class="linkalias-field-label">Name</label>
            <input type="text" class="linkalias-input linkalias-reg-name-input" placeholder="Sivabharathi" autocomplete="name" />
          </div>

          <div class="linkalias-field-group">
            <label class="linkalias-field-label">Email</label>
            <input type="email" class="linkalias-input linkalias-reg-email-input" placeholder="user@example.com" autocomplete="email" />
          </div>

          <div class="linkalias-field-group">
            <label class="linkalias-field-label">Password</label>
            <input type="password" class="linkalias-input linkalias-reg-password-input" placeholder="Min 6 characters" autocomplete="new-password" />
          </div>

          <div class="linkalias-auth-error linkalias-reg-error" style="display:none;"></div>

          <button type="button" class="linkalias-btn linkalias-btn-save linkalias-auth-reg-submit-btn" style="width:100%; margin-top:10px;">Register</button>

          <div class="linkalias-auth-toggle">
            Already have an account? <a href="#" class="linkalias-to-login-link">Login</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    activeAuthModal = modal;

    const closeBtn = modal.querySelector('.linkalias-close-btn');
    const loginView = modal.querySelector('#linkalias-login-view');
    const regView = modal.querySelector('#linkalias-register-view');
    const toRegLink = modal.querySelector('.linkalias-to-register-link');
    const toLoginLink = modal.querySelector('.linkalias-to-login-link');

    const emailInput = modal.querySelector('.linkalias-email-input');
    const passwordInput = modal.querySelector('.linkalias-password-input');
    const loginSubmitBtn = modal.querySelector('.linkalias-auth-submit-btn');
    const loginError = modal.querySelector('.linkalias-login-error');

    const regNameInput = modal.querySelector('.linkalias-reg-name-input');
    const regEmailInput = modal.querySelector('.linkalias-reg-email-input');
    const regPasswordInput = modal.querySelector('.linkalias-reg-password-input');
    const regSubmitBtn = modal.querySelector('.linkalias-auth-reg-submit-btn');
    const regError = modal.querySelector('.linkalias-reg-error');

    // Auto-focus email input
    setTimeout(() => { if (emailInput) emailInput.focus(); }, 50);

    closeBtn.addEventListener('click', closeAuthModal);

    // View toggle handlers
    toRegLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginView.style.display = 'none';
      regView.style.display = 'block';
      regError.style.display = 'none';
      setTimeout(() => { if (regNameInput) regNameInput.focus(); }, 50);
    });

    toLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      regView.style.display = 'none';
      loginView.style.display = 'block';
      loginError.style.display = 'none';
      setTimeout(() => { if (emailInput) emailInput.focus(); }, 50);
    });

    // Login Submission Handler
    async function executeLogin() {
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        loginError.innerText = 'Please enter both email and password.';
        loginError.style.display = 'block';
        return;
      }

      loginError.style.display = 'none';
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.innerText = 'Signing in...';

      try {
        const tokenData = await LinkAliasAPI.login(email, password);
        authToken = tokenData.access_token;

        // Save token to chrome.storage.local
        LinkAliasStorage.saveToken(authToken);

        // Fetch user profile
        currentUser = await LinkAliasAPI.getMe(authToken);

        // Load user's aliases
        await loadUserAliases();

        closeAuthModal();
        removeInjectedAuthUI();

        if (typeof onSuccessCallback === 'function') {
          onSuccessCallback();
        }

      } catch (err) {
        loginError.innerText = err.message || 'Login failed. Please check your credentials.';
        loginError.style.display = 'block';
      } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.innerText = 'Login';
      }
    }

    loginSubmitBtn.addEventListener('click', executeLogin);

    // Enter key submits login
    if (passwordInput) {
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeLogin();
        }
      });
    }

    // Register Submission Handler
    async function executeRegister() {
      const name = regNameInput ? regNameInput.value.trim() : '';
      const email = regEmailInput ? regEmailInput.value.trim() : '';
      const password = regPasswordInput ? regPasswordInput.value : '';

      if (!name || !email || !password) {
        regError.innerText = 'Please fill in all fields.';
        regError.style.display = 'block';
        return;
      }

      if (password.length < 6) {
        regError.innerText = 'Password must be at least 6 characters.';
        regError.style.display = 'block';
        return;
      }

      regError.style.display = 'none';
      regSubmitBtn.disabled = true;
      regSubmitBtn.innerText = 'Creating account...';

      try {
        await LinkAliasAPI.register(name, email, password);

        // Auto-login after registration
        const tokenData = await LinkAliasAPI.login(email, password);
        authToken = tokenData.access_token;

        LinkAliasStorage.saveToken(authToken);
        currentUser = await LinkAliasAPI.getMe(authToken);
        await loadUserAliases();

        closeAuthModal();
        removeInjectedAuthUI();

        if (typeof onSuccessCallback === 'function') {
          onSuccessCallback();
        }

      } catch (err) {
        regError.innerText = err.message || 'Registration failed.';
        regError.style.display = 'block';
      } finally {
        regSubmitBtn.disabled = false;
        regSubmitBtn.innerText = 'Register';
      }
    }

    regSubmitBtn.addEventListener('click', executeRegister);

    if (regPasswordInput) {
      regPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeRegister();
        }
      });
    }
  }

  /**
   * Load current authenticated user's aliases from FastAPI backend.
   */
  async function loadUserAliases() {
    if (!authToken) return;

    try {
      const aliasList = await LinkAliasAPI.getAllAliases(authToken);
      cachedAliases = {};
      if (Array.isArray(aliasList)) {
        aliasList.forEach((item) => {
          if (item.url && item.alias) {
            cachedAliases[item.url] = {
              alias: item.alias,
              originalText: item.originalText || ''
            };
          }
        });
      }
      console.log(`[LinkAlias] Loaded ${Object.keys(cachedAliases).length} aliases for user ${currentUser ? currentUser.email : ''}`);
      scanAndInjectLinks(document);
    } catch (err) {
      console.warn('[LinkAlias] Could not load user aliases:', err.message);
    }
  }

  /**
   * Open LinkAlias Alias UI Popup for a specific hyperlink element.
   * Prompts login modal if user is not authenticated.
   */
  function openAliasPopup(anchor, pencilBtn) {
    // If not authenticated, prompt Login modal first
    if (!authToken || !currentUser) {
      openAuthModal(() => {
        openAliasPopup(anchor, pencilBtn);
      });
      return;
    }

    closeActivePopup();

    const originalText = anchor.getAttribute(ORIGINAL_TEXT_ATTR) || anchor.innerText.trim() || anchor.textContent.trim() || anchor.href;
    const currentAlias = anchor.getAttribute(ALIAS_ATTR) || (cachedAliases[anchor.href] ? cachedAliases[anchor.href].alias : '');
    const originalUrl = anchor.href;
    const hasExistingAlias = Boolean(currentAlias);

    const popup = document.createElement('div');
    popup.className = 'linkalias-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'LinkAlias Popup');

    popup.innerHTML = `
      <div class="linkalias-popup-header">
        <span class="linkalias-popup-title">🔗 LinkAlias</span>
        <button type="button" class="linkalias-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="linkalias-popup-body">
        <div class="linkalias-field-group">
          <span class="linkalias-field-label">Original Link</span>
          <div class="linkalias-link-text" title="${escapeHtml(originalText)}">${escapeHtml(originalText)}</div>
        </div>
        <div class="linkalias-field-group">
          <span class="linkalias-field-label">URL</span>
          <div class="linkalias-link-url" title="${escapeHtml(originalUrl)}">${escapeHtml(originalUrl)}</div>
        </div>
        <div class="linkalias-field-group">
          <label class="linkalias-field-label" for="linkalias-input-field">Alias</label>
          <input type="text" id="linkalias-input-field" class="linkalias-input" placeholder="Enter custom alias..." value="${escapeHtml(currentAlias)}" autocomplete="off" />
        </div>
        <div class="linkalias-feedback-msg" style="display: none;"></div>
      </div>
      <div class="linkalias-popup-footer">
        ${hasExistingAlias ? '<button type="button" class="linkalias-btn linkalias-btn-delete">Delete Alias</button>' : ''}
        <button type="button" class="linkalias-btn linkalias-btn-cancel">Cancel</button>
        <button type="button" class="linkalias-btn linkalias-btn-save">Save</button>
      </div>
    `;

    document.body.appendChild(popup);
    activePopup = popup;

    positionPopup(popup, pencilBtn);

    const input = popup.querySelector('.linkalias-input');
    if (input) {
      setTimeout(() => {
        input.focus();
        if (currentAlias) input.select();
      }, 50);
    }

    const closeBtn = popup.querySelector('.linkalias-close-btn');
    const cancelBtn = popup.querySelector('.linkalias-btn-cancel');
    const saveBtn = popup.querySelector('.linkalias-btn-save');
    const deleteBtn = popup.querySelector('.linkalias-btn-delete');
    const feedbackEl = popup.querySelector('.linkalias-feedback-msg');

    closeBtn.addEventListener('click', closeActivePopup);
    cancelBtn.addEventListener('click', closeActivePopup);

    // Save Action Handler (POST / PUT with Authorization Bearer header)
    async function handleSave() {
      const aliasValue = input ? input.value.trim() : '';

      if (aliasValue && aliasValue !== originalText) {
        anchor.setAttribute(ALIAS_ATTR, aliasValue);
        anchor.textContent = aliasValue;

        try {
          let apiResult;
          if (hasExistingAlias || cachedAliases[originalUrl]) {
            apiResult = await LinkAliasAPI.updateAlias(authToken, originalUrl, aliasValue);
          } else {
            try {
              apiResult = await LinkAliasAPI.createAlias(authToken, originalUrl, aliasValue);
            } catch (err) {
              apiResult = await LinkAliasAPI.updateAlias(authToken, originalUrl, aliasValue);
            }
          }

          cachedAliases[originalUrl] = { alias: aliasValue, originalText: originalText };
          console.log('[LinkAlias] Saved alias to backend:', apiResult);

        } catch (err) {
          console.warn('[LinkAlias] Error saving alias:', err.message);
        }

        if (feedbackEl) {
          feedbackEl.innerText = '✅ Alias saved!';
          feedbackEl.style.display = 'block';
        }
      } else {
        await handleDelete();
        return;
      }

      setTimeout(() => {
        closeActivePopup();
      }, 700);
    }

    // Delete Action Handler (DELETE with Authorization Bearer header)
    async function handleDelete() {
      anchor.removeAttribute(ALIAS_ATTR);
      anchor.textContent = originalText;

      delete cachedAliases[originalUrl];

      try {
        await LinkAliasAPI.deleteAlias(authToken, originalUrl);
        console.log('[LinkAlias] Deleted alias from backend:', originalUrl);
      } catch (err) {
        console.warn('[LinkAlias] Error deleting alias:', err.message);
      }

      if (feedbackEl) {
        feedbackEl.innerText = '🗑️ Alias deleted!';
        feedbackEl.style.display = 'block';
      }

      setTimeout(() => {
        closeActivePopup();
      }, 700);
    }

    saveBtn.addEventListener('click', handleSave);

    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        }
      });
    }

    function handleClickOutside(e) {
      if (popup && !popup.contains(e.target) && !pencilBtn.contains(e.target)) {
        closeActivePopup();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeActivePopup();
      }
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown, true);
      activeGlobalListeners = { handleClickOutside, handleKeyDown };
    }, 10);
  }

  /**
   * Process individual <a> element.
   */
  function processLink(anchor) {
    if (!isValidHyperlink(anchor)) return;

    if (!anchor.hasAttribute(ORIGINAL_TEXT_ATTR)) {
      const initialText = anchor.innerText.trim() || anchor.textContent.trim() || anchor.getAttribute('title') || anchor.href;
      anchor.setAttribute(ORIGINAL_TEXT_ATTR, initialText);
    }

    const urlKey = anchor.href;

    if (cachedAliases[urlKey] && cachedAliases[urlKey].alias) {
      const storedAlias = cachedAliases[urlKey].alias;
      anchor.setAttribute(ALIAS_ATTR, storedAlias);
      anchor.textContent = storedAlias;
    } else {
      const originalText = anchor.getAttribute(ORIGINAL_TEXT_ATTR);
      if (anchor.hasAttribute(ALIAS_ATTR) && originalText) {
        anchor.removeAttribute(ALIAS_ATTR);
        anchor.textContent = originalText;
      }
    }

    if (anchor.hasAttribute(PROCESSED_ATTR)) return;

    anchor.setAttribute(PROCESSED_ATTR, 'true');

    const pencilBtn = document.createElement('button');
    pencilBtn.type = 'button';
    pencilBtn.className = PENCIL_CLASS;
    pencilBtn.innerText = '✏️';
    pencilBtn.setAttribute('title', 'LinkAlias: Assign custom alias');
    pencilBtn.setAttribute('aria-label', 'LinkAlias pencil icon');

    pencilBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      openAliasPopup(anchor, pencilBtn);
    });

    if (anchor.parentNode) {
      anchor.insertAdjacentElement('afterend', pencilBtn);
    }
  }

  /**
   * Scan document for links.
   */
  function scanAndInjectLinks(rootElement = document) {
    const anchors = rootElement.querySelectorAll('a[href]');
    anchors.forEach(processLink);
  }

  /**
   * Setup MutationObserver for dynamic DOM additions.
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let containsNewLinks = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'A' || node.querySelector('a[href]')) {
                containsNewLinks = true;
                break;
              }
            }
          }
        }
        if (containsNewLinks) break;
      }

      if (containsNewLinks) {
        scanAndInjectLinks(document);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Extension Startup & Platform Eligibility Initialization
   */
  function init() {
    const hostname = window.location.hostname;

    // 1. Identify which supported platform current hostname belongs to
    let platformKey = null;
    if (typeof window.LinkAliasConfig !== 'undefined' && typeof window.LinkAliasConfig.getPlatformForHostname === 'function') {
      platformKey = window.LinkAliasConfig.getPlatformForHostname(hostname);
    }

    if (!platformKey) {
      // Hostname is not one of the 5 supported platforms -> do nothing
      return;
    }

    // 2. Check chrome.storage.local for access_token and fetch platform preferences
    LinkAliasStorage.getToken(async (token) => {
      let enabledPlatforms = (typeof window.LinkAliasConfig !== 'undefined' && window.LinkAliasConfig.defaultEnabledPlatforms)
        ? window.LinkAliasConfig.defaultEnabledPlatforms
        : ["whatsapp", "telegram", "discord"];

      if (token) {
        try {
          const user = await LinkAliasAPI.getMe(token);
          authToken = token;
          currentUser = user;
          console.log(`[LinkAlias] Authenticated as ${currentUser.name} (${currentUser.email})`);

          // Fetch user's saved platform preferences from FastAPI backend
          try {
            const prefData = await LinkAliasAPI.getPlatformPreferences(token);
            if (prefData && Array.isArray(prefData.enabled_platforms)) {
              enabledPlatforms = prefData.enabled_platforms;
            }
          } catch (prefErr) {
            console.warn('[LinkAlias] Could not load user platform preferences, using defaults:', prefErr.message);
          }

        } catch (err) {
          console.warn('[LinkAlias] Saved token is invalid or expired:', err.message);
          handleUnauthorized();
        }
      } else {
        console.log('[LinkAlias] No saved access_token found. Using default platform preferences.');
        authToken = null;
        currentUser = null;
      }

      // 3. Check whether current platform is enabled in user preferences
      if (!enabledPlatforms.includes(platformKey)) {
        console.log(`[LinkAlias] Platform "${platformKey}" is disabled for user on "${hostname}". Terminating execution.`);
        return;
      }

      console.log(`[LinkAlias] Platform "${platformKey}" is enabled. Initializing LinkAlias on "${hostname}"...`);

      // Load user's aliases if authenticated
      if (authToken) {
        await loadUserAliases();
      }

      removeInjectedAuthUI();
      scanAndInjectLinks(document);
      setupMutationObserver();
    });
  }

  // Execute when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

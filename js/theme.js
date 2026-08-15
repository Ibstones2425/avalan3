/* ============================================================
   Avalan3 Theme Toggle
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'avalan3-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || LIGHT;
    const next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  // Apply on load (before DOM ready to avoid flash)
  applyTheme(getPreferredTheme());

  // Expose toggle globally
  window.A3 = window.A3 || {};
  window.A3.toggleTheme = toggleTheme;

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? DARK : LIGHT);
    }
  });
})();

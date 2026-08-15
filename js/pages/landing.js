/* ============================================================
   Avalan3 Landing Page JS
   ============================================================ */

(function () {
  'use strict';

  // ---- Theme Toggle ----
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn && window.A3 && window.A3.toggleTheme) {
    themeBtn.addEventListener('click', function () {
      window.A3.toggleTheme();
    });
  }

  // ---- Smooth Scroll ----
  var scrollBtn = document.getElementById('hero-scroll-cta');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = scrollBtn.getAttribute('href');
      if (!targetId) return;
      var target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // ---- Service Worker Registration ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        // SW registration failed — silently ignore
      });
    });
  }
})();

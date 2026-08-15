/* ═══════════════════════════════════════════════════════════
   AVALAN3 — EXPLORE / TOOLKIT PAGE JS
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM Ready ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupThemeToggle();
    setupTabPills();
    setupDiscoverAccordions();
    setupHashtagCopy();
    setupXSearchCopy();
    setupDmCopy();
    createToastElement();
  }

  // ── Theme Toggle ──────────────────────────────────────
  function setupThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.A3 && window.A3.toggleTheme) {
        window.A3.toggleTheme();
      }
    });
  }

  // ── Tab Pills ─────────────────────────────────────────
  function setupTabPills() {
    var pills = document.querySelectorAll('.tab-pill');
    var panels = document.querySelectorAll('.tab-panel');

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var tabId = this.getAttribute('data-tab');

        // Update pills
        pills.forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');

        // Update panels
        panels.forEach(function (panel) { panel.classList.remove('active'); });
        var target = document.getElementById('panel-' + tabId);
        if (target) target.classList.add('active');
      });
    });
  }

  // ── Discover Accordions ───────────────────────────────
  function setupDiscoverAccordions() {
    var toggles = document.querySelectorAll('[data-discover-toggle]');

    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var card = this.closest('[data-discover]');
        if (!card) return;
        card.classList.toggle('open');
      });
    });
  }

  // ── Hashtag Copy ──────────────────────────────────────
  function setupHashtagCopy() {
    // Individual chip copy
    var chips = document.querySelectorAll('.hashtag-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var tag = this.getAttribute('data-hashtag') || this.textContent.trim();
        copyToClipboard(tag);

        // Visual feedback
        var original = this.textContent;
        this.classList.add('copied');
        this.textContent = '✓ Copied';
        var self = this;
        setTimeout(function () {
          self.classList.remove('copied');
          self.textContent = original;
        }, 1500);
      });
    });

    // Copy All buttons
    var copyAllBtns = document.querySelectorAll('[data-copy-all]');
    copyAllBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = this.closest('.hashtag-card');
        if (!card) return;

        var chipsInCard = card.querySelectorAll('.hashtag-chip');
        var tags = [];
        chipsInCard.forEach(function (chip) {
          tags.push(chip.getAttribute('data-hashtag') || chip.textContent.trim());
        });

        copyToClipboard(tags.join(' '));

        // Visual feedback
        var original = this.textContent;
        this.classList.add('copied');
        this.textContent = '✓ Copied';
        var self = this;
        setTimeout(function () {
          self.classList.remove('copied');
          self.textContent = original;
        }, 1500);
      });
    });
  }

  // ── X Search Copy ─────────────────────────────────────
  function setupXSearchCopy() {
    var copyBtns = document.querySelectorAll('[data-xsearch-copy]');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = this.closest('.xsearch-item');
        if (!item) return;

        var code = item.querySelector('.xsearch-code');
        if (!code) return;

        copyToClipboard(code.textContent.trim());

        // Visual feedback
        var original = this.textContent;
        this.classList.add('copied');
        this.textContent = '✓ Copied';
        var self = this;
        setTimeout(function () {
          self.classList.remove('copied');
          self.textContent = original;
        }, 1500);
      });
    });
  }

  // ── DM Script Copy ────────────────────────────────────
  function setupDmCopy() {
    var copyBtns = document.querySelectorAll('[data-dm-copy]');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = this.closest('.dm-card');
        if (!card) return;

        var message = card.querySelector('.dm-card-message');
        if (!message) return;

        copyToClipboard(message.textContent.trim());

        // Visual feedback
        var original = this.textContent;
        this.classList.add('copied');
        this.textContent = '✓ Copied';
        var self = this;
        setTimeout(function () {
          self.classList.remove('copied');
          self.textContent = original;
        }, 1500);
      });
    });
  }

  // ── Clipboard Utility ─────────────────────────────────
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Copied to clipboard');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard');
    } catch (e) {
      showToast('Copy failed — select manually');
    }
    document.body.removeChild(textarea);
  }

  // ── Toast ─────────────────────────────────────────────
  var toastTimer = null;

  function createToastElement() {
    if (document.querySelector('.copy-toast')) return;
    var toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  function showToast(message) {
    var toast = document.querySelector('.copy-toast');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add('visible');

    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
      toastTimer = null;
    }, 2000);
  }

})();

/* ============================================================
   profile.js — Avalan3 Profile Page Logic
   Depends on: config.js, firebase-init.js, auth-guard.js,
               theme.js, utils.js, db.js (all loaded via <script defer>)
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONSTANTS & LOOKUPS
     ---------------------------------------------------------- */

  var LANES = [
    { value: 'community-manager', title: 'Community Manager', desc: 'Build and grow Discord & Telegram communities' },
    { value: 'content-creator',   title: 'Content Creator',   desc: 'Write threads, make videos, build an audience' },
    { value: 'shiller-raider',    title: 'Shiller / Raider',  desc: 'Promote projects, raid comment sections' },
    { value: 'developer',         title: 'Developer',         desc: 'Build dApps, smart contracts, or tooling' },
    { value: 'designer',          title: 'Designer',          desc: 'UI/UX, brand identity, or motion graphics' },
    { value: 'not-sure-yet',      title: 'Not Sure Yet',      desc: 'Explore first — no pressure to pick' }
  ];

  var GOALS = [
    { value: 'first-paid-gig',   title: 'Get My First Paid Gig', desc: 'Land that first Web3 opportunity' },
    { value: 'go-fulltime-web3', title: 'Go Full-Time Web3',     desc: 'Make crypto your primary income source' },
    { value: 'build-reputation', title: 'Build My Reputation',   desc: 'Establish credibility in the space' },
    { value: 'just-exploring',   title: 'Just Exploring',        desc: "See what's out there at my own pace" }
  ];

  var AI_DESCRIPTIONS = {
    gemini: 'Gemini — Fast, helpful AI by Google. Great for research & writing.',
    grok:   'Grok — Bold, witty AI by xAI. Great for creative ideation & analysis.'
  };

  var LANE_DISPLAY = {};
  LANES.forEach(function (l) { LANE_DISPLAY[l.value] = l.title; });

  var GOAL_DISPLAY = {};
  GOALS.forEach(function (g) { GOAL_DISPLAY[g.value] = g.title; });

  /* ----------------------------------------------------------
     DOM REFERENCES
     ---------------------------------------------------------- */

  var dom = {
    /* Header */
    avatar:           document.getElementById('profile-avatar'),
    displayName:      document.getElementById('profile-display-name'),
    laneBadge:        document.getElementById('profile-lane-badge'),
    stageBadge:       document.getElementById('profile-stage-badge'),
    memberSince:      document.getElementById('profile-member-since'),

    /* My Profile */
    settingNameValue: document.getElementById('setting-display-name-value'),
    btnEditName:      document.getElementById('btn-edit-name'),
    editNameRow:      document.getElementById('edit-display-name'),
    inputName:        document.getElementById('input-display-name'),
    btnSaveName:      document.getElementById('btn-save-name'),
    btnCancelName:    document.getElementById('btn-cancel-name'),
    settingLane:      document.getElementById('setting-lane'),
    settingLaneValue: document.getElementById('setting-lane-value'),
    settingGoal:      document.getElementById('setting-goal'),
    settingGoalValue: document.getElementById('setting-goal-value'),

    /* Account */
    settingEmailValue:       document.getElementById('setting-email-value'),
    settingChangePassword:   document.getElementById('setting-change-password'),

    /* AI */
    aiToggle:        document.getElementById('ai-provider-toggle'),
    aiDescription:   document.getElementById('ai-description'),

    /* Theme */
    themeSwitch:     document.getElementById('theme-switch'),

    /* Danger */
    btnSignOut:      document.getElementById('btn-sign-out'),
    btnDeleteAcct:   document.getElementById('btn-delete-account'),

    /* Picker */
    pickerOverlay:   document.getElementById('picker-overlay'),
    pickerSheet:     document.getElementById('picker-sheet'),
    pickerTitle:     document.getElementById('picker-title'),
    pickerOptions:   document.getElementById('picker-options'),
    pickerClose:     document.getElementById('picker-close'),

    /* Delete Modal */
    deleteModal:       document.getElementById('delete-modal'),
    btnDeleteCancel:   document.getElementById('btn-delete-cancel'),
    btnDeleteConfirm:  document.getElementById('btn-delete-confirm')
  };

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  var state = {
    uid: null,
    user: null,     /* Firebase Auth user */
    profile: null,  /* Firestore user doc */
    pickerType: null /* 'lane' | 'goal' */
  };

  /* ----------------------------------------------------------
     RENDER: PROFILE HEADER
     ---------------------------------------------------------- */

  function renderAvatar(user, profile) {
    var el = dom.avatar;
    if (!el) return;

    var photoURL = (user && user.photoURL) || (profile && profile.photoURL);

    if (photoURL) {
      el.innerHTML = '<img src="' + escapeAttr(photoURL) + '" alt="Profile photo" referrerpolicy="no-referrer">';
    } else {
      var name = (profile && profile.displayName) || (user && user.displayName) || '?';
      var initial = name.charAt(0).toUpperCase();
      el.textContent = initial;
    }
  }

  function renderHeader(user, profile) {
    renderAvatar(user, profile);

    var name = (profile && profile.displayName) || (user && user.displayName) || 'Web3er';
    if (dom.displayName) dom.displayName.textContent = name;

    var lane = (profile && profile.lane) || 'not-sure-yet';
    if (dom.laneBadge) dom.laneBadge.textContent = LANE_DISPLAY[lane] || 'Lane';

    var stage = (profile && profile.currentStage) || 0;
    if (dom.stageBadge) dom.stageBadge.textContent = 'Stage ' + stage;

    var createdAt = (profile && profile.createdAt) || (user && user.metadata && user.metadata.creationTime);
    if (dom.memberSince) {
      if (createdAt) {
        var d = (createdAt.toDate && createdAt.toDate()) || new Date(createdAt);
        dom.memberSince.textContent = 'Member since ' + d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        dom.memberSince.textContent = '';
      }
    }
  }

  /* ----------------------------------------------------------
     RENDER: MY PROFILE SECTION
     ---------------------------------------------------------- */

  function renderProfileSettings(profile) {
    var name = (profile && profile.displayName) || '—';
    if (dom.settingNameValue) dom.settingNameValue.textContent = name;

    var lane = (profile && profile.lane) || 'not-sure-yet';
    if (dom.settingLaneValue) dom.settingLaneValue.textContent = LANE_DISPLAY[lane] || lane;

    var goal = (profile && profile.goal) || '';
    if (dom.settingGoalValue) dom.settingGoalValue.textContent = GOAL_DISPLAY[goal] || goal || '—';
  }

  /* ----------------------------------------------------------
     RENDER: ACCOUNT SECTION
     ---------------------------------------------------------- */

  function renderAccount(user) {
    var email = (user && user.email) || '—';
    if (dom.settingEmailValue) dom.settingEmailValue.textContent = email;
  }

  /* ----------------------------------------------------------
     RENDER: AI SETTINGS
     ---------------------------------------------------------- */

  function renderAISettings(profile) {
    var provider = (profile && profile.aiProvider) || AVALAN3_CONFIG.ai.activeProvider || 'gemini';

    /* Update toggle buttons */
    if (dom.aiToggle) {
      var btns = dom.aiToggle.querySelectorAll('.ai-toggle__option');
      btns.forEach(function (btn) {
        var p = btn.getAttribute('data-provider');
        if (p === provider) {
          btn.classList.add('ai-toggle__option--active');
          btn.setAttribute('aria-checked', 'true');
        } else {
          btn.classList.remove('ai-toggle__option--active');
          btn.setAttribute('aria-checked', 'false');
        }
      });
    }

    if (dom.aiDescription) {
      dom.aiDescription.textContent = AI_DESCRIPTIONS[provider] || AI_DESCRIPTIONS.gemini;
    }
  }

  /* ----------------------------------------------------------
     RENDER: THEME SWITCH
     ---------------------------------------------------------- */

  function renderThemeSwitch() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';

    if (dom.themeSwitch) {
      var btns = dom.themeSwitch.querySelectorAll('.theme-switch__option');
      btns.forEach(function (btn) {
        var val = btn.getAttribute('data-theme-val');
        if (val === current) {
          btn.classList.add('theme-switch__option--active');
          btn.setAttribute('aria-checked', 'true');
        } else {
          btn.classList.remove('theme-switch__option--active');
          btn.setAttribute('aria-checked', 'false');
        }
      });
    }
  }

  /* ----------------------------------------------------------
     INLINE EDIT: DISPLAY NAME
     ---------------------------------------------------------- */

  function showNameEdit() {
    if (!dom.editNameRow || !dom.inputName) return;
    dom.inputName.value = (state.profile && state.profile.displayName) || '';
    dom.editNameRow.hidden = false;
    dom.inputName.focus();
  }

  function hideNameEdit() {
    if (dom.editNameRow) dom.editNameRow.hidden = true;
  }

  async function saveNameEdit() {
    var newName = dom.inputName ? dom.inputName.value.trim() : '';
    if (!newName || newName.length < 1) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    try {
      await updateUserProfile(state.uid, { displayName: newName });
      if (state.profile) state.profile.displayName = newName;

      /* Update UI */
      if (dom.settingNameValue) dom.settingNameValue.textContent = newName;
      if (dom.displayName) dom.displayName.textContent = newName;
      renderAvatar(state.user, state.profile);

      hideNameEdit();
      showToast('Display name updated', 'success');
    } catch (err) {
      console.error('[profile] saveName failed:', err);
      showToast('Failed to update name', 'error');
    }
  }

  /* ----------------------------------------------------------
     PICKER SHEET
     ---------------------------------------------------------- */

  function openPicker(type) {
    state.pickerType = type;

    var items = type === 'lane' ? LANES : GOALS;
    var currentVal = type === 'lane'
      ? (state.profile && state.profile.lane) || 'not-sure-yet'
      : (state.profile && state.profile.goal) || '';
    var title = type === 'lane' ? 'Select Lane' : 'Select Goal';

    if (dom.pickerTitle) dom.pickerTitle.textContent = title;

    /* Build options */
    if (dom.pickerOptions) {
      dom.pickerOptions.innerHTML = '';
      items.forEach(function (item) {
        var isSelected = item.value === currentVal;

        var el = document.createElement('div');
        el.className = 'picker-option' + (isSelected ? ' picker-option--selected' : '');
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'radio');
        el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        el.setAttribute('data-value', item.value);

        el.innerHTML =
          '<div class="picker-option__check">' +
            '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<div class="picker-option__content">' +
            '<div class="picker-option__title">' + escapeHTML(item.title) + '</div>' +
            '<div class="picker-option__desc">' + escapeHTML(item.desc) + '</div>' +
          '</div>';

        el.addEventListener('click', function () { onPickerSelect(item.value); });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPickerSelect(item.value);
          }
        });

        dom.pickerOptions.appendChild(el);
      });
    }

    if (dom.pickerOverlay) dom.pickerOverlay.hidden = false;
  }

  function closePicker() {
    if (dom.pickerOverlay) dom.pickerOverlay.hidden = true;
    state.pickerType = null;
  }

  async function onPickerSelect(value) {
    if (!state.pickerType || !state.uid) return;

    var field = state.pickerType; /* 'lane' or 'goal' */
    var update = {};
    update[field] = value;

    try {
      await updateUserProfile(state.uid, update);
      if (state.profile) state.profile[field] = value;

      /* Update UI */
      if (field === 'lane') {
        if (dom.settingLaneValue) dom.settingLaneValue.textContent = LANE_DISPLAY[value] || value;
        if (dom.laneBadge) dom.laneBadge.textContent = LANE_DISPLAY[value] || value;
      } else if (field === 'goal') {
        if (dom.settingGoalValue) dom.settingGoalValue.textContent = GOAL_DISPLAY[value] || value;
      }

      showToast('Updated!', 'success');
      closePicker();
    } catch (err) {
      console.error('[profile] picker update failed:', err);
      showToast('Failed to update', 'error');
    }
  }

  /* ----------------------------------------------------------
     CHANGE PASSWORD
     ---------------------------------------------------------- */

  async function sendPasswordReset() {
    if (!state.user || !state.user.email) return;

    try {
      await firebase.auth().sendPasswordResetEmail(state.user.email);
      showToast('Reset email sent to ' + state.user.email, 'success');
    } catch (err) {
      console.error('[profile] sendPasswordReset failed:', err);
      showToast('Failed to send reset email', 'error');
    }
  }

  /* ----------------------------------------------------------
     AI PROVIDER TOGGLE
     ---------------------------------------------------------- */

  async function setAIProvider(provider) {
    if (!state.uid) return;

    try {
      await updateUserProfile(state.uid, { aiProvider: provider });
      if (state.profile) state.profile.aiProvider = provider;

      /* Update config in memory */
      AVALAN3_CONFIG.ai.activeProvider = provider;

      renderAISettings(state.profile);
      showToast('AI provider set to ' + provider, 'success');
    } catch (err) {
      console.error('[profile] setAIProvider failed:', err);
      showToast('Failed to update AI provider', 'error');
    }
  }

  /* ----------------------------------------------------------
     THEME
     ---------------------------------------------------------- */

  function onThemeSelect(themeVal) {
    document.documentElement.setAttribute('data-theme', themeVal);
    localStorage.setItem('avalan3-theme', themeVal);
    renderThemeSwitch();
  }

  /* ----------------------------------------------------------
     SIGN OUT
     ---------------------------------------------------------- */

  async function signOut() {
    try {
      await firebase.auth().signOut();
      window.location.href = '/auth.html';
    } catch (err) {
      console.error('[profile] signOut failed:', err);
      showToast('Sign out failed', 'error');
    }
  }

  /* ----------------------------------------------------------
     DELETE ACCOUNT
     ---------------------------------------------------------- */

  function openDeleteModal() {
    if (dom.deleteModal) dom.deleteModal.hidden = false;
  }

  function closeDeleteModal() {
    if (dom.deleteModal) dom.deleteModal.hidden = true;
  }

  async function deleteAccount() {
    if (!state.user) return;

    try {
      var uid = state.user.uid;

      /* Firestore cleanup — delete user doc and subcollections */
      await cleanupUserData(uid);

      /* Delete the Firebase Auth user */
      await state.user.delete();

      window.location.href = '/index.html';
    } catch (err) {
      console.error('[profile] deleteAccount failed:', err);

      if (err.code === 'auth/requires-recent-login') {
        showToast('Please sign out and sign in again before deleting your account.', 'error');
      } else {
        showToast('Failed to delete account', 'error');
      }

      closeDeleteModal();
    }
  }

  async function cleanupUserData(uid) {
    try {
      var userRef = db.collection('users').doc(uid);

      /* Delete subcollections: journey, chats, tracker, research */
      var subcollections = ['journey', 'chats', 'tracker', 'research'];
      for (var i = 0; i < subcollections.length; i++) {
        var snap = await userRef.collection(subcollections[i]).get();
        var batch = db.batch();
        snap.forEach(function (doc) { batch.delete(doc.ref); });
        if (!snap.empty) await batch.commit();
      }

      /* Delete the user document itself */
      await userRef.delete();
    } catch (err) {
      console.error('[profile] cleanupUserData failed:', err);
    }
  }

  /* ----------------------------------------------------------
     EVENT BINDINGS
     ---------------------------------------------------------- */

  function bindEvents() {
    /* Edit name */
    if (dom.btnEditName) dom.btnEditName.addEventListener('click', showNameEdit);
    if (dom.btnSaveName) dom.btnSaveName.addEventListener('click', saveNameEdit);
    if (dom.btnCancelName) dom.btnCancelName.addEventListener('click', hideNameEdit);
    if (dom.inputName) {
      dom.inputName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveNameEdit(); }
        if (e.key === 'Escape') { hideNameEdit(); }
      });
    }

    /* Lane picker */
    if (dom.settingLane) {
      dom.settingLane.addEventListener('click', function () { openPicker('lane'); });
      dom.settingLane.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker('lane'); }
      });
    }

    /* Goal picker */
    if (dom.settingGoal) {
      dom.settingGoal.addEventListener('click', function () { openPicker('goal'); });
      dom.settingGoal.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker('goal'); }
      });
    }

    /* Change password */
    if (dom.settingChangePassword) {
      dom.settingChangePassword.addEventListener('click', sendPasswordReset);
      dom.settingChangePassword.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sendPasswordReset(); }
      });
    }

    /* AI provider toggle */
    if (dom.aiToggle) {
      dom.aiToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.ai-toggle__option');
        if (btn && btn.getAttribute('data-provider')) {
          setAIProvider(btn.getAttribute('data-provider'));
        }
      });
    }

    /* Theme switch */
    if (dom.themeSwitch) {
      dom.themeSwitch.addEventListener('click', function (e) {
        var btn = e.target.closest('.theme-switch__option');
        if (btn && btn.getAttribute('data-theme-val')) {
          onThemeSelect(btn.getAttribute('data-theme-val'));
        }
      });
    }

    /* Sign out */
    if (dom.btnSignOut) dom.btnSignOut.addEventListener('click', signOut);

    /* Delete account */
    if (dom.btnDeleteAcct) dom.btnDeleteAcct.addEventListener('click', openDeleteModal);
    if (dom.btnDeleteCancel) dom.btnDeleteCancel.addEventListener('click', closeDeleteModal);
    if (dom.btnDeleteConfirm) dom.btnDeleteConfirm.addEventListener('click', deleteAccount);

    /* Picker close */
    if (dom.pickerClose) dom.pickerClose.addEventListener('click', closePicker);
    if (dom.pickerOverlay) {
      dom.pickerOverlay.addEventListener('click', function (e) {
        if (e.target === dom.pickerOverlay) closePicker();
      });
    }

    /* Modal close on overlay click */
    if (dom.deleteModal) {
      dom.deleteModal.addEventListener('click', function (e) {
        if (e.target === dom.deleteModal) closeDeleteModal();
      });
    }

    /* Escape key to close modals */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (dom.deleteModal && !dom.deleteModal.hidden) closeDeleteModal();
        if (dom.pickerOverlay && !dom.pickerOverlay.hidden) closePicker();
        if (dom.editNameRow && !dom.editNameRow.hidden) hideNameEdit();
      }
    });
  }

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHTML(str);
  }

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */

  async function init() {
    bindEvents();
    renderThemeSwitch();

    /* Wait for Firebase Auth to be ready via auth-guard event */
    window.addEventListener('avalan3:auth-ready', function (e) {
      var detail = e.detail || {};
      state.user = detail.user || currentUser;
      state.profile = detail.profile || userProfile;
      state.uid = state.user ? state.user.uid : null;

      if (!state.uid) return;

      /* Render everything */
      renderHeader(state.user, state.profile);
      renderProfileSettings(state.profile);
      renderAccount(state.user);
      renderAISettings(state.profile);
      renderThemeSwitch();
    });

    /* Fallback: if auth-ready already fired (race condition) */
    if (currentUser) {
      state.user = currentUser;
      state.profile = userProfile;
      state.uid = currentUser.uid;

      renderHeader(state.user, state.profile);
      renderProfileSettings(state.profile);
      renderAccount(state.user);
      renderAISettings(state.profile);
      renderThemeSwitch();
    }
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

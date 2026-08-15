// ═══════════════════════════════════════════════════════════
// AVALAN3 — AUTH PAGE LOGIC
// Handles sign-up, login, and forgot-password modes.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const modePanels = {
    signup: $('#auth-signup'),
    login: $('#auth-login'),
    forgot: $('#auth-forgot')
  };

  // ── State ───────────────────────────────────────────────
  let currentMode = 'signup';
  let isSubmitting = false;

  // ── Firebase Error Map ──────────────────────────────────
  const ERROR_MESSAGES = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Try again or reset it.',
    'auth/invalid-credential': 'Incorrect email or password. Try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
    'auth/popup-closed-by-user': null, // silently dismiss
    'auth/network-request-failed': 'No internet connection. Please check your network.',
    'auth/invalid-login-credentials': 'Incorrect email or password. Try again.'
  };

  function getErrorMessage(error) {
    const code = error.code || error.message?.match(/\(([^)]+)\)/)?.[1] || '';
    const msg = ERROR_MESSAGES[code];
    if (msg === null) return null; // silent
    return msg || error.message || 'An unexpected error occurred. Please try again.';
  }

  // ── Mode Switching ──────────────────────────────────────
  function switchMode(mode) {
    currentMode = mode;

    // Hide all panels
    Object.values(modePanels).forEach(panel => {
      if (panel) panel.classList.remove('active');
    });

    // Show target panel
    if (modePanels[mode]) {
      modePanels[mode].classList.add('active');
    }

    // Clear all error banners and field errors
    clearAllErrors();

    // Update URL hash without reload
    history.replaceState(null, '', `#${mode}`);

    // Focus first input in the new mode
    requestAnimationFrame(() => {
      const firstInput = modePanels[mode]?.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    });
  }

  // ── Validation ──────────────────────────────────────────
  function validateEmail(email) {
    if (!email || !email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    return '';
  }

  function validatePassword(password) {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  function validateName(name) {
    if (!name || !name.trim()) return 'Full name is required.';
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    return '';
  }

  function validateConfirmPassword(password, confirm) {
    if (!confirm) return 'Please confirm your password.';
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  }

  // ── Error Display ───────────────────────────────────────
  function showFieldError(fieldId, message) {
    const input = $(`#${fieldId}`);
    const errorEl = $(`#${fieldId}-error`);
    if (input) input.classList.add('auth-field__input--error');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(fieldId) {
    const input = $(`#${fieldId}`);
    const errorEl = $(`#${fieldId}-error`);
    if (input) input.classList.remove('auth-field__input--error');
    if (errorEl) errorEl.textContent = '';
  }

  function showBannerError(message) {
    const banner = $('#auth-error-banner');
    const bannerText = $('#auth-error-banner-text');
    if (banner && bannerText) {
      bannerText.textContent = message;
      banner.classList.add('visible');
    }
  }

  function hideBannerError() {
    const banner = $('#auth-error-banner');
    if (banner) banner.classList.remove('visible');
  }

  function clearAllErrors() {
    hideBannerError();
    $$('.auth-field__input').forEach(input => input.classList.remove('auth-field__input--error'));
    $$('.auth-field__error').forEach(el => el.textContent = '');
  }

  // ── Loading State ───────────────────────────────────────
  function setSubmitting(button, loading) {
    isSubmitting = loading;
    if (!button) return;

    button.disabled = loading;
    const textEl = button.querySelector('.auth-submit__text');
    const spinnerEl = button.querySelector('.auth-submit__spinner');

    if (loading) {
      if (textEl) textEl.style.visibility = 'hidden';
      if (spinnerEl) spinnerEl.style.display = 'block';
    } else {
      if (textEl) textEl.style.visibility = 'visible';
      if (spinnerEl) spinnerEl.style.display = 'none';
    }
  }

  // ── Firestore: Create User Doc ──────────────────────────
  async function createUserDoc(user, displayName) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists) return doc.data(); // Already exists

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: now,
      updatedAt: now,
      stage: 0,
      xp: 0,
      streak: 0,
      completedOnboarding: false,
      roles: ['member'],
      preferences: {
        theme: 'light',
        notifications: true
      }
    };

    await userRef.set(userData);
    return userData;
  }

  // ── Firestore: Check User Doc Exists ────────────────────
  async function checkUserDocExists(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists;
  }

  // ── Sign Up ─────────────────────────────────────────────
  async function handleSignUp(e) {
    e.preventDefault();
    if (isSubmitting) return;

    clearAllErrors();

    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim();
    const password = $('#signup-password').value;
    const confirmPassword = $('#signup-confirm-password').value;

    // Validate
    let hasError = false;

    const nameErr = validateName(name);
    if (nameErr) { showFieldError('signup-name', nameErr); hasError = true; }

    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('signup-email', emailErr); hasError = true; }

    const passErr = validatePassword(password);
    if (passErr) { showFieldError('signup-password', passErr); hasError = true; }

    const confirmErr = validateConfirmPassword(password, confirmPassword);
    if (confirmErr) { showFieldError('signup-confirm-password', confirmErr); hasError = true; }

    if (hasError) return;

    const button = $('#signup-submit');
    setSubmitting(button, true);

    try {
      // Create Firebase Auth user
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      // Update display name
      await cred.user.updateProfile({ displayName: name });

      // Create Firestore user document
      await createUserDoc(cred.user, name);

      // Redirect to onboarding
      window.location.href = '/onboarding.html';
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg) showBannerError(msg);
    } finally {
      setSubmitting(button, false);
    }
  }

  // ── Log In ──────────────────────────────────────────────
  async function handleLogIn(e) {
    e.preventDefault();
    if (isSubmitting) return;

    clearAllErrors();

    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    let hasError = false;

    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('login-email', emailErr); hasError = true; }

    if (!password) {
      showFieldError('login-password', 'Password is required.');
      hasError = true;
    }

    if (hasError) return;

    const button = $('#login-submit');
    setSubmitting(button, true);

    try {
      await auth.signInWithEmailAndPassword(email, password);
      // Auth state listener in firebase-init or onAuthStateChanged will handle redirect
      // But for explicit redirect:
      window.location.href = '/dashboard.html';
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg) showBannerError(msg);
    } finally {
      setSubmitting(button, false);
    }
  }

  // ── Forgot Password ─────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault();
    if (isSubmitting) return;

    clearAllErrors();

    const email = $('#forgot-email').value.trim();

    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('forgot-email', emailErr); return; }

    const button = $('#forgot-submit');
    setSubmitting(button, true);

    try {
      await auth.sendPasswordResetEmail(email);
      // Show success card
      const successCard = $('#forgot-success');
      if (successCard) successCard.classList.add('visible');
      // Hide the form
      const form = $('#forgot-form');
      if (form) form.style.display = 'none';
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg) showBannerError(msg);
    } finally {
      setSubmitting(button, false);
    }
  }

  // ── Google OAuth ────────────────────────────────────────
  async function handleGoogleSignIn() {
    if (isSubmitting) return;
    clearAllErrors();

    const provider = new firebase.auth.GoogleAuthProvider();
    // Request profile and email
    provider.addScope('profile');
    provider.addScope('email');

    // Determine which button was clicked based on current mode
    const isSignUp = currentMode === 'signup';

    // Disable the OAuth buttons while processing
    const oauthButtons = $$('.auth-oauth');
    oauthButtons.forEach(btn => btn.disabled = true);

    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      const isNewUser = result.additionalUserInfo?.isNewUser;

      if (isNewUser || isSignUp) {
        // Create Firestore doc for new users
        await createUserDoc(user, user.displayName);
        window.location.href = '/onboarding.html';
      } else {
        // Existing user — ensure doc exists (edge case for OAuth users without doc)
        const docExists = await checkUserDocExists(user.uid);
        if (!docExists) {
          await createUserDoc(user, user.displayName);
        }
        window.location.href = '/dashboard.html';
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg) showBannerError(msg);
    } finally {
      oauthButtons.forEach(btn => btn.disabled = false);
    }
  }

  // ── Password Visibility Toggle ──────────────────────────
  function setupPasswordToggle(toggleBtn, inputId) {
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const input = $(`#${inputId}`);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      input.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

      // Swap icon
      const eyeOpen = toggleBtn.querySelector('.icon-eye-open');
      const eyeClosed = toggleBtn.querySelector('.icon-eye-closed');

      if (eyeOpen && eyeClosed) {
        eyeOpen.style.display = isPassword ? 'none' : 'block';
        eyeClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  // ── Live Field Validation (clear errors on input) ───────
  function setupLiveClear(inputId) {
    const input = $(`#${inputId}`);
    if (!input) return;

    input.addEventListener('input', () => {
      clearFieldError(inputId);
      hideBannerError();
    });
  }

  // ── Init ────────────────────────────────────────────────
  function init() {
    // Read initial mode from URL hash
    const hash = window.location.hash.replace('#', '');
    const validModes = ['signup', 'login', 'forgot'];
    const initialMode = validModes.includes(hash) ? hash : 'signup';
    switchMode(initialMode);

    // ── Mode switch links
    const toLogin = $('#switch-to-login');
    const toSignup = $('#switch-to-signup');
    const toForgot = $('#switch-to-forgot');
    const backToLogin = $('#back-to-login');

    if (toLogin) toLogin.addEventListener('click', (e) => { e.preventDefault(); switchMode('login'); });
    if (toSignup) toSignup.addEventListener('click', (e) => { e.preventDefault(); switchMode('signup'); });
    if (toForgot) toForgot.addEventListener('click', (e) => { e.preventDefault(); switchMode('forgot'); });
    if (backToLogin) backToLogin.addEventListener('click', (e) => { e.preventDefault(); switchMode('login'); });

    // ── Form submissions
    const signupForm = $('#signup-form');
    const loginForm = $('#login-form');
    const forgotForm = $('#forgot-form');

    if (signupForm) signupForm.addEventListener('submit', handleSignUp);
    if (loginForm) loginForm.addEventListener('submit', handleLogIn);
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

    // ── Google OAuth buttons
    $$('.auth-oauth').forEach(btn => {
      btn.addEventListener('click', handleGoogleSignIn);
    });

    // ── Password visibility toggles
    setupPasswordToggle($('#toggle-signup-password'), 'signup-password');
    setupPasswordToggle($('#toggle-signup-confirm-password'), 'signup-confirm-password');
    setupPasswordToggle($('#toggle-login-password'), 'login-password');

    // ── Live field error clearing
    setupLiveClear('signup-name');
    setupLiveClear('signup-email');
    setupLiveClear('signup-password');
    setupLiveClear('signup-confirm-password');
    setupLiveClear('login-email');
    setupLiveClear('login-password');
    setupLiveClear('forgot-email');

    // ── Keyboard: Enter on last field submits form
    const signupConfirm = $('#signup-confirm-password');
    if (signupConfirm) {
      signupConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); signupForm?.requestSubmit(); }
      });
    }

    const loginPass = $('#login-password');
    if (loginPass) {
      loginPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); loginForm?.requestSubmit(); }
      });
    }

    const forgotEmail = $('#forgot-email');
    if (forgotEmail) {
      forgotEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); forgotForm?.requestSubmit(); }
      });
    }
  }

  // ── Boot when DOM is ready ──────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

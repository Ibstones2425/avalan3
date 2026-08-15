// ═══════════════════════════════════════════════════════════
// AVALAN3 — ONBOARDING PAGE LOGIC
// Two-phase wizard: 4 splash screens → 4 setup steps
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────
  const SPLASH_INTERVAL = 3500;   // 3.5s auto-advance
  const TOTAL_SPLASHES = 4;
  const TOTAL_STEPS   = 4;

  // ── State ─────────────────────────────────────────────
  let currentSplash = 0;
  let currentStep   = 1;
  let splashTimer   = null;
  let splashSkipped = false;

  const answers = {
    experience: null,   // Step 1
    lane: null,         // Step 2
    goal: null,         // Step 3
    timeCommit: null    // Step 4
  };

  // Step → answer key mapping
  const stepAnswerKeys = {
    1: 'experience',
    2: 'lane',
    3: 'goal',
    4: 'timeCommit'
  };

  // ── DOM References ────────────────────────────────────
  const splashPhase    = document.getElementById('splash-phase');
  const setupPhase     = document.getElementById('setup-phase');
  const splashSkipBtn  = document.getElementById('splash-skip');
  const splashTrack    = document.getElementById('splash-track');
  const splashDotsWrap = document.getElementById('splash-dots');
  const setupBackBtn   = document.getElementById('setup-back');
  const setupNextBtn   = document.getElementById('setup-next');
  const setupNextText  = document.getElementById('setup-next-text');
  const setupNextArrow = document.getElementById('setup-next-arrow');
  const setupNextSpinner = document.getElementById('setup-next-spinner');
  const setupProgressFill = document.getElementById('setup-progress-fill');
  const setupStepCurrent  = document.getElementById('setup-step-current');
  const setupTrack     = document.getElementById('setup-track');

  const splashSlides = splashTrack ? Array.from(splashTrack.querySelectorAll('.splash-slide')) : [];
  const splashDots   = splashDotsWrap ? Array.from(splashDotsWrap.querySelectorAll('.splash-dot')) : [];
  const setupSteps   = setupTrack ? Array.from(setupTrack.querySelectorAll('.setup-step')) : [];

  // ═══════════════════════════════════════════════════════════
  //  PHASE A — SPLASH SCREENS
  // ═══════════════════════════════════════════════════════════

  function showSplash(index) {
    splashSlides.forEach((slide, i) => {
      slide.classList.remove('splash-slide--active', 'splash-slide--exit');
      if (i === index) {
        slide.classList.add('splash-slide--active');
      } else if (i < index) {
        slide.classList.add('splash-slide--exit');
      }
    });

    splashDots.forEach((dot, i) => {
      dot.classList.toggle('splash-dot--active', i === index);
    });

    currentSplash = index;
  }

  function advanceSplash() {
    if (currentSplash < TOTAL_SPLASHES - 1) {
      showSplash(currentSplash + 1);
    } else {
      // Last splash → transition to setup
      transitionToSetup();
    }
  }

  function startSplashTimer() {
    stopSplashTimer();
    splashTimer = setInterval(advanceSplash, SPLASH_INTERVAL);
  }

  function stopSplashTimer() {
    if (splashTimer) {
      clearInterval(splashTimer);
      splashTimer = null;
    }
  }

  function skipSplash() {
    if (splashSkipped) return;
    splashSkipped = true;
    stopSplashTimer();
    transitionToSetup();
  }

  function transitionToSetup() {
    stopSplashTimer();

    // Fade out splash phase
    splashPhase.classList.remove('onboarding-phase--active');

    // After fade, show setup phase
    setTimeout(() => {
      setupPhase.classList.add('onboarding-phase--active');
      showStep(1);
    }, 400);
  }

  // ── Splash event listeners ────────────────────────────
  if (splashSkipBtn) {
    splashSkipBtn.addEventListener('click', skipSplash);
  }

  // Tap anywhere on splash to advance (except skip button)
  if (splashTrack) {
    splashTrack.addEventListener('click', (e) => {
      if (e.target.closest('.splash-skip')) return;
      stopSplashTimer();
      advanceSplash();
      // Restart timer after manual advance
      if (currentSplash < TOTAL_SPLASHES - 1) {
        startSplashTimer();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE B — SETUP STEPS
  // ═══════════════════════════════════════════════════════════

  function showStep(step, direction) {
    // direction: 'forward' | 'back' | undefined (initial)
    currentStep = step;

    // Update step panels
    setupSteps.forEach((panel, i) => {
      const stepNum = i + 1;
      panel.classList.remove('setup-step--active', 'setup-step--exit-left');

      if (stepNum === step) {
        panel.classList.add('setup-step--active');
        // Reset scroll position
        panel.scrollTop = 0;
      } else if (direction === 'back' && stepNum > step) {
        panel.classList.remove('setup-step--active');
      } else if (direction === 'forward' && stepNum < step) {
        panel.classList.add('setup-step--exit-left');
      }
    });

    // Update progress bar
    const progressPercent = (step / TOTAL_STEPS) * 100;
    if (setupProgressFill) {
      setupProgressFill.style.width = progressPercent + '%';
    }

    // Update step counter
    if (setupStepCurrent) {
      setupStepCurrent.textContent = step;
    }

    // Back button visibility
    if (setupBackBtn) {
      setupBackBtn.classList.toggle('setup-back--hidden', step === 1);
    }

    // Update Next button state
    updateNextButton();

    // Restore selection state for this step
    restoreSelection(step);
  }

  function restoreSelection(step) {
    const stepPanel = setupSteps[step - 1];
    if (!stepPanel) return;

    const answerKey = stepAnswerKeys[step];
    const savedValue = answers[answerKey];

    stepPanel.querySelectorAll('.option-card').forEach(card => {
      const isSelected = card.dataset.value === savedValue;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }

  function updateNextButton() {
    const answerKey = stepAnswerKeys[currentStep];
    const hasSelection = answers[answerKey] !== null;

    if (setupNextBtn) {
      setupNextBtn.disabled = !hasSelection;
    }

    // Update button text
    if (setupNextText) {
      setupNextText.textContent = currentStep === TOTAL_STEPS ? "Let's Go" : 'Next';
    }
  }

  function selectOption(step, value, cardElement) {
    const answerKey = stepAnswerKeys[step];
    answers[answerKey] = value;

    // Update visual state within this step
    const stepPanel = setupSteps[step - 1];
    if (stepPanel) {
      stepPanel.querySelectorAll('.option-card').forEach(card => {
        const isSelected = card === cardElement;
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      });
    }

    updateNextButton();
  }

  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1, 'forward');
    } else {
      // Step 4 complete → save to Firestore
      completeOnboarding();
    }
  }

  function goBack() {
    if (currentStep > 1) {
      showStep(currentStep - 1, 'back');
    }
  }

  async function completeOnboarding() {
    // Show loading state
    if (setupNextBtn) setupNextBtn.disabled = true;
    if (setupNextText) setupNextText.style.display = 'none';
    if (setupNextArrow) setupNextArrow.style.display = 'none';
    if (setupNextSpinner) setupNextSpinner.style.display = 'inline-block';

    try {
      // Wait for auth to be ready
      const user = await getAuthUser();

      if (!user) {
        throw new Error('No authenticated user');
      }

      // Build the profile data
      const profileData = {
        onboardingComplete: true,
        currentStage: 0,
        experience: answers.experience,
        lane: answers.lane,
        goal: answers.goal,
        timeCommit: answers.timeCommit,
        onboardedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Save to Firestore: /users/{uid}
      await updateUserProfile(user.uid, profileData);

      // Redirect to dashboard
      window.location.href = '/dashboard.html';

    } catch (err) {
      console.error('Onboarding save failed:', err);

      // Show error state
      if (setupNextSpinner) setupNextSpinner.style.display = 'none';
      if (setupNextText) {
        setupNextText.style.display = 'inline';
        setupNextText.textContent = 'Retry';
      }
      if (setupNextArrow) setupNextArrow.style.display = 'none';
      if (setupNextBtn) setupNextBtn.disabled = false;

      if (typeof showToast === 'function') {
        showToast('Something went wrong. Please try again.', 'error');
      }
    }
  }

  /**
   * Wait for the auth state to be resolved.
   * Since auth-guard.js dispatches 'avalan3:auth-ready',
   * we listen for that. On the onboarding page itself,
   * auth-guard redirects away only if onboarding IS complete,
   * so on this page we just need the user uid.
   */
  function getAuthUser() {
    return new Promise((resolve) => {
      // Check if already available
      if (typeof currentUser !== 'undefined' && currentUser) {
        resolve(currentUser);
        return;
      }

      // Listen for the auth-ready event
      const handler = (e) => {
        window.removeEventListener('avalan3:auth-ready', handler);
        resolve(e.detail?.user || null);
      };
      window.addEventListener('avalan3:auth-ready', handler);

      // Timeout fallback — check firebase.auth().currentUser
      setTimeout(() => {
        window.removeEventListener('avalan3:auth-ready', handler);
        if (typeof auth !== 'undefined' && auth.currentUser) {
          resolve(auth.currentUser);
        } else {
          resolve(null);
        }
      }, 5000);
    });
  }

  // ── Setup event listeners ─────────────────────────────

  // Option card clicks
  if (setupTrack) {
    setupTrack.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (!card) return;

      const stepPanel = card.closest('.setup-step');
      if (!stepPanel) return;

      const stepNum = parseInt(stepPanel.dataset.step, 10);
      const value = card.dataset.value;

      selectOption(stepNum, value, card);
    });

    // Keyboard support for option cards
    setupTrack.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;

      const card = e.target.closest('.option-card');
      if (!card) return;

      e.preventDefault();
      const stepPanel = card.closest('.setup-step');
      if (!stepPanel) return;

      const stepNum = parseInt(stepPanel.dataset.step, 10);
      const value = card.dataset.value;

      selectOption(stepNum, value, card);
    });
  }

  // Next button
  if (setupNextBtn) {
    setupNextBtn.addEventListener('click', goNext);
  }

  // Back button
  if (setupBackBtn) {
    setupBackBtn.addEventListener('click', goBack);
  }

  // ═══════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  // Show first splash slide and start auto-advance timer
  showSplash(0);
  startSplashTimer();

})();

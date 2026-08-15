// ═══════════════════════════════════════════════════════════
// AVALAN3 — ONBOARDING v2
// 2-step flow: Lane → Work Style → Done
// Target: intermediate to professional Web3 operators
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  var answers = { lane: null, workStyle: null };
  var currentStep = 1;

  // ── DOM ───────────────────────────────────────────────
  var step1       = document.getElementById('step-1');
  var step2       = document.getElementById('step-2');
  var progressFill= document.getElementById('progress-fill');
  var stepIndicator=document.getElementById('step-indicator');
  var btnNext1    = document.getElementById('btn-next-1');
  var btnBack2    = document.getElementById('btn-back-2');
  var btnFinish   = document.getElementById('btn-finish');
  var finishLabel = document.getElementById('finish-label');
  var finishSpinner=document.getElementById('finish-spinner');
  var errorBanner = document.getElementById('onboarding-error');
  var errorText   = document.getElementById('onboarding-error-text');

  var laneOptions     = document.querySelectorAll('#lane-options .onboarding-option');
  var workStyleOptions= document.querySelectorAll('#workstyle-options .onboarding-option');

  // ── Option selection ──────────────────────────────────

  function bindOptions(optionEls, key, nextBtn) {
    optionEls.forEach(function (btn) {
      btn.addEventListener('click', function () {
        optionEls.forEach(function (b) {
          b.classList.remove('onboarding-option--selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('onboarding-option--selected');
        btn.setAttribute('aria-pressed', 'true');
        answers[key] = btn.dataset.value;
        nextBtn.disabled = false;
      });
    });
  }

  bindOptions(laneOptions, 'lane', btnNext1);
  bindOptions(workStyleOptions, 'workStyle', btnFinish);

  // ── Navigation ────────────────────────────────────────

  btnNext1.addEventListener('click', function () {
    goToStep(2);
  });

  btnBack2.addEventListener('click', function () {
    goToStep(1);
  });

  function goToStep(n) {
    currentStep = n;
    step1.classList.toggle('onboarding-step--active', n === 1);
    step2.classList.toggle('onboarding-step--active', n === 2);
    progressFill.style.width = n === 1 ? '50%' : '100%';
    stepIndicator.textContent = n + ' of 2';
    hideError();
  }

  // ── Finish ────────────────────────────────────────────

  btnFinish.addEventListener('click', async function () {
    if (!answers.lane || !answers.workStyle) return;

    setLoading(true);
    hideError();

    var uid = null;
    try {
      var user = firebase.auth().currentUser;
      if (!user) {
        // Wait for auth state
        user = await new Promise(function (resolve) {
          var unsub = firebase.auth().onAuthStateChanged(function (u) {
            unsub();
            resolve(u);
          });
        });
      }
      if (!user) throw new Error('Not authenticated');
      uid = user.uid;
    } catch (err) {
      showError('Authentication error. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      var db = firebase.firestore();
      await db.collection('users').doc(uid).set({
        lane: answers.lane,
        workStyle: answers.workStyle,
        onboardingComplete: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      window.location.href = '/dashboard.html';
    } catch (err) {
      console.error('[onboarding] save failed:', err);
      showError('Could not save your profile. Check your connection and try again.');
      setLoading(false);
    }
  });

  // ── Helpers ───────────────────────────────────────────

  function setLoading(on) {
    btnFinish.disabled = on;
    finishLabel.hidden = on;
    finishSpinner.hidden = !on;
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.hidden = false;
  }

  function hideError() {
    errorBanner.hidden = true;
  }

  // ── Auth guard (redirect to auth if not signed in) ────

  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) window.location.href = '/auth.html';
  });

})();

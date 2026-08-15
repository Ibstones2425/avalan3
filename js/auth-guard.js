// ═══════════════════════════════════════════════════════════
// AVALAN3 — AUTH GUARD
// Protects pages that require authentication.
// Call this script FIRST in <head> on all protected pages.
// ═══════════════════════════════════════════════════════════

let currentUser = null;
let userProfile = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }

  currentUser = user;

  // Check if onboarding is complete
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      userProfile = doc.data();
      if (!userProfile.onboardingComplete) {
        // Don't redirect if already on onboarding page
        if (!window.location.pathname.includes('onboarding')) {
          window.location.href = '/onboarding.html';
        }
        return;
      }
    } else {
      // No profile doc — redirect to onboarding
      if (!window.location.pathname.includes('onboarding')) {
        window.location.href = '/onboarding.html';
      }
      return;
    }
  } catch (err) {
    console.error('Auth guard: Firestore read failed', err);
  }

  // Dispatch event so page scripts know auth is ready
  window.dispatchEvent(new CustomEvent('avalan3:auth-ready', {
    detail: { user: currentUser, profile: userProfile }
  }));
});

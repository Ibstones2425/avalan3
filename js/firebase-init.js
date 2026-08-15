// ═══════════════════════════════════════════════════════════
// AVALAN3 — FIREBASE INIT
// Loads Firebase SDK from CDN and initializes app.
// ═══════════════════════════════════════════════════════════

// Firebase compat SDK is loaded via CDN in HTML <head>
const firebaseApp = firebase.initializeApp(AVALAN3_CONFIG.firebase);
const auth = firebase.auth();
const db = firebase.firestore();

// ── Firestore settings ──────────────────────────────────
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence({ synchronizeTabs: true }).catch(() => {
  // Persistence failed — continue without offline support
});

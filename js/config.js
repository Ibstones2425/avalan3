// ═══════════════════════════════════════════════════════════
// AVALAN3 — CONFIGURATION FILE
// Replace all placeholder values below with your real keys.
// DO NOT commit this file to a public repository with real keys.
// NOTE: API keys are client-side for MVP. Move to Firebase Functions for production.
// ═══════════════════════════════════════════════════════════

const AVALAN3_CONFIG = {
    // ── FIREBASE ──────────────────────────────────────────
    firebase: {
        apiKey: "AIzaSyC_BdU4KkJvWE0qoyHLtyGN1ZfhdKjFNl8",
        authDomain: "avalan3-f7356.firebaseapp.com",
        projectId: "avalan3-f7356",
        storageBucket: "avalan3-f7356.firebasestorage.app",
        messagingSenderId: "265761248432",
        appId: "1:265761248432:web:49545038565192c3769775"
    },

    // ── AI PROVIDERS ──────────────────────────────────────
    // ai: {
    //     activeProvider: "gemini",

    //     gemini: {
    //         apiKey: "AQ.Ab8RN6IidDn1QCa827C_HAAeKhbc8a0FdvymJoW9lr9RiZWKXQ",
    //         model: "gemini-2.5-flash",
    //         baseUrl: "https://generativelanguage.googleapis.com/v1beta/models"
    //     },

    //     grok: {
    //         apiKey: "xai-wi0tx7zWAhIWpt6wfKrBsDYGG5uGW2jJdBtgjpSKLv6K2z176mOApE9GPpVy2OuvOpcCJUpF2LWWzH2F",
    //         model: "grok-3-mini",
    //         baseUrl: "https://api.x.ai/v1/chat/completions"
    //     }
    // },
    // ── AI PROVIDERS ──────────────────────────────────────
    ai: {
        activeProvider: "gemini",

        gemini: {
            // Replace with a valid key starting with AIzaSy...
            apiKey: "AQ.Ab8RN6IidDn1QCa827C_HAAeKhbc8a0FdvymJoW9lr9RiZWKXQ",
            model: "gemini-2.5-flash",
            // Clean base URL for API queries
            baseUrl: "https://generativelanguage.googleapis.com/v1beta"
        },

        grok: {
            apiKey: "xai-wi0tx7zWAhIWpt6wfKrBsDYGG5uGW2jJdBtgjpSKLv6K2z176mOApE9GPpVy2OuvOpcCJUpF2LWWzH2F",
            // Updated to an active, supported model
            model: "grok-2-mini",
            baseUrl: "https://api.x.ai/v1/chat/completions"
        }
    },

    // ── WEB SEARCH (Serper.dev) ───────────────────────────
    serper: {
        apiKey: "670c59c4c6d5c42bfaf7ecf4107fa1de0213fcfd",
        endpoint: "https://google.serper.dev/search"
    },

    // ── APP SETTINGS ──────────────────────────────────────
    app: {
        name: "Avalan3",
        version: "1.0.0",
        defaultTheme: "light"
    }
};

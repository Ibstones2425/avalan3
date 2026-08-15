/* ============================================================
   dashboard.js — Avalan3 Dashboard Page Logic
   Depends on: config.js, firebase-init.js, auth-guard.js,
               utils.js, db.js (all loaded via <script defer>)
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONSTANTS & LOOKUPS
     ---------------------------------------------------------- */

  /** Stage descriptions used in the subtitle of the Stage Card */
  const STAGE_DESCRIPTIONS = {
    0: 'Begin your Web3 earning journey',
    1: 'Build your Web3 identity and presence',
    2: 'Learn to research projects and find gaps',
    3: 'Start reaching out and landing conversations',
    4: 'Deliver work and build your reputation',
    5: 'Scale your income and client base'
  };

  /** Today's mission text per stage */
  const MISSION_TEXT = {
    0: 'Read the Community Manager guide in your Journey. Understand what projects look for.',
    1: 'Set up your X profile with a clear Web3 content niche in your bio.',
    2: 'Find 3 newly funded projects on CryptoRank. Identify their community gaps.',
    3: 'Send 5 cold DMs today using the DM Script templates in your Toolkit.',
    4: 'Deliver your current gig professionally and request a testimonial.',
    5: 'Raise your rates and on-board a second client.'
  };

  /** Mission link destination per stage */
  const MISSION_LINKS = {
    0: '/journey.html',
    1: '/profile.html',
    2: '/research.html',
    3: '/toolkit.html',
    4: '/tracker.html',
    5: '/tracker.html'
  };

  /** Stage completion thresholds (percentage of tasks done per stage) */
  const STAGE_TASK_COUNTS = [5, 6, 5, 7, 5, 4];

  /* ----------------------------------------------------------
     DOM REFERENCES
     ---------------------------------------------------------- */

  const dom = {
    greetingText:     document.getElementById('greeting-text'),
    userFirstName:    document.getElementById('user-first-name'),
    stageBadge:       document.getElementById('stage-badge'),
    stageProgressFill:document.getElementById('stage-progress-fill'),
    stageProgressLabel:document.getElementById('stage-progress-label'),
    stageSubtitle:    document.getElementById('stage-subtitle'),
    missionText:      document.getElementById('mission-text'),
    missionLink:      document.getElementById('mission-link'),
    streakText:       document.getElementById('streak-text'),
    statDmsValue:     document.getElementById('stat-dms-value'),
    statRepliesValue: document.getElementById('stat-replies-value'),
    statGigsValue:    document.getElementById('stat-gigs-value')
  };

  /* ----------------------------------------------------------
     GREETING (fallback if utils.js not yet available)
     ---------------------------------------------------------- */

  function getGreeting() {
    /* Prefer the shared util if loaded */
    if (typeof window.getGreeting === 'function') {
      return window.getGreeting();
    }
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  /* ----------------------------------------------------------
     STAGE NAME (fallback if utils.js not yet available)
     ---------------------------------------------------------- */

  function getStageName(stage) {
    if (typeof window.getStageName === 'function') {
      return window.getStageName(stage);
    }
    const names = [
      'Explorer', 'Identity Builder', 'Researcher',
      'Outreach Pro', 'Earner', 'Scaler'
    ];
    return names[stage] || 'Explorer';
  }

  /* ----------------------------------------------------------
     STREAK CALCULATION
     ---------------------------------------------------------- */

  /**
   * Calculate current streak from Firestore user doc fields.
   * @param {number} streakDays  - previously recorded streak count
   * @param {string|Date} lastActiveDate - last active timestamp
   * @returns {number} updated streak
   */
  function calculateStreak(streakDays, lastActiveDate) {
    if (!lastActiveDate) return 1;

    const now  = new Date();
    const last = new Date(lastActiveDate);

    /* Normalize both to midnight for day-level comparison */
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay  = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const diffMs   = today.getTime() - lastDay.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 0) {
      /* Active today — streak unchanged */
      return streakDays || 1;
    }
    if (diffDays === 1) {
      /* Active yesterday — increment streak */
      return (streakDays || 0) + 1;
    }
    /* Gap > 1 day — streak broken, restart at 1 */
    return 1;
  }

  /* ----------------------------------------------------------
     SKELETON HELPERS
     ---------------------------------------------------------- */

  function showSkeleton(tileId) {
    const tile = document.getElementById(tileId);
    if (!tile) return;
    const skeleton = tile.querySelector('[data-skeleton]');
    const content  = tile.querySelector('[data-content]');
    if (skeleton) skeleton.hidden = false;
    if (content)  content.hidden  = true;
  }

  function hideSkeleton(tileId) {
    const tile = document.getElementById(tileId);
    if (!tile) return;
    const skeleton = tile.querySelector('[data-skeleton]');
    const content  = tile.querySelector('[data-content]');
    if (skeleton) skeleton.hidden = true;
    if (content)  content.hidden  = false;
  }

  /* ----------------------------------------------------------
     RENDER: TOP BAR
     ---------------------------------------------------------- */

  function renderGreeting(firstName) {
    if (dom.greetingText)  dom.greetingText.textContent  = getGreeting();
    if (dom.userFirstName) dom.userFirstName.textContent  = firstName || 'Web3er';
  }

  /* ----------------------------------------------------------
     RENDER: STAGE CARD
     ---------------------------------------------------------- */

  function renderStageCard(currentStage, tasksCompleted) {
    const stage     = currentStage || 0;
    const completed = tasksCompleted || 0;
    const total     = STAGE_TASK_COUNTS[stage] || 5;
    const pct       = Math.min(100, Math.round((completed / total) * 100));
    const name      = getStageName(stage);

    if (dom.stageBadge) {
      dom.stageBadge.textContent = `Stage ${stage} \u2014 ${name}`;
    }
    if (dom.stageProgressFill) {
      dom.stageProgressFill.style.width = `${pct}%`;
    }
    if (dom.stageProgressLabel) {
      dom.stageProgressLabel.textContent = `${pct}% complete`;
    }
    if (dom.stageSubtitle) {
      dom.stageSubtitle.textContent = STAGE_DESCRIPTIONS[stage] || STAGE_DESCRIPTIONS[0];
    }
  }

  /* ----------------------------------------------------------
     RENDER: MISSION CARD
     ---------------------------------------------------------- */

  function renderMission(currentStage) {
    const stage = currentStage || 0;
    if (dom.missionText) {
      dom.missionText.textContent = MISSION_TEXT[stage] || MISSION_TEXT[0];
    }
    if (dom.missionLink) {
      dom.missionLink.href = MISSION_LINKS[stage] || '/journey.html';
    }
  }

  /* ----------------------------------------------------------
     RENDER: QUICK STATS
     ---------------------------------------------------------- */

  function renderStats(dms, replies, gigs) {
    if (dom.statDmsValue)     dom.statDmsValue.textContent     = dms     ?? 0;
    if (dom.statRepliesValue) dom.statRepliesValue.textContent = replies ?? 0;
    if (dom.statGigsValue)    dom.statGigsValue.textContent    = gigs    ?? 0;

    hideSkeleton('stat-dms');
    hideSkeleton('stat-replies');
    hideSkeleton('stat-gigs');
  }

  /* ----------------------------------------------------------
     RENDER: STREAK
     ---------------------------------------------------------- */

  function renderStreak(days) {
    const d = days || 0;
    if (dom.streakText) {
      dom.streakText.textContent = `${d} day${d !== 1 ? 's' : ''} streak`;
    }
  }

  /* ----------------------------------------------------------
     FIRESTORE: LOAD USER PROFILE
     ---------------------------------------------------------- */

  async function loadUserProfile(uid) {
    try {
      const db   = window.db;  /* from db.js */
      const doc  = await db.collection('users').doc(uid).get();
      if (!doc.exists) return null;
      return doc.data();
    } catch (err) {
      console.error('[dashboard] loadUserProfile failed:', err);
      return null;
    }
  }

  /* ----------------------------------------------------------
     FIRESTORE: LOAD TRACKER STATS
     ---------------------------------------------------------- */

  async function loadTrackerStats(uid) {
    try {
      const db   = window.db;
      const snap = await db.collection('users').doc(uid)
        .collection('tracker')
        .get();

      let dms     = 0;
      let replies = 0;
      let gigs    = 0;

      snap.forEach(function (doc) {
        const entry = doc.data();
        if (entry.type === 'dm_sent')    dms++;
        if (entry.type === 'reply')      replies++;
        if (entry.type === 'gig_landed') gigs++;
      });

      return { dms: dms, replies: replies, gigs: gigs };
    } catch (err) {
      console.error('[dashboard] loadTrackerStats failed:', err);
      return { dms: 0, replies: 0, gigs: 0 };
    }
  }

  /* ----------------------------------------------------------
     FIRESTORE: UPDATE STREAK ON LOAD
     ---------------------------------------------------------- */

  async function updateStreak(uid, currentStreakDays, lastActiveDate) {
    const newStreak = calculateStreak(currentStreakDays, lastActiveDate);
    try {
      const db = window.db;
      await db.collection('users').doc(uid).update({
        streakDays:     newStreak,
        lastActiveDate: new Date().toISOString()
      });
    } catch (err) {
      console.error('[dashboard] updateStreak failed:', err);
    }
    return newStreak;
  }

  /* ----------------------------------------------------------
     INIT — ORCHESTRATE EVERYTHING ON PAGE LOAD
     ---------------------------------------------------------- */

  async function init() {
    /* 1. Show skeletons immediately */
    showSkeleton('stat-dms');
    showSkeleton('stat-replies');
    showSkeleton('stat-gigs');

    /* 2. Render greeting right away (doesn't need Firestore) */
    renderGreeting();

    /* 3. Wait for Firebase Auth to be ready */
    let uid = null;
    try {
      const auth = window.firebaseAuth || (firebase && firebase.auth());
      if (auth) {
        const user = auth.currentUser || (await new Promise(function (resolve) {
          const unsub = auth.onAuthStateChanged(function (u) {
            unsub();
            resolve(u);
          });
        }));
        if (user) uid = user.uid;
      }
    } catch (err) {
      console.error('[dashboard] auth check failed:', err);
    }

    if (!uid) {
      /* Not authenticated — render with defaults */
      renderStageCard(0, 0);
      renderMission(0);
      renderStats(0, 0, 0);
      renderStreak(0);
      return;
    }

    /* 4. Load user profile in parallel with tracker stats */
    const [profile, stats] = await Promise.all([
      loadUserProfile(uid),
      loadTrackerStats(uid)
    ]);

    /* 5. Extract profile fields with safe defaults */
    const firstName       = (profile && profile.firstName)       || 'Web3er';
    const currentStage    = (profile && profile.currentStage)    || 0;
    const tasksCompleted  = (profile && profile.tasksCompleted)  || 0;
    const streakDays      = (profile && profile.streakDays)      || 0;
    const lastActiveDate  = (profile && profile.lastActiveDate)  || null;

    /* 6. Render everything */
    renderGreeting(firstName);
    renderStageCard(currentStage, tasksCompleted);
    renderMission(currentStage);
    renderStats(stats.dms, stats.replies, stats.gigs);

    /* 7. Calculate & persist streak, then render */
    const newStreak = await updateStreak(uid, streakDays, lastActiveDate);
    renderStreak(newStreak);
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

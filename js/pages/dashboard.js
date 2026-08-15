// ═══════════════════════════════════════════════════════════
// AVALAN3 — DASHBOARD v2
// Outreach-focused. No journey stages. Intermediate/pro users.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  var PLATFORM_LABELS = {
    twitter: 'X', discord: 'D', telegram: 'TG', email: 'E', other: '?'
  };
  var STATUS_CLASS = {
    sent: 'sent', replied: 'replied', 'call-booked': 'call-booked',
    'gig-landed': 'gig-landed', 'no-response': 'no-response'
  };
  var STATUS_LABEL = {
    sent: 'Sent', replied: 'Replied', 'call-booked': 'Call Booked',
    'gig-landed': 'Gig Landed', 'no-response': 'No Response'
  };

  // ── DOM ───────────────────────────────────────────────
  var dom = {
    greetingText:    document.getElementById('greeting-text'),
    firstName:       document.getElementById('user-first-name'),
    statDms:         document.getElementById('stat-dms-value'),
    statReplies:     document.getElementById('stat-replies-value'),
    statGigs:        document.getElementById('stat-gigs-value'),
    recentList:      document.getElementById('recent-entries-list')
  };

  // ── Greeting ──────────────────────────────────────────
  function renderGreeting(firstName) {
    var h = new Date().getHours();
    var greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    if (dom.greetingText) dom.greetingText.textContent = greeting;
    if (dom.firstName) dom.firstName.textContent = firstName || 'there';
  }

  // ── Stats ─────────────────────────────────────────────
  function showStatContent(id) {
    var tile = document.getElementById(id);
    if (!tile) return;
    var sk = tile.querySelector('[data-skeleton]');
    var ct = tile.querySelector('[data-content]');
    if (sk) sk.hidden = true;
    if (ct) ct.hidden = false;
  }

  function renderStats(dms, replies, gigs) {
    if (dom.statDms) dom.statDms.textContent = dms;
    if (dom.statReplies) dom.statReplies.textContent = replies;
    if (dom.statGigs) dom.statGigs.textContent = gigs;
    showStatContent('stat-dms');
    showStatContent('stat-replies');
    showStatContent('stat-gigs');
  }

  // ── Recent entries ────────────────────────────────────
  function renderRecentEntries(entries) {
    if (!dom.recentList) return;
    dom.recentList.innerHTML = '';

    if (!entries || entries.length === 0) {
      dom.recentList.innerHTML =
        '<div class="recent-empty">No outreach logged yet. ' +
        '<a href="/tracker.html">Log your first DM →</a></div>';
      return;
    }

    entries.slice(0, 3).forEach(function (entry) {
      var div = document.createElement('div');
      div.className = 'recent-entry';
      var platform = entry.platform || 'other';
      var status = entry.status || 'sent';
      var label = PLATFORM_LABELS[platform] || '?';
      var statusClass = STATUS_CLASS[status] || 'sent';
      var statusLabel = STATUS_LABEL[status] || 'Sent';
      div.innerHTML =
        '<div class="recent-entry__platform">' + label + '</div>' +
        '<div class="recent-entry__info">' +
          '<div class="recent-entry__name">' + (entry.projectName || 'Unknown') + '</div>' +
          '<div class="recent-entry__meta">' + (entry.dmType || 'DM') + '</div>' +
        '</div>' +
        '<div class="recent-entry__status recent-entry__status--' + statusClass + '">' + statusLabel + '</div>';
      dom.recentList.appendChild(div);
    });
  }

  // ── Load from Firestore ───────────────────────────────
  async function loadData(uid) {
    var db = firebase.firestore();

    // Load profile and tracker in parallel
    var profilePromise = db.collection('users').doc(uid).get().catch(function () { return null; });
    var trackerPromise = db.collection('users').doc(uid)
      .collection('tracker')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .catch(function () { return null; });

    var results = await Promise.all([profilePromise, trackerPromise]);
    var profileDoc = results[0];
    var trackerSnap = results[1];

    // Profile
    var profile = profileDoc && profileDoc.exists ? profileDoc.data() : {};
    var firstName = (profile.displayName || '').split(' ')[0] || 'there';
    renderGreeting(firstName);

    // Tracker — FIX: use entry.status not entry.type
    var dms = 0, replies = 0, gigs = 0;
    var entries = [];
    if (trackerSnap) {
      trackerSnap.forEach(function (doc) {
        var entry = doc.data();
        entry._id = doc.id;
        entries.push(entry);
        dms++;
        if (entry.status === 'replied' || entry.status === 'call-booked' || entry.status === 'gig-landed') {
          replies++;
        }
        if (entry.status === 'gig-landed') {
          gigs++;
        }
      });
    }

    renderStats(dms, replies, gigs);
    renderRecentEntries(entries);
  }

  // ── Init ──────────────────────────────────────────────
  async function init() {
    renderGreeting();

    var user = await new Promise(function (resolve) {
      var unsub = firebase.auth().onAuthStateChanged(function (u) {
        unsub();
        resolve(u);
      });
    });

    if (!user) {
      renderStats(0, 0, 0);
      renderRecentEntries([]);
      return;
    }

    await loadData(user.uid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

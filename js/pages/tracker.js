// ═══════════════════════════════════════════════════════════
// AVALAN3 — TRACKER PAGE
// Outreach activity logger: stats, weekly chart, filters, entries
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════════════════════════════════

  const PLATFORMS = {
    twitter:  { label: 'T',  name: 'X / Twitter', color: 'twitter' },
    discord:  { label: 'D',  name: 'Discord',     color: 'discord' },
    telegram: { label: 'TG', name: 'Telegram',    color: 'telegram' },
    email:    { label: 'E',  name: 'Email',       color: 'email' },
    other:    { label: '?',  name: 'Other',       color: 'other' }
  };

  const DM_TYPES = {
    'cold-pitch':    'Cold Pitch',
    'cm-application':'CM App',
    'shill-offer':   'Shill Offer',
    'collab':        'Collab',
    'other':         'Other'
  };

  const STATUSES = {
    'sent':        'Sent',
    'replied':     'Replied',
    'call-booked': 'Call Booked',
    'gig-landed':  'Gig Landed',
    'no-response': 'No Response'
  };

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];


  // ═══════════════════════════════════════════════════════════
  //  SVG ICONS (inline only)
  // ═══════════════════════════════════════════════════════════

  const ICONS = {
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',

    trash: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };


  // ═══════════════════════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════════════════════

  let entries = [];
  let activeFilter = 'all';
  let expandedEntries = new Set();
  let isSaving = false;
  let deleteTargetId = null;

  // Drawer form state
  let selectedPlatform = 'twitter';


  // ═══════════════════════════════════════════════════════════
  //  DOM REFS
  // ═══════════════════════════════════════════════════════════

  const $skeleton     = document.getElementById('tracker-skeleton');
  const $content      = document.getElementById('tracker-content');
  const $list         = document.getElementById('tracker-list');
  const $empty        = document.getElementById('tracker-empty');
  const $statDms      = document.getElementById('stat-dms');
  const $statReplies  = document.getElementById('stat-replies');
  const $statGigs     = document.getElementById('stat-gigs');
  const $statEarned   = document.getElementById('stat-earned');
  const $chartCanvas  = document.getElementById('weekly-chart');
  const $chartTotal   = document.getElementById('chart-total');
  const $drawerOverlay= document.getElementById('drawer-overlay');
  const $drawer       = document.getElementById('entry-drawer');
  const $drawerClose  = document.getElementById('btn-drawer-close');
  const $entryForm    = document.getElementById('entry-form');
  const $fieldProject = document.getElementById('field-project');
  const $fieldDmType  = document.getElementById('field-dm-type');
  const $fieldNotes   = document.getElementById('field-notes');
  const $btnAdd       = document.getElementById('btn-add-entry');
  const $btnEmptyCta  = document.getElementById('btn-empty-cta');
  const $btnSubmit    = document.getElementById('btn-submit-entry');
  const $platformSeg  = document.getElementById('platform-segments');
  const $deleteOverlay= document.getElementById('delete-overlay');
  const $deleteDialog = document.getElementById('delete-dialog');
  const $btnDelCancel = document.getElementById('btn-delete-cancel');
  const $btnDelConfirm= document.getElementById('btn-delete-confirm');


  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  /** Get filtered entries based on active status filter */
  function getFilteredEntries() {
    if (activeFilter === 'all') return entries;
    return entries.filter(e => e.status === activeFilter);
  }

  /** Compute stats from entries */
  function computeStats() {
    let dmsSent = 0;
    let replies = 0;
    let gigsLanded = 0;
    let totalEarned = 0;

    entries.forEach(e => {
      dmsSent++;
      if (e.status === 'replied') replies++;
      if (e.status === 'call-booked') replies++; // call booked implies reply
      if (e.status === 'gig-landed') {
        gigsLanded++;
        const amt = parseFloat(e.earned) || 0;
        totalEarned += amt;
      }
    });

    return { dmsSent, replies, gigsLanded, totalEarned };
  }

  /** Get DMs sent per day for the last 7 days */
  function getWeeklyData() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    // Convert to Monday-based index: Mon=0, Tue=1, ... Sun=6
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const counts = [0, 0, 0, 0, 0, 0, 0];

    entries.forEach(e => {
      const ts = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
      const entryDay = ts.getDay();
      const entryMondayOffset = entryDay === 0 ? 6 : entryDay - 1;

      // Days ago from today
      const diffMs = now.getTime() - ts.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays < 7) {
        counts[entryMondayOffset]++;
      }
    });

    // Reorder so current week starts from Monday
    // Return counts indexed Mon=0 through Sun=6
    return counts;
  }

  /** Get the Monday-based day index for the last 7 days */
  function getLast7DayIndices() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayMondayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Last 7 days, ending with today
    const indices = [];
    for (let i = 6; i >= 0; i--) {
      indices.push((todayMondayIdx - i + 7) % 7);
    }
    return indices;
  }


  // ═══════════════════════════════════════════════════════════
  //  RENDER: STATS
  // ═══════════════════════════════════════════════════════════

  function renderStats() {
    const stats = computeStats();
    $statDms.textContent = stats.dmsSent;
    $statReplies.textContent = stats.replies;
    $statGigs.textContent = stats.gigsLanded;
    $statEarned.textContent = '$' + (stats.totalEarned > 0 ? stats.totalEarned.toFixed(0) : '0');
  }


  // ═══════════════════════════════════════════════════════════
  //  RENDER: WEEKLY CHART (vanilla canvas)
  // ═══════════════════════════════════════════════════════════

  function renderChart() {
    if (!$chartCanvas) return;

    const ctx = $chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Size the canvas
    const rect = $chartCanvas.getBoundingClientRect();
    const w = rect.width || 360;
    const h = 140;
    $chartCanvas.width = w * dpr;
    $chartCanvas.height = h * dpr;
    $chartCanvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Get data
    const weeklyData = getWeeklyData();
    const dayIndices = getLast7DayIndices();
    const barValues = dayIndices.map(idx => weeklyData[idx]);
    const maxVal = Math.max(...barValues, 1);

    // Chart layout
    const padLeft = 4;
    const padRight = 4;
    const padTop = 8;
    const padBottom = 24;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;
    const barCount = 7;
    const gap = 8;
    const barW = (chartW - gap * (barCount + 1)) / barCount;

    // Get computed colors
    const style = getComputedStyle(document.documentElement);
    const brandColor = style.getPropertyValue('--brand-primary').trim() || '#0EA5E9';
    const mutedColor = style.getPropertyValue('--border-subtle').trim() || '#E2E8F0';
    const textColor = style.getPropertyValue('--text-muted').trim() || '#94A3B8';

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw bars
    barValues.forEach((val, i) => {
      const x = padLeft + gap + i * (barW + gap);
      const barH = Math.max((val / maxVal) * chartH, 0);
      const y = padTop + chartH - barH;

      // Bar fill
      ctx.fillStyle = val > 0 ? brandColor : mutedColor;
      ctx.beginPath();
      const r = Math.min(4, barW / 2, barH / 2);
      if (barH > 0 && r > 0) {
        ctx.moveTo(x, y + barH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + barH);
        ctx.closePath();
        ctx.fill();
      } else if (val === 0) {
        // Draw small muted bar for zero
        const minH = 4;
        const minY = padTop + chartH - minH;
        ctx.fillRect(x, minY, barW, minH);
      }

      // Day label
      ctx.fillStyle = textColor;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(DAY_LABELS[dayIndices[i]], x + barW / 2, h - 6);
    });

    // Update total label
    const weekTotal = barValues.reduce((a, b) => a + b, 0);
    $chartTotal.textContent = weekTotal + ' DM' + (weekTotal !== 1 ? 's' : '') + ' this week';
  }


  // ═══════════════════════════════════════════════════════════
  //  RENDER: ENTRY LIST
  // ═══════════════════════════════════════════════════════════

  function renderList() {
    const filtered = getFilteredEntries();

    // Show/hide empty state
    if (entries.length === 0) {
      $list.style.display = 'none';
      $empty.style.display = '';
      return;
    }

    $empty.style.display = 'none';
    $list.style.display = '';

    if (filtered.length === 0) {
      $list.innerHTML = '<div class="tracker-list__empty">No entries with this status.</div>';
      return;
    }

    $list.innerHTML = '';
    filtered.forEach(entry => {
      $list.appendChild(renderEntry(entry));
    });
  }

  /** Render a single entry card */
  function renderEntry(entry) {
    const card = document.createElement('div');
    card.className = 'tracker-entry';
    card.setAttribute('role', 'listitem');
    card.dataset.entryId = entry.id;

    const expanded = expandedEntries.has(entry.id);
    if (expanded) card.classList.add('tracker-entry--expanded');

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'tracker-entry__header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    // Platform icon
    const platInfo = PLATFORMS[entry.platform] || PLATFORMS.other;
    const platEl = document.createElement('div');
    platEl.className = 'tracker-entry__platform tracker-entry__platform--' + platInfo.color;
    platEl.textContent = platInfo.label;

    // Info
    const info = document.createElement('div');
    info.className = 'tracker-entry__info';

    // Row 1: project + dm type badge
    const row1 = document.createElement('div');
    row1.className = 'tracker-entry__row';

    const project = document.createElement('span');
    project.className = 'tracker-entry__project';
    project.textContent = entry.projectName || 'Untitled';

    const dmBadge = document.createElement('span');
    dmBadge.className = 'tracker-entry__dm-badge';
    dmBadge.textContent = DM_TYPES[entry.dmType] || entry.dmType || 'DM';

    row1.appendChild(project);
    row1.appendChild(dmBadge);

    // Row 2: status + date
    const meta = document.createElement('div');
    meta.className = 'tracker-entry__meta';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'tracker-entry__status tracker-entry__status--' + (entry.status || 'sent');
    statusBadge.textContent = STATUSES[entry.status] || 'Sent';

    const dateEl = document.createElement('span');
    dateEl.className = 'tracker-entry__date';
    dateEl.textContent = formatRelativeTime(entry.createdAt);

    meta.appendChild(statusBadge);
    meta.appendChild(dateEl);

    info.appendChild(row1);
    info.appendChild(meta);

    // Chevron
    const chevron = document.createElement('div');
    chevron.className = 'tracker-entry__chevron';
    chevron.innerHTML = ICONS.chevron;

    header.appendChild(platEl);
    header.appendChild(info);
    header.appendChild(chevron);

    // Click to expand/collapse
    const toggleExpand = () => {
      if (expandedEntries.has(entry.id)) {
        expandedEntries.delete(entry.id);
      } else {
        expandedEntries.add(entry.id);
      }
      renderList();
    };
    header.addEventListener('click', toggleExpand);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpand();
      }
    });

    card.appendChild(header);

    // ── Body (expandable) ──
    const body = document.createElement('div');
    body.className = 'tracker-entry__body';

    if (expanded) {
      const inner = document.createElement('div');
      inner.className = 'tracker-entry__body-inner';

      // Notes
      if (entry.notes) {
        const notes = document.createElement('div');
        notes.className = 'tracker-entry__notes';
        const notesLabel = document.createElement('span');
        notesLabel.className = 'tracker-entry__notes-label';
        notesLabel.textContent = 'Notes';
        const notesText = document.createElement('div');
        notesText.textContent = entry.notes;
        notes.appendChild(notesLabel);
        notes.appendChild(notesText);
        inner.appendChild(notes);
      }

      // Actions
      const actions = document.createElement('div');
      actions.className = 'tracker-entry__actions';

      // Status update
      const statusRow = document.createElement('div');
      statusRow.className = 'tracker-entry__action-row';
      const statusLabel = document.createElement('span');
      statusLabel.className = 'tracker-entry__action-label';
      statusLabel.textContent = 'Status';
      const statusSelect = document.createElement('select');
      statusSelect.className = 'tracker-entry__status-select';
      Object.keys(STATUSES).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = STATUSES[key];
        if (key === entry.status) opt.selected = true;
        statusSelect.appendChild(opt);
      });
      statusSelect.addEventListener('change', () => {
        updateEntryStatus(entry.id, statusSelect.value);
      });
      statusRow.appendChild(statusLabel);
      statusRow.appendChild(statusSelect);
      actions.appendChild(statusRow);

      // Earned amount (visible for gig-landed or always show)
      const earnedRow = document.createElement('div');
      earnedRow.className = 'tracker-entry__action-row';
      const earnedLabel = document.createElement('span');
      earnedLabel.className = 'tracker-entry__action-label';
      earnedLabel.textContent = 'Earned';
      const earnedInput = document.createElement('input');
      earnedInput.className = 'tracker-entry__earned-input';
      earnedInput.type = 'number';
      earnedInput.placeholder = '$0';
      earnedInput.min = '0';
      earnedInput.step = 'any';
      if (entry.earned) earnedInput.value = entry.earned;
      earnedInput.addEventListener('change', () => {
        updateEntryEarned(entry.id, earnedInput.value);
      });
      earnedRow.appendChild(earnedLabel);
      earnedRow.appendChild(earnedInput);
      actions.appendChild(earnedRow);

      // Delete
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tracker-entry__delete';
      deleteBtn.type = 'button';
      deleteBtn.innerHTML = ICONS.trash + ' Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteConfirm(entry.id);
      });
      actions.appendChild(deleteBtn);

      inner.appendChild(actions);
      body.appendChild(inner);
    }

    card.appendChild(body);
    return card;
  }


  // ═══════════════════════════════════════════════════════════
  //  INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  /** Update entry status */
  async function updateEntryStatus(entryId, newStatus) {
    if (!currentUser || isSaving) return;
    isSaving = true;

    // Optimistic update
    const entry = entries.find(e => e.id === entryId);
    const prevStatus = entry ? entry.status : null;
    if (entry) entry.status = newStatus;

    renderStats();
    renderChart();

    try {
      await updateTrackerEntry(currentUser.uid, entryId, { status: newStatus });
      showToast('Status updated', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      if (entry) entry.status = prevStatus;
      showToast('Update failed — try again', 'error');
      renderStats();
      renderChart();
    } finally {
      isSaving = false;
    }
  }

  /** Update entry earned amount */
  async function updateEntryEarned(entryId, value) {
    if (!currentUser || isSaving) return;
    isSaving = true;

    const earned = parseFloat(value) || 0;
    const entry = entries.find(e => e.id === entryId);
    const prevEarned = entry ? entry.earned : 0;
    if (entry) entry.earned = earned;

    renderStats();

    try {
      await updateTrackerEntry(currentUser.uid, entryId, { earned });
      showToast('Earnings updated', 'success');
    } catch (err) {
      console.error('Failed to update earned:', err);
      if (entry) entry.earned = prevEarned;
      showToast('Update failed — try again', 'error');
      renderStats();
    } finally {
      isSaving = false;
    }
  }

  /** Delete entry */
  async function confirmDeleteEntry() {
    if (!deleteTargetId || !currentUser || isSaving) return;
    isSaving = true;

    const entryId = deleteTargetId;

    // Optimistic
    entries = entries.filter(e => e.id !== entryId);
    expandedEntries.delete(entryId);
    hideDeleteConfirm();
    renderStats();
    renderChart();
    renderList();

    try {
      await deleteTrackerEntry(currentUser.uid, entryId);
      showToast('Entry deleted', 'success');
    } catch (err) {
      console.error('Failed to delete entry:', err);
      showToast('Delete failed — try again', 'error');
      // Reload to restore
      await loadEntries();
      renderAll();
    } finally {
      isSaving = false;
      deleteTargetId = null;
    }
  }


  // ═══════════════════════════════════════════════════════════
  //  DRAWER (Add Entry)
  // ═══════════════════════════════════════════════════════════

  function openDrawer() {
    $drawer.classList.add('tracker-drawer--open');
    $drawer.setAttribute('aria-hidden', 'false');
    $drawerOverlay.classList.add('tracker-drawer-overlay--visible');
    $drawerOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => $fieldProject.focus(), 350);
  }

  function closeDrawer() {
    $drawer.classList.remove('tracker-drawer--open');
    $drawer.setAttribute('aria-hidden', 'true');
    $drawerOverlay.classList.remove('tracker-drawer-overlay--visible');
    $drawerOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Reset form
    resetForm();
  }

  function resetForm() {
    $entryForm.reset();
    selectedPlatform = 'twitter';
    updatePlatformSegments();
    $fieldProject.classList.remove('tracker-field__input--error');
  }

  /** Update platform segmented control UI */
  function updatePlatformSegments() {
    const segments = $platformSeg.querySelectorAll('.tracker-segment');
    segments.forEach(seg => {
      const isActive = seg.dataset.value === selectedPlatform;
      seg.classList.toggle('tracker-segment--active', isActive);
      seg.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  DELETE CONFIRM DIALOG
  // ═══════════════════════════════════════════════════════════

  function showDeleteConfirm(entryId) {
    deleteTargetId = entryId;
    $deleteDialog.classList.add('tracker-delete-dialog--visible');
    $deleteDialog.setAttribute('aria-hidden', 'false');
    $deleteOverlay.classList.add('tracker-delete-overlay--visible');
    $deleteOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideDeleteConfirm() {
    $deleteDialog.classList.remove('tracker-delete-dialog--visible');
    $deleteDialog.setAttribute('aria-hidden', 'true');
    $deleteOverlay.classList.remove('tracker-delete-overlay--visible');
    $deleteOverlay.setAttribute('aria-hidden', 'true');
    deleteTargetId = null;
  }


  // ═══════════════════════════════════════════════════════════
  //  FORM SUBMIT
  // ═══════════════════════════════════════════════════════════

  async function handleSubmit(e) {
    e.preventDefault();

    const projectName = $fieldProject.value.trim();
    if (!projectName) {
      $fieldProject.classList.add('tracker-field__input--error');
      $fieldProject.focus();
      return;
    }

    $fieldProject.classList.remove('tracker-field__input--error');

    if (!currentUser || isSaving) return;
    isSaving = true;
    $btnSubmit.disabled = true;

    const newEntry = {
      projectName,
      platform: selectedPlatform,
      dmType: $fieldDmType.value,
      notes: $fieldNotes.value.trim() || '',
      status: 'sent',
      earned: 0
    };

    try {
      await addTrackerEntry(currentUser.uid, newEntry);
      showToast('DM logged!', 'success');
      closeDrawer();
      // Reload entries
      await loadEntries();
      renderAll();
    } catch (err) {
      console.error('Failed to add entry:', err);
      showToast('Failed to log — try again', 'error');
    } finally {
      isSaving = false;
      $btnSubmit.disabled = false;
    }
  }


  // ═══════════════════════════════════════════════════════════
  //  STATUS TABS (filter)
  // ═══════════════════════════════════════════════════════════

  function handleTabClick(e) {
    const tab = e.target.closest('.tracker-tab');
    if (!tab) return;

    activeFilter = tab.dataset.filter;

    // Update UI
    document.querySelectorAll('.tracker-tab').forEach(t => {
      const isActive = t.dataset.filter === activeFilter;
      t.classList.toggle('tracker-tab--active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    renderList();
  }


  // ═══════════════════════════════════════════════════════════
  //  FIRESTORE LOAD
  // ═══════════════════════════════════════════════════════════

  async function loadEntries() {
    if (!currentUser) return;

    try {
      entries = await getTrackerEntries(currentUser.uid);
    } catch (err) {
      console.error('Failed to load tracker entries:', err);
      entries = [];
    }
  }


  // ═══════════════════════════════════════════════════════════
  //  RENDER ALL
  // ═══════════════════════════════════════════════════════════

  function renderAll() {
    renderStats();
    renderChart();
    renderList();
  }


  // ═══════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════

  function bindEvents() {
    // Add entry button
    $btnAdd.addEventListener('click', openDrawer);

    // Empty state CTA
    $btnEmptyCta.addEventListener('click', openDrawer);

    // Drawer close
    $drawerClose.addEventListener('click', closeDrawer);
    $drawerOverlay.addEventListener('click', closeDrawer);

    // Form submit
    $entryForm.addEventListener('submit', handleSubmit);

    // Platform segmented control
    $platformSeg.addEventListener('click', (e) => {
      const seg = e.target.closest('.tracker-segment');
      if (!seg) return;
      selectedPlatform = seg.dataset.value;
      updatePlatformSegments();
    });

    // Clear error state on input
    $fieldProject.addEventListener('input', () => {
      $fieldProject.classList.remove('tracker-field__input--error');
    });

    // Status filter tabs
    document.querySelector('.tracker-tabs__scroll').addEventListener('click', handleTabClick);

    // Delete confirm
    $btnDelCancel.addEventListener('click', hideDeleteConfirm);
    $btnDelConfirm.addEventListener('click', confirmDeleteEntry);
    $deleteOverlay.addEventListener('click', hideDeleteConfirm);

    // Keyboard: Escape to close drawer / dialog
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if ($deleteDialog.classList.contains('tracker-delete-dialog--visible')) {
          hideDeleteConfirm();
        } else if ($drawer.classList.contains('tracker-drawer--open')) {
          closeDrawer();
        }
      }
    });

    // Resize chart on window resize
    window.addEventListener('resize', debounce(() => {
      if ($content.style.display !== 'none') {
        renderChart();
      }
    }, 200));

    // Theme change → re-render chart with new colors
    const observer = new MutationObserver(() => {
      if ($content.style.display !== 'none') {
        renderChart();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════

  function init() {
    bindEvents();
    renderAll();

    // Hide skeleton, show content
    if ($skeleton) $skeleton.style.display = 'none';
    if ($content) $content.style.display = '';
  }

  // Wait for auth-ready event (dispatched by auth-guard.js)
  window.addEventListener('avalan3:auth-ready', async () => {
    await loadEntries();
    init();
  });

})();

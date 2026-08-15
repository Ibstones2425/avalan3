// ═══════════════════════════════════════════════════════════
// AVALAN3 — JOURNEY PAGE
// Full roadmap Stage 0 → 5 with lane-personalised task checklists
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Lane key normalisation ───────────────────────────────
  // Maps the lane values stored in userProfile to JOURNEY_DATA keys
  const LANE_MAP = {
    'community-manager': 'cm',
    'content-creator':   'content',
    'shiller-raider':    'shill',
    'developer':         'dev',
    'designer':          'dev',   // designer gets dev-adjacent tasks
    'not-sure-yet':      null     // universal only
  };

  // ═══════════════════════════════════════════════════════════
  //  JOURNEY DATA — Hardcoded stage/task definitions
  // ═══════════════════════════════════════════════════════════
  const JOURNEY_DATA = [
    {
      id: 'stage-0',
      number: 0,
      name: 'Understand',
      description: 'Learn what Web3 is and what earning paths exist',
      tasks: {
        universal: [
          { id: 's0-t1', text: 'Read: What is Web3?', link: true },
          { id: 's0-t2', text: 'Watch: Web3 job landscape video', link: true },
          { id: 's0-t3', text: 'Understand what a CM does' },
          { id: 's0-t4', text: 'Understand what a Content Creator does' },
          { id: 's0-t5', text: 'Set a learning goal for 7 days' }
        ]
      }
    },
    {
      id: 'stage-1',
      number: 1,
      name: 'Pick Your Lane',
      description: 'Choose your focus area and research earning paths',
      tasks: {
        universal: [
          { id: 's1-t1', text: 'Confirm your lane in profile' },
          { id: 's1-t2', text: 'Research 5 people earning in your lane' },
          { id: 's1-t3', text: 'Write down 3 services you can offer' }
        ],
        cm: [
          { id: 's1-cm1', text: 'List 3 Discord communities to study' },
          { id: 's1-cm2', text: 'Read: What makes a great CM?' }
        ],
        content: [
          { id: 's1-ct1', text: 'Write first Web3 Twitter thread' },
          { id: 's1-ct2', text: 'Read 10 threads by top creators' }
        ],
        dev: [
          { id: 's1-dv1', text: 'Identify which chain you\'re building on' },
          { id: 's1-dv2', text: 'List current technical skills' }
        ],
        shill: [
          { id: 's1-sh1', text: 'Join 5 memecoin Telegram groups' },
          { id: 's1-sh2', text: 'Observe how shillers operate' }
        ]
      }
    },
    {
      id: 'stage-2',
      number: 2,
      name: 'Build Your Presence',
      description: 'Establish your Web3 identity and start showing up',
      tasks: {
        universal: [
          { id: 's2-t1', text: 'Optimise your X bio for your lane' },
          { id: 's2-t2', text: 'Set profile photo and banner' },
          { id: 's2-t3', text: 'Make first Web3 post' },
          { id: 's2-t4', text: 'Join 3 Discord communities' }
        ],
        cm: [
          { id: 's2-cm1', text: 'Start engaging daily in 2 Discord servers' },
          { id: 's2-cm2', text: 'Offer to moderate for free' }
        ],
        content: [
          { id: 's2-ct1', text: 'Post first thread on X' },
          { id: 's2-ct2', text: 'Engage with 10 Web3 accounts daily for 7 days' }
        ],
        dev: [
          { id: 's2-dv1', text: 'Push a project to GitHub' },
          { id: 's2-dv2', text: 'Deploy one smart contract on testnet' }
        ],
        shill: []
      }
    },
    {
      id: 'stage-3',
      number: 3,
      name: 'Find Your First Opportunity',
      description: 'Start systematic outreach and project discovery',
      tasks: {
        universal: [
          { id: 's3-t1', text: 'Open CryptoRank fundraising — find 5 recent raises', link: true },
          { id: 's3-t2', text: 'Check DeFiLlama raises', link: true },
          { id: 's3-t3', text: 'Identify 3 matching projects' },
          { id: 's3-t4', text: 'Send first cold DM' },
          { id: 's3-t5', text: 'Follow up after 48 hours' },
          { id: 's3-t6', text: 'Search job boards daily for 1 week' },
          { id: 's3-t7', text: 'Use X search strings' }
        ]
      }
    },
    {
      id: 'stage-4',
      number: 4,
      name: 'Land Your First Gig',
      description: 'Deliver work professionally and build proof',
      tasks: {
        universal: [
          { id: 's4-t1', text: 'Deliver first piece of work professionally' },
          { id: 's4-t2', text: 'Request testimonial' },
          { id: 's4-t3', text: 'Add gig to profile' },
          { id: 's4-t4', text: 'Reflect on outreach' }
        ]
      }
    },
    {
      id: 'stage-5',
      number: 5,
      name: 'Scale',
      description: 'Raise rates, build systems, and grow your Web3 income',
      tasks: {
        universal: [
          { id: 's5-t1', text: 'Raise rates after first gig' },
          { id: 's5-t2', text: 'Onboard a second client' },
          { id: 's5-t3', text: 'Build personal brand post' },
          { id: 's5-t4', text: 'Create service menu' },
          { id: 's5-t5', text: 'Set up invoice process' }
        ]
      }
    }
  ];


  // ═══════════════════════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════════════════════
  let currentLane = null;         // e.g. 'cm', 'content', 'dev', 'shill'
  let currentStage = 0;           // user's current stage (from Firestore)
  let firestoreProgress = {};     // { 'stage-0': { tasks: { 's0-t1': true, ... } }, ... }
  let expandedStages = new Set(); // which stages are expanded
  let isSaving = false;           // debounce saves


  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  /** Get tasks for a stage, merged by lane */
  function getTasksForStage(stage) {
    const universal = stage.tasks.universal || [];
    const laneKey = currentLane;
    const laneTasks = (laneKey && stage.tasks[laneKey]) ? stage.tasks[laneKey] : [];
    return [...universal, ...laneTasks];
  }

  /** Get completed tasks count for a stage */
  function getCompletedCount(stageId, tasks) {
    const stageData = firestoreProgress[stageId];
    if (!stageData || !stageData.tasks) return 0;
    return tasks.filter(t => !!stageData.tasks[t.id]).length;
  }

  /** Is a stage fully complete? */
  function isStageComplete(stageId, tasks) {
    return tasks.length > 0 && getCompletedCount(stageId, tasks) === tasks.length;
  }

  /** Is a stage locked? (future stages beyond currentStage + 1) */
  function isStageLocked(stageNumber) {
    return stageNumber > currentStage + 1;
  }

  /** Is a stage the current stage? */
  function isStageCurrent(stageNumber) {
    return stageNumber === currentStage;
  }

  /** Compute completion % for collapsed past stage */
  function getCompletionPercent(stageId, tasks) {
    if (tasks.length === 0) return 0;
    return Math.round((getCompletedCount(stageId, tasks) / tasks.length) * 100);
  }


  // ═══════════════════════════════════════════════════════════
  //  SVG ICONS (inline, no external files)
  // ═══════════════════════════════════════════════════════════

  const ICONS = {
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',

    check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',

    lock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',

    celebrate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><polyline points="12 3 20 12 4 12"/><line x1="12" y1="3" x2="12" y2="12"/></svg>',

    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>'
  };


  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  function renderRoadmap() {
    const container = document.getElementById('journey-roadmap');
    if (!container) return;

    container.innerHTML = '';

    JOURNEY_DATA.forEach(stage => {
      const tasks = getTasksForStage(stage);
      const locked = isStageLocked(stage.number);
      const current = isStageCurrent(stage.number);
      const complete = isStageComplete(stage.id, tasks) && stage.number < currentStage;
      const completedCount = getCompletedCount(stage.id, tasks);
      const total = tasks.length;
      const pct = getCompletionPercent(stage.id, tasks);
      const expanded = expandedStages.has(stage.id);

      // -- Stage card
      const card = document.createElement('div');
      card.className = 'stage-card';
      card.setAttribute('role', 'listitem');
      card.dataset.stageId = stage.id;

      if (locked) card.classList.add('stage-card--locked');
      if (current) card.classList.add('stage-card--current');
      if (complete) card.classList.add('stage-card--complete');
      if (expanded && !locked) card.classList.add('stage-card--expanded');

      // -- Stage header
      const header = document.createElement('div');
      header.className = 'stage-header';
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', locked ? '-1' : '0');
      header.setAttribute('aria-expanded', expanded && !locked ? 'true' : 'false');
      header.setAttribute('aria-label', `Stage ${stage.number}: ${stage.name}`);

      // Badge
      const badge = document.createElement('div');
      badge.className = 'stage-badge';
      if (complete) {
        badge.classList.add('stage-badge--complete');
        badge.innerHTML = ICONS.check;
      } else if (locked) {
        badge.classList.add('stage-badge--locked');
        badge.textContent = stage.number;
      } else {
        badge.classList.add('stage-badge--current');
        badge.textContent = stage.number;
      }

      // Info
      const info = document.createElement('div');
      info.className = 'stage-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'stage-info__name';
      nameEl.textContent = stage.name;

      const descEl = document.createElement('div');
      descEl.className = 'stage-info__desc';
      descEl.textContent = stage.description;

      info.appendChild(nameEl);
      info.appendChild(descEl);

      // Progress pill (for non-locked)
      if (!locked && total > 0) {
        const progressPill = document.createElement('div');
        progressPill.className = 'stage-progress';
        if (completedCount === total) progressPill.classList.add('stage-progress--done');
        progressPill.textContent = completedCount === total
          ? `${total} / ${total} done`
          : `${completedCount} / ${total} tasks done`;
        info.appendChild(progressPill);
      }

      // Chevron or lock
      const chevron = document.createElement('div');
      chevron.className = 'stage-chevron';
      chevron.innerHTML = ICONS.chevron;

      const lockIcon = document.createElement('div');
      lockIcon.className = 'stage-lock';
      lockIcon.innerHTML = ICONS.lock;

      header.appendChild(badge);
      header.appendChild(info);
      header.appendChild(chevron);
      header.appendChild(lockIcon);

      // Click to expand/collapse
      if (!locked) {
        header.addEventListener('click', () => toggleStage(stage.id));
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleStage(stage.id);
          }
        });
      }

      card.appendChild(header);

      // -- Stage body (expandable)
      const body = document.createElement('div');
      body.className = 'stage-body';

      if (locked) {
        // Locked message
        const lockMsg = document.createElement('div');
        lockMsg.className = 'stage-locked-msg';
        lockMsg.innerHTML = ICONS.lock;
        const prevStage = JOURNEY_DATA[stage.number - 1];
        const lockText = document.createElement('span');
        lockText.textContent = `Complete Stage ${stage.number - 1} (${prevStage ? prevStage.name : ''}) to unlock`;
        lockMsg.appendChild(lockText);
        body.appendChild(lockMsg);
        body.style.maxHeight = '80px';
        card.classList.add('stage-card--expanded'); // show locked msg
      } else if (expanded) {
        // Render task list
        const inner = document.createElement('div');
        inner.className = 'stage-body__inner';

        // Progress bar
        const progressbar = document.createElement('div');
        progressbar.className = 'stage-progressbar';
        const fill = document.createElement('div');
        fill.className = 'stage-progressbar__fill';
        if (completedCount === total) fill.classList.add('stage-progressbar__fill--done');
        fill.style.width = total > 0 ? `${pct}%` : '0%';
        progressbar.appendChild(fill);
        inner.appendChild(progressbar);

        // Task list
        const taskList = document.createElement('div');
        taskList.className = 'task-list';

        // Render universal tasks
        if (stage.tasks.universal && stage.tasks.universal.length > 0) {
          stage.tasks.universal.forEach(task => {
            taskList.appendChild(renderTask(task, stage.id));
          });
        }

        // Render lane-specific tasks
        const laneKey = currentLane;
        if (laneKey && stage.tasks[laneKey] && stage.tasks[laneKey].length > 0) {
          const divider = document.createElement('div');
          divider.className = 'task-list__divider';
          const laneLabels = {
            cm: 'Community Manager',
            content: 'Content Creator',
            dev: 'Developer',
            shill: 'Shiller / Raider'
          };
          divider.textContent = laneLabels[laneKey] || 'Lane Tasks';
          taskList.appendChild(divider);

          stage.tasks[laneKey].forEach(task => {
            taskList.appendChild(renderTask(task, stage.id));
          });
        }

        inner.appendChild(taskList);

        // Mark Stage Complete button
        const allDone = completedCount === total && total > 0;
        const completeBtn = document.createElement('button');
        completeBtn.className = 'stage-complete-btn';
        completeBtn.type = 'button';
        completeBtn.disabled = !allDone || isSaving;

        if (allDone && stage.number < currentStage) {
          // Already completed
          completeBtn.innerHTML = ICONS.sparkles + ' Stage Complete';
          completeBtn.disabled = true;
        } else if (allDone) {
          completeBtn.innerHTML = ICONS.celebrate + ' Mark Stage Complete';
        } else {
          completeBtn.textContent = `Complete all tasks to unlock next stage`;
        }

        if (allDone && stage.number >= currentStage) {
          completeBtn.addEventListener('click', () => markStageComplete(stage));
        }

        inner.appendChild(completeBtn);
        body.appendChild(inner);
      }

      card.appendChild(body);
      container.appendChild(card);
    });
  }

  /** Render a single task item */
  function renderTask(task, stageId) {
    const stageData = firestoreProgress[stageId] || {};
    const taskState = (stageData.tasks && stageData.tasks[task.id]) || false;

    const item = document.createElement('div');
    item.className = 'task-item';
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', taskState ? 'true' : 'false');
    item.setAttribute('tabindex', '0');
    if (taskState) item.classList.add('task-item--done');

    // Checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox';
    if (taskState) checkbox.classList.add('task-checkbox--checked');
    checkbox.innerHTML = ICONS.check;

    // Text
    const text = document.createElement('span');
    text.className = 'task-text';
    if (task.link) {
      text.classList.add('task-link');
    }
    text.textContent = task.text;

    item.appendChild(checkbox);
    item.appendChild(text);

    // Toggle handler
    const toggle = () => {
      if (isSaving) return;
      toggleTask(task, stageId, !taskState);
    };

    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    return item;
  }


  // ═══════════════════════════════════════════════════════════
  //  INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  function toggleStage(stageId) {
    if (expandedStages.has(stageId)) {
      expandedStages.delete(stageId);
    } else {
      expandedStages.add(stageId);
    }
    renderRoadmap();
  }

  async function toggleTask(task, stageId, newValue) {
    if (!currentUser) return;
    isSaving = true;

    // Optimistic update
    if (!firestoreProgress[stageId]) {
      firestoreProgress[stageId] = { stageId, tasks: {} };
    }
    if (!firestoreProgress[stageId].tasks) {
      firestoreProgress[stageId].tasks = {};
    }
    firestoreProgress[stageId].tasks[task.id] = newValue;

    renderRoadmap();

    try {
      await setTaskComplete(currentUser.uid, stageId, task.id, newValue);
      showToast(newValue ? 'Task completed!' : 'Task unchecked', newValue ? 'success' : 'info');
    } catch (err) {
      console.error('Failed to save task:', err);
      // Revert
      firestoreProgress[stageId].tasks[task.id] = !newValue;
      showToast('Save failed — try again', 'error');
      renderRoadmap();
    } finally {
      isSaving = false;
    }
  }

  async function markStageComplete(stage) {
    if (!currentUser) return;
    isSaving = true;

    try {
      // Update currentStage in Firestore
      const newCurrentStage = stage.number + 1;
      await updateUserProfile(currentUser.uid, { currentStage: newCurrentStage });

      currentStage = newCurrentStage;

      // Expand the next stage if it exists
      const nextStage = JOURNEY_DATA.find(s => s.number === newCurrentStage);
      if (nextStage) {
        expandedStages.add(nextStage.id);
      }

      // Collapse the just-completed stage
      expandedStages.delete(stage.id);

      renderRoadmap();

      // Celebration
      const card = document.querySelector(`[data-stage-id="${stage.id}"]`);
      if (card) {
        card.classList.add('stage-card--celebrate');
        setTimeout(() => card.classList.remove('stage-card--celebrate'), 600);
      }

      showToast(`Stage ${stage.number} complete! 🎉`, 'success');
    } catch (err) {
      console.error('Failed to mark stage complete:', err);
      showToast('Could not update — try again', 'error');
    } finally {
      isSaving = false;
    }
  }


  // ═══════════════════════════════════════════════════════════
  //  FIRESTORE LOAD
  // ═══════════════════════════════════════════════════════════

  async function loadProgress() {
    if (!currentUser) return;

    try {
      const progress = await getJourneyProgress(currentUser.uid);
      firestoreProgress = progress || {};

      // Get currentStage from user profile (already loaded by auth-guard)
      if (userProfile && typeof userProfile.currentStage === 'number') {
        currentStage = userProfile.currentStage;
      } else {
        currentStage = 0;
      }
    } catch (err) {
      console.error('Failed to load journey progress:', err);
      currentStage = 0;
      firestoreProgress = {};
    }
  }


  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════

  function init() {
    // Determine lane from userProfile (set by auth-guard)
    if (userProfile && userProfile.lane) {
      currentLane = LANE_MAP[userProfile.lane] || null;
    }

    // Expand current stage by default
    const currentStageData = JOURNEY_DATA.find(s => s.number === currentStage);
    if (currentStageData) {
      expandedStages.add(currentStageData.id);
    }

    // Also expand any incomplete past stages so user can see progress
    JOURNEY_DATA.forEach(stage => {
      if (stage.number < currentStage) {
        const tasks = getTasksForStage(stage);
        if (!isStageComplete(stage.id, tasks)) {
          expandedStages.add(stage.id);
        }
      }
    });

    renderRoadmap();

    // Hide skeleton, show roadmap
    const skeleton = document.getElementById('journey-skeleton');
    const roadmap = document.getElementById('journey-roadmap');
    if (skeleton) skeleton.style.display = 'none';
    if (roadmap) roadmap.style.display = '';
  }

  // Wait for auth-ready event (dispatched by auth-guard.js)
  window.addEventListener('avalan3:auth-ready', async () => {
    await loadProgress();
    init();
  });

})();

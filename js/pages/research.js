// ═══════════════════════════════════════════════════════════
// AVALAN3 — RESEARCH PAGE JS
// AI-powered project deep-dive tool.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────
  var currentReport = null;
  var currentProjectName = '';
  var isResearching = false;
  var savedReports = [];

  // ── DOM References ─────────────────────────────────────
  var input, btnResearch, recentContainer;
  var loadingSection, errorSection, reportSection;
  var progressSteps;
  var savedPanel, savedOverlay, savedList, savedEmpty;
  var btnSavedReports, btnCloseSaved, btnErrorDismiss;
  var btnUseAIGuide, btnSaveReport, btnCopyOpening;
  var toastEl, toastTimer;

  // ── Init on DOM Ready ──────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    cacheDOM();
    bindEvents();
    createToastElement();
    loadRecentSearches();

    // Wait for auth to be ready before loading saved reports
    window.addEventListener('avalan3:auth-ready', function () {
      loadSavedReports();
    });
  });

  // ── Cache DOM ──────────────────────────────────────────
  function cacheDOM() {
    input = document.getElementById('research-input');
    btnResearch = document.getElementById('btn-research');
    recentContainer = document.getElementById('recent-searches');

    loadingSection = document.getElementById('loading-section');
    errorSection = document.getElementById('error-section');
    reportSection = document.getElementById('report-section');

    progressSteps = document.querySelectorAll('.research-progress-step');

    savedPanel = document.getElementById('saved-panel');
    savedOverlay = document.getElementById('saved-panel-overlay');
    savedList = document.getElementById('saved-list');
    savedEmpty = document.getElementById('saved-empty');

    btnSavedReports = document.getElementById('btn-saved-reports');
    btnCloseSaved = document.getElementById('btn-close-saved');
    btnErrorDismiss = document.getElementById('btn-error-dismiss');

    btnUseAIGuide = document.getElementById('btn-use-ai-guide');
    btnSaveReport = document.getElementById('btn-save-report');
    btnCopyOpening = document.getElementById('btn-copy-opening');
  }

  // ── Bind Events ────────────────────────────────────────
  function bindEvents() {
    // Input enables/disables research button
    input.addEventListener('input', function () {
      var val = input.value.trim();
      btnResearch.disabled = !val || isResearching;
    });

    // Enter key triggers research
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim() && !isResearching) {
        e.preventDefault();
        runResearch(input.value.trim());
      }
    });

    // Research button
    btnResearch.addEventListener('click', function () {
      var val = input.value.trim();
      if (val && !isResearching) {
        runResearch(val);
      }
    });

    // Saved reports panel
    btnSavedReports.addEventListener('click', openSavedPanel);
    btnCloseSaved.addEventListener('click', closeSavedPanel);
    savedOverlay.addEventListener('click', closeSavedPanel);

    // Error dismiss
    btnErrorDismiss.addEventListener('click', function () {
      hideError();
    });

    // Copy opening line
    btnCopyOpening.addEventListener('click', function () {
      if (!currentReport) return;
      var text = currentReport.suggestedOpeningLine || '';
      copyToClipboardCustom(text);
      btnCopyOpening.classList.add('copied');
      setTimeout(function () {
        btnCopyOpening.classList.remove('copied');
      }, 1500);
    });

    // Save report
    btnSaveReport.addEventListener('click', function () {
      saveCurrentReport();
    });

    // Use in AI Guide
    btnUseAIGuide.addEventListener('click', function (e) {
      if (!currentReport) return;
      // Build a pre-populated message for the AI guide
      var msg = 'I want to reach out to ' + currentProjectName + '. ' +
        'Hiring signal: ' + (currentReport.hiringSignal || 'unknown') + '. ' +
        'Best DM angle: ' + (currentReport.bestDMAngle || '') + '. ' +
        'Suggested opening: ' + (currentReport.suggestedOpeningLine || '');
      // Navigate with query param
      e.preventDefault();
      window.location.href = '/ai-guide.html?pre=' + encodeURIComponent(msg);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  RESEARCH FLOW
  // ═══════════════════════════════════════════════════════════

  async function runResearch(projectName) {
    if (isResearching) return;
    isResearching = true;
    currentProjectName = projectName;
    currentReport = null;

    // Update UI state
    input.disabled = true;
    btnResearch.disabled = true;
    btnResearch.innerHTML = '<span class="research-btn-spinner"></span> Researching&hellip;';
    hideError();
    hideReport();
    showLoading();
    resetProgress();

    // Save to recent searches
    addRecentSearch(projectName);

    try {
      // ── Step 1: Search the web ─────────────────────────
      activateStep(1);
      var searchResults1 = await webSearch(projectName + ' crypto web3 funding community hiring');
      completeStep(1);

      // ── Step 2: Gather project data ────────────────────
      activateStep(2);
      var searchResults2 = await webSearch(projectName + ' token launch team roadmap');
      completeStep(2);

      // Combine search results
      var allResults = [].concat(searchResults1 || [], searchResults2 || []);
      var searchContext = formatSearchResults(allResults);

      // ── Step 3: Analyse with AI ────────────────────────
      activateStep(3);
      var aiResponse = await callAIForResearch(projectName, searchContext);
      completeStep(3);

      // ── Step 4: Build report ───────────────────────────
      activateStep(4);
      var report = parseAIResponse(aiResponse, projectName);
      currentReport = report;
      renderReport(report, projectName);
      completeStep(4);

      // Small delay for animation
      await delay(400);
      hideLoading();
      showReport();

    } catch (err) {
      hideLoading();
      handleResearchError(err);
    } finally {
      isResearching = false;
      input.disabled = false;
      btnResearch.disabled = false;
      btnResearch.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Research';
    }
  }

  // ── AI Call for Research ───────────────────────────────
  async function callAIForResearch(projectName, searchResults) {
    var systemPrompt = 'You are a Web3 hiring intelligence analyst. You must respond with ONLY valid JSON — no markdown, no code fences, no extra text.';
    var userPrompt = 'Based on the search results provided, generate a JSON object for the project \'' + projectName + '\' with this exact structure:\n' +
      '{\n' +
      '  "fundingStatus": "",\n' +
      '  "communitySize": "",\n' +
      '  "hiringSignal": "",\n' +
      '  "hiringEvidence": "",\n' +
      '  "recommendedApproach": "",\n' +
      '  "bestDMAngle": "",\n' +
      '  "suggestedOpeningLine": "",\n' +
      '  "riskLevel": "",\n' +
      '  "riskNote": "",\n' +
      '  "hireabilityScore": 0,\n' +
      '  "summary": ""\n' +
      '}\n\n' +
      'Rules:\n' +
      '- hiringSignal: must be exactly "yes", "maybe", or "no"\n' +
      '- riskLevel: must be exactly "low", "medium", or "high"\n' +
      '- hireabilityScore: integer from 1 to 10\n' +
      '- summary: 2-3 sentences\n\n' +
      'Search results:\n' + searchResults;

    return await callAI({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemPrompt,
      temperature: 0.4
    });
  }

  // ── Format Search Results for AI Prompt ────────────────
  function formatSearchResults(results) {
    if (!results || results.length === 0) {
      return 'No search results found.';
    }
    return results.map(function (r, i) {
      return (i + 1) + '. ' + r.title + '\n   ' + r.snippet + '\n   ' + r.link;
    }).join('\n\n');
  }

  // ── Parse AI Response ──────────────────────────────────
  function parseAIResponse(response, projectName) {
    if (!response || !response.trim()) {
      throw new Error('JSON_PARSE_ERROR');
    }

    // Strip markdown code fences if present
    var cleaned = response.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
    cleaned = cleaned.trim();

    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // Try to extract JSON from within the response
      var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          throw new Error('JSON_PARSE_ERROR');
        }
      } else {
        throw new Error('JSON_PARSE_ERROR');
      }
    }

    // Validate and apply defaults
    var validSignals = ['yes', 'maybe', 'no'];
    var validRisks = ['low', 'medium', 'high'];

    var report = {
      fundingStatus: parsed.fundingStatus || 'Unknown',
      communitySize: parsed.communitySize || 'Unknown',
      hiringSignal: validSignals.indexOf((parsed.hiringSignal || '').toLowerCase()) !== -1
        ? parsed.hiringSignal.toLowerCase() : 'maybe',
      hiringEvidence: parsed.hiringEvidence || 'No evidence found',
      recommendedApproach: parsed.recommendedApproach || 'Not specified',
      bestDMAngle: parsed.bestDMAngle || 'Not specified',
      suggestedOpeningLine: parsed.suggestedOpeningLine || '',
      riskLevel: validRisks.indexOf((parsed.riskLevel || '').toLowerCase()) !== -1
        ? parsed.riskLevel.toLowerCase() : 'medium',
      riskNote: parsed.riskNote || '',
      hireabilityScore: clampScore(parsed.hireabilityScore),
      summary: parsed.summary || 'No summary available for ' + projectName + '.'
    };

    return report;
  }

  function clampScore(val) {
    var n = parseInt(val, 10);
    if (isNaN(n)) return 5;
    return Math.max(1, Math.min(10, n));
  }

  // ═══════════════════════════════════════════════════════════
  //  REPORT RENDERING
  // ═══════════════════════════════════════════════════════════

  function renderReport(report, projectName) {
    // Project name
    document.getElementById('report-name').textContent = projectName;

    // Score badge
    var scoreBadge = document.getElementById('report-score-badge');
    var scoreValue = document.getElementById('report-score-value');
    scoreValue.textContent = report.hireabilityScore;
    scoreBadge.className = 'report-score-badge ' + getScoreClass(report.hireabilityScore);

    // Summary
    document.getElementById('report-summary').textContent = report.summary;

    // Detail rows
    document.getElementById('report-funding').textContent = report.fundingStatus;
    document.getElementById('report-community').textContent = report.communitySize;

    // Hiring signal badge
    var hiringEl = document.getElementById('report-hiring-signal');
    hiringEl.innerHTML = '';
    var signalBadge = document.createElement('span');
    signalBadge.className = 'hiring-signal-badge hiring-signal-' + report.hiringSignal;
    signalBadge.textContent = report.hiringSignal.toUpperCase();
    hiringEl.appendChild(signalBadge);

    document.getElementById('report-evidence').textContent = report.hiringEvidence;
    document.getElementById('report-approach').textContent = report.recommendedApproach;

    // Risk level badge
    var riskEl = document.getElementById('report-risk');
    riskEl.innerHTML = '';
    var riskBadge = document.createElement('span');
    riskBadge.className = 'risk-badge risk-' + report.riskLevel;
    riskBadge.textContent = report.riskLevel.toUpperCase();
    if (report.riskNote) {
      riskBadge.title = report.riskNote;
    }
    riskEl.appendChild(riskBadge);

    // DM Angle card
    document.getElementById('report-dm-angle').textContent = report.bestDMAngle;
    document.getElementById('report-dm-opening').textContent = report.suggestedOpeningLine;

    // Reset save button state
    btnSaveReport.classList.remove('saved');
    btnSaveReport.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save Report';
  }

  function getScoreClass(score) {
    if (score <= 3) return 'score-low';
    if (score <= 6) return 'score-mid';
    return 'score-high';
  }

  // ═══════════════════════════════════════════════════════════
  //  PROGRESS INDICATOR
  // ═══════════════════════════════════════════════════════════

  function showLoading() {
    loadingSection.hidden = false;
  }

  function hideLoading() {
    loadingSection.hidden = true;
  }

  function resetProgress() {
    progressSteps.forEach(function (step) {
      step.classList.remove('active', 'complete');
    });
  }

  function activateStep(num) {
    progressSteps.forEach(function (step) {
      var n = parseInt(step.getAttribute('data-step'), 10);
      if (n === num) {
        step.classList.add('active');
      }
    });
  }

  function completeStep(num) {
    progressSteps.forEach(function (step) {
      var n = parseInt(step.getAttribute('data-step'), 10);
      if (n === num) {
        step.classList.remove('active');
        step.classList.add('complete');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  REPORT SHOW/HIDE
  // ═══════════════════════════════════════════════════════════

  function showReport() {
    reportSection.hidden = false;
  }

  function hideReport() {
    reportSection.hidden = true;
  }

  // ═══════════════════════════════════════════════════════════
  //  ERROR HANDLING
  // ═══════════════════════════════════════════════════════════

  function handleResearchError(err) {
    var title = 'Something went wrong';
    var message = 'Please try again.';

    if (err.message === 'SEARCH_ERROR') {
      title = 'Search failed';
      message = 'Could not search for project data. Please check your connection and try again.';
    } else if (err.message === 'JSON_PARSE_ERROR') {
      title = 'AI response error';
      message = 'Could not parse the research report. The AI may have returned an unexpected format. Please try again.';
    } else if (err.message === 'AI_AUTH_ERROR') {
      title = 'AI authentication failed';
      message = 'The AI service API key is invalid. Please check your configuration.';
    } else if (err.message === 'AI_RATE_LIMIT') {
      title = 'Rate limited';
      message = 'Too many requests to the AI service. Please wait a moment and try again.';
    } else if (err.message === 'AI_NETWORK_ERROR') {
      title = 'Network error';
      message = 'Could not reach the AI service. Please check your connection.';
    } else if (err.message === 'AI_SERVER_ERROR') {
      title = 'AI service error';
      message = 'The AI service returned an error. Please try again later.';
    }

    showError(title, message);
  }

  function showError(title, message) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    errorSection.hidden = false;
  }

  function hideError() {
    errorSection.hidden = true;
  }

  // ═══════════════════════════════════════════════════════════
  //  RECENT SEARCHES
  // ═══════════════════════════════════════════════════════════

  var RECENT_KEY = 'avalan3-recent-searches';
  var MAX_RECENT = 5;

  function loadRecentSearches() {
    var recent = getRecentSearches();
    renderRecentChips(recent);
  }

  function getRecentSearches() {
    try {
      var data = localStorage.getItem(RECENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function addRecentSearch(projectName) {
    var recent = getRecentSearches();
    // Remove duplicate if exists
    recent = recent.filter(function (r) { return r.toLowerCase() !== projectName.toLowerCase(); });
    // Add to front
    recent.unshift(projectName);
    // Trim to max
    if (recent.length > MAX_RECENT) {
      recent = recent.slice(0, MAX_RECENT);
    }
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (e) {
      // Storage full — ignore
    }
    renderRecentChips(recent);
  }

  function renderRecentChips(recent) {
    recentContainer.innerHTML = '';
    if (!recent || recent.length === 0) return;

    recent.forEach(function (name) {
      var chip = document.createElement('button');
      chip.className = 'research-recent-chip';
      chip.type = 'button';
      chip.setAttribute('aria-label', 'Search for ' + name);

      var textSpan = document.createElement('span');
      textSpan.textContent = name;
      chip.appendChild(textSpan);

      // Small search icon
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '12');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '11');
      circle.setAttribute('cy', '11');
      circle.setAttribute('r', '8');
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '21');
      line.setAttribute('y1', '21');
      line.setAttribute('x2', '16.65');
      line.setAttribute('y2', '16.65');
      svg.appendChild(circle);
      svg.appendChild(line);
      chip.appendChild(svg);

      chip.addEventListener('click', function () {
        input.value = name;
        btnResearch.disabled = false;
        runResearch(name);
      });

      recentContainer.appendChild(chip);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  SAVE REPORT TO FIRESTORE
  // ═══════════════════════════════════════════════════════════

  async function saveCurrentReport() {
    if (!currentReport || !currentUser) return;

    try {
      btnSaveReport.disabled = true;
      btnSaveReport.innerHTML = 'Saving&hellip;';

      var reportData = {
        projectName: currentProjectName,
        hireabilityScore: currentReport.hireabilityScore,
        fundingStatus: currentReport.fundingStatus,
        communitySize: currentReport.communitySize,
        hiringSignal: currentReport.hiringSignal,
        hiringEvidence: currentReport.hiringEvidence,
        recommendedApproach: currentReport.recommendedApproach,
        bestDMAngle: currentReport.bestDMAngle,
        suggestedOpeningLine: currentReport.suggestedOpeningLine,
        riskLevel: currentReport.riskLevel,
        riskNote: currentReport.riskNote,
        summary: currentReport.summary
      };

      await saveResearch(currentUser.uid, reportData);

      btnSaveReport.classList.add('saved');
      btnSaveReport.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Saved';
      showToastCustom('Report saved');

      // Refresh saved list
      loadSavedReports();

    } catch (err) {
      showToastCustom('Failed to save report');
      btnSaveReport.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save Report';
    } finally {
      btnSaveReport.disabled = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SAVED REPORTS PANEL
  // ═══════════════════════════════════════════════════════════

  async function loadSavedReports() {
    if (!currentUser) return;
    try {
      savedReports = await getSavedResearch(currentUser.uid);
      renderSavedList();
    } catch (err) {
      // Silently fail — panel will show empty
    }
  }

  function renderSavedList() {
    savedList.innerHTML = '';

    if (!savedReports || savedReports.length === 0) {
      savedEmpty.hidden = false;
      return;
    }

    savedEmpty.hidden = true;

    savedReports.forEach(function (report) {
      var item = document.createElement('div');
      item.className = 'saved-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');

      // Score mini-badge
      var scoreEl = document.createElement('span');
      scoreEl.className = 'saved-item-score ' + getScoreClass(report.hireabilityScore || 5);
      scoreEl.textContent = report.hireabilityScore || '?';
      item.appendChild(scoreEl);

      // Info
      var info = document.createElement('div');
      info.className = 'saved-item-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'saved-item-name';
      nameEl.textContent = report.projectName || 'Unknown';
      info.appendChild(nameEl);

      var metaEl = document.createElement('div');
      metaEl.className = 'saved-item-meta';

      var dateEl = document.createElement('span');
      dateEl.textContent = report.createdAt ? formatDate(report.createdAt) : '';
      metaEl.appendChild(dateEl);

      var signalEl = document.createElement('span');
      signalEl.textContent = '• ' + ((report.hiringSignal || 'maybe')).toUpperCase();
      metaEl.appendChild(signalEl);

      info.appendChild(metaEl);
      item.appendChild(info);

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'saved-item-delete';
      deleteBtn.setAttribute('aria-label', 'Delete report for ' + (report.projectName || ''));
      deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteSavedReport(report.id);
      });

      item.appendChild(deleteBtn);

      // Tap to view
      item.addEventListener('click', function () {
        viewSavedReport(report);
      });

      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          viewSavedReport(report);
        }
      });

      savedList.appendChild(item);
    });
  }

  function viewSavedReport(report) {
    closeSavedPanel();

    // Populate the report card with saved data
    currentReport = {
      fundingStatus: report.fundingStatus,
      communitySize: report.communitySize,
      hiringSignal: report.hiringSignal,
      hiringEvidence: report.hiringEvidence,
      recommendedApproach: report.recommendedApproach,
      bestDMAngle: report.bestDMAngle,
      suggestedOpeningLine: report.suggestedOpeningLine,
      riskLevel: report.riskLevel,
      riskNote: report.riskNote,
      hireabilityScore: report.hireabilityScore,
      summary: report.summary
    };
    currentProjectName = report.projectName || 'Unknown';

    renderReport(currentReport, currentProjectName);
    hideError();
    hideLoading();
    showReport();

    // Mark as saved
    btnSaveReport.classList.add('saved');
    btnSaveReport.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Saved';
  }

  async function deleteSavedReport(reportId) {
    if (!currentUser || !reportId) return;
    try {
      await deleteResearchDoc(currentUser.uid, reportId);
      showToastCustom('Report deleted');
      loadSavedReports();
    } catch (err) {
      showToastCustom('Failed to delete');
    }
  }

  // ── Delete helper (direct Firestore call) ──────────────
  async function deleteResearchDoc(uid, reportId) {
    await db.collection('users').doc(uid).collection('research').doc(reportId).delete();
  }

  // ═══════════════════════════════════════════════════════════
  //  SAVED PANEL OPEN/CLOSE
  // ═══════════════════════════════════════════════════════════

  function openSavedPanel() {
    savedPanel.classList.add('open');
    savedOverlay.hidden = false;
    // Trigger overlay fade-in
    requestAnimationFrame(function () {
      savedOverlay.classList.add('visible');
    });
    document.body.style.overflow = 'hidden';

    // Refresh list
    if (currentUser) {
      loadSavedReports();
    }
  }

  function closeSavedPanel() {
    savedPanel.classList.remove('open');
    savedOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    setTimeout(function () {
      savedOverlay.hidden = true;
    }, 300);
  }

  // ═══════════════════════════════════════════════════════════
  //  CLIPBOARD
  // ═══════════════════════════════════════════════════════════

  function copyToClipboardCustom(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToastCustom('Copied to clipboard');
      }).catch(function () {
        fallbackCopyCustom(text);
      });
    } else {
      fallbackCopyCustom(text);
    }
  }

  function fallbackCopyCustom(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToastCustom('Copied to clipboard');
    } catch (e) {
      showToastCustom('Copy failed');
    }
    document.body.removeChild(ta);
  }

  // ═══════════════════════════════════════════════════════════
  //  TOAST
  // ═══════════════════════════════════════════════════════════

  function createToastElement() {
    if (document.querySelector('.copy-toast')) return;
    var toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  function showToastCustom(message) {
    var toast = document.querySelector('.copy-toast');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add('visible');

    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
      toastTimer = null;
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

})();

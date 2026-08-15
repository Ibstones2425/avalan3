// ═══════════════════════════════════════════════════════════
// AVALAN3 — AI GUIDE PAGE JS
// Full AI chat interface with Gemini/Grok, web search,
// message persistence, suggested prompts, and settings.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────
  var state = {
    messages: [],
    isLoading: false,
    isSending: false,
    webSearchOn: false,
    provider: 'gemini',
    lastFailedMessage: null
  };

  // ── DOM Cache ─────────────────────────────────────────
  var dom = {};

  // ── Constants ─────────────────────────────────────────
  var SYSTEM_PROMPT_BASE =
    'You are the Avalan3 AI — a tactical Web3 earning advisor for intermediate to professional operators. ' +
    'USER: Lane: {{lane}}, Work Style: {{workStyle}}. ' +
    'RULES: ' +
    '1. Never explain what Web3 is. The user already knows. Skip all basics. ' +
    '2. Give specific, tactical advice. Not theory — actual next moves. ' +
    '3. When asked about DMs: write ready-to-send copy, not guidelines. ' +
    '4. When asked about projects: give concrete steps to find, vet, and approach them. ' +
    '5. When asked about rates: give real ranges based on current market. No hedging. ' +
    '6. Discovery priority: CryptoRank fundraising, DeFiLlama raises, DexScreener new pairs, ICO Drops upcoming. ' +
    '7. Job board priority: CryptoJobsList, LaborX, web3.career, Superteam Earn, DAOmatch, remote3.co. ' +
    '8. DM rules: mention exactly how you found them, personalise to their specific project, max 7 lines, end soft. ' +
    '9. No disclaimers. No "it depends". No padding. Answer the question and stop. ' +
    '10. If web search results are provided, use them. Cite the source inline briefly.';

  var SUGGESTED_PROMPTS = [
    'Find 3 projects that raised funding this week I can approach',
    'Write me a cold DM for a community manager role',
    'What hashtags should I use for my lane right now?',
    'Research a specific project and score their hire-ability',
    'Rewrite my DM — it\'s not getting replies',
    'What is the going rate for a Web3 CM right now?',
    'Which chains have the most active hiring this month?',
    'Draft a follow-up DM for a project that didn\'t reply in 48hrs'
  ];

  var ERROR_MESSAGES = {
    AI_NETWORK_ERROR: 'Couldn\'t reach the AI right now. Check your connection and try again.',
    AI_AUTH_ERROR: 'Your API key isn\'t working. Go to Settings \u2192 AI Provider and check your key.',
    AI_RATE_LIMIT: 'You\'ve hit the rate limit. Wait a minute and try again.',
    AI_SERVER_ERROR: 'The AI service is temporarily unavailable. Try again in a moment.',
    SEARCH_ERROR: 'Web search unavailable \u2014 answering from knowledge.'
  };

  // ── Initialise ────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', cacheDOM);

  window.addEventListener('avalan3:auth-ready', function (e) {
    var detail = e.detail || {};
    onAuthReady(detail.user, detail.profile);
  });

  function cacheDOM() {
    dom.providerBadge   = document.getElementById('provider-badge');
    dom.btnSearchToggle = document.getElementById('btn-search-toggle');
    dom.btnSettings     = document.getElementById('btn-settings');
    dom.chatArea        = document.getElementById('chat-area');
    dom.suggested       = document.getElementById('suggested-prompts');
    dom.messageList     = document.getElementById('message-list');
    dom.skeleton        = document.getElementById('skeleton-loader');
    dom.searchIndicator = document.getElementById('search-indicator');
    dom.chatInput       = document.getElementById('chat-input');
    dom.btnSend         = document.getElementById('btn-send');
    dom.drawerOverlay   = document.getElementById('drawer-overlay');
    dom.drawer          = document.getElementById('settings-drawer');
    dom.btnDrawerClose  = document.getElementById('btn-drawer-close');
    dom.providerToggle  = document.getElementById('provider-toggle');
    dom.toggleWebSearch = document.getElementById('toggle-web-search');
    dom.btnClearChat    = document.getElementById('btn-clear-chat');
    dom.confirmOverlay  = document.getElementById('confirm-modal-overlay');
    dom.btnConfirmCancel= document.getElementById('btn-confirm-cancel');
    dom.btnConfirmClear = document.getElementById('btn-confirm-clear');
    dom.toast           = document.getElementById('ai-toast');

    bindEvents();
  }

  function onAuthReady(user, profile) {
    if (!user) return;

    // Load user settings from Firestore profile
    loadSettings(profile);

    // Load chat history
    loadChatHistory(user.uid);

    // Check URL for DM template param
    checkTemplateParam();

    // Focus input
    dom.chatInput.focus();
  }

  // ── Settings ──────────────────────────────────────────
  function loadSettings(profile) {
    if (!profile) return;

    // Provider
    if (profile.aiProvider === 'grok') {
      state.provider = 'grok';
    }
    updateProviderUI();

    // Web search
    if (profile.webSearchOn === true) {
      state.webSearchOn = true;
    }
    updateSearchUI();

    // Update config to match saved provider
    AVALAN3_CONFIG.ai.activeProvider = state.provider;
  }

  async function saveProviderToFirestore(provider) {
    if (!currentUser) return;
    try {
      await updateUserProfile(currentUser.uid, { aiProvider: provider });
    } catch (err) {
      console.error('Failed to save provider setting:', err);
    }
  }

  async function saveWebSearchToFirestore(enabled) {
    if (!currentUser) return;
    try {
      await updateUserProfile(currentUser.uid, { webSearchOn: enabled });
    } catch (err) {
      console.error('Failed to save web search setting:', err);
    }
  }

  // ── Provider UI ───────────────────────────────────────
  function updateProviderUI() {
    // Badge
    dom.providerBadge.textContent = state.provider === 'gemini' ? 'Gemini' : 'Grok';
    dom.providerBadge.classList.toggle('grok', state.provider === 'grok');

    // Toggle buttons
    var options = dom.providerToggle.querySelectorAll('.ai-provider-option');
    options.forEach(function (opt) {
      var isActive = opt.getAttribute('data-provider') === state.provider;
      opt.classList.toggle('active', isActive);
      opt.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    // Update global config
    AVALAN3_CONFIG.ai.activeProvider = state.provider;
  }

  // ── Search UI ─────────────────────────────────────────
  function updateSearchUI() {
    // Toggle switch
    dom.toggleWebSearch.setAttribute('aria-checked', state.webSearchOn ? 'true' : 'false');

    // Top bar button
    dom.btnSearchToggle.classList.toggle('search-active', state.webSearchOn);

    // Search indicator above input
    dom.searchIndicator.style.display = state.webSearchOn ? 'flex' : 'none';
  }

  // ── Chat History ──────────────────────────────────────
  async function loadChatHistory(uid) {
    showSkeleton(true);

    try {
      var history = await getChatHistory(uid);
      state.messages = history || [];
      renderMessages();
    } catch (err) {
      console.error('Failed to load chat history:', err);
      state.messages = [];
      renderMessages();
    }

    showSkeleton(false);
    updateSuggestedVisibility();
  }

  function showSkeleton(show) {
    if (dom.skeleton) {
      dom.skeleton.classList.toggle('hidden', !show);
    }
    state.isLoading = show;
  }

  // ── Render Messages ───────────────────────────────────
  function renderMessages() {
    // Clear existing messages (but keep skeleton)
    var existing = dom.messageList.querySelectorAll('.ai-msg-row, .ai-error-row, .ai-typing-row');
    existing.forEach(function (el) { el.remove(); });

    state.messages.forEach(function (msg) {
      appendMessageDOM(msg, false);
    });

    scrollToBottom();
  }

  function appendMessageDOM(msg, animate) {
    var row;
    if (msg.role === 'user') {
      row = createUserBubble(msg);
    } else if (msg.role === 'error') {
      row = createErrorBubble(msg);
    } else {
      row = createAIBubble(msg);
    }

    if (!animate) {
      row.style.animation = 'none';
    }

    dom.messageList.appendChild(row);
  }

  function createUserBubble(msg) {
    var row = document.createElement('div');
    row.className = 'ai-msg-row user';

    var bubble = document.createElement('div');
    bubble.className = 'ai-bubble-user';
    bubble.textContent = msg.content;

    row.appendChild(bubble);
    return row;
  }

  function createAIBubble(msg) {
    var row = document.createElement('div');
    row.className = 'ai-msg-row ai';

    var wrapper = document.createElement('div');

    var bubble = document.createElement('div');
    bubble.className = 'ai-bubble-ai';
    bubble.innerHTML = renderMarkdown(msg.content);

    wrapper.appendChild(bubble);

    // Meta row: provider icon + timestamp
    var meta = document.createElement('div');
    meta.className = 'ai-msg-meta';

    var iconSvg = state.provider === 'gemini'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    meta.innerHTML = iconSvg + ' <span>' + (msg.provider || state.provider) + '</span> \u00B7 <span>' + formatRelativeTime(msg.timestamp || Date.now()) + '</span>';

    wrapper.appendChild(meta);

    // Search tag
    if (msg.searched) {
      var tag = document.createElement('div');
      tag.className = 'ai-search-tag';
      tag.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Searched the web';
      wrapper.appendChild(tag);
    }

    row.appendChild(wrapper);
    return row;
  }

  function createErrorBubble(msg) {
    var row = document.createElement('div');
    row.className = 'ai-error-row';

    var wrapper = document.createElement('div');
    wrapper.className = 'ai-error-bubble';

    var text = document.createElement('div');
    text.className = 'ai-error-text';
    text.textContent = msg.content;
    wrapper.appendChild(text);

    // Retry button
    var retryBtn = document.createElement('button');
    retryBtn.className = 'ai-retry-btn';
    retryBtn.type = 'button';
    retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Retry';
    retryBtn.addEventListener('click', function () {
      retryLastMessage();
    });
    wrapper.appendChild(retryBtn);

    row.appendChild(wrapper);
    return row;
  }

  // ── Typing Indicator ──────────────────────────────────
  function showTypingIndicator() {
    removeTypingIndicator();

    var row = document.createElement('div');
    row.className = 'ai-typing-row';
    row.id = 'typing-indicator';

    var bubble = document.createElement('div');
    bubble.className = 'ai-typing-bubble';
    bubble.innerHTML = '<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';

    row.appendChild(bubble);
    dom.messageList.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    var existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();
  }

  // ── Send Message ──────────────────────────────────────
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    if (state.isSending) return;

    var content = text.trim();
    state.isSending = true;
    updateSendButton();

    // Add user message to state
    var userMsg = {
      role: 'user',
      content: content,
      timestamp: Date.now()
    };
    state.messages.push(userMsg);

    // Render user bubble
    appendMessageDOM(userMsg, true);
    scrollToBottom();
    updateSuggestedVisibility();

    // Clear input
    dom.chatInput.value = '';

    // Save to Firestore
    if (currentUser) {
      saveChatMessage(currentUser.uid, {
        role: 'user',
        content: content
      }).catch(function (err) {
        console.error('Failed to save user message:', err);
      });
    }

    // Build AI context
    var searchResults = null;
    var searched = false;

    // Web search if enabled
    if (state.webSearchOn) {
      try {
        searchResults = await webSearch(content);
        searched = true;
      } catch (err) {
        // Show search error as a soft notification, continue without search
        var searchWarnMsg = {
          role: 'error',
          content: ERROR_MESSAGES.SEARCH_ERROR
        };
        state.messages.push(searchWarnMsg);
        appendMessageDOM(searchWarnMsg, true);
        scrollToBottom();
        searched = false;
      }
    }

    // Build messages array for AI
    var aiMessages = buildAIMessages(content, searchResults);

    // Show typing
    showTypingIndicator();

    // Call AI
    try {
      var systemPrompt = buildSystemPrompt();
      var aiResponse = await callAI({
        messages: aiMessages,
        systemPrompt: systemPrompt,
        temperature: 0.7
      });

      removeTypingIndicator();

      // Add AI message
      var aiMsg = {
        role: 'assistant',
        content: aiResponse,
        provider: state.provider,
        timestamp: Date.now(),
        searched: searched
      };
      state.messages.push(aiMsg);
      appendMessageDOM(aiMsg, true);
      scrollToBottom();

      // Save to Firestore
      if (currentUser) {
        saveChatMessage(currentUser.uid, {
          role: 'assistant',
          content: aiResponse,
          provider: state.provider,
          searched: searched
        }).catch(function (err) {
          console.error('Failed to save AI message:', err);
        });
      }

      state.lastFailedMessage = null;

    } catch (err) {
      removeTypingIndicator();

      var errorKey = err.message || 'AI_SERVER_ERROR';
      var errorText = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.AI_SERVER_ERROR;

      var errorMsg = {
        role: 'error',
        content: errorText
      };
      state.messages.push(errorMsg);
      appendMessageDOM(errorMsg, true);
      scrollToBottom();

      // Track for retry
      state.lastFailedMessage = content;
    }

    state.isSending = false;
    updateSendButton();
    dom.chatInput.focus();
  }

  function buildAIMessages(currentContent, searchResults) {
    // Build conversation history (last 20 messages for context window)
    var contextMessages = state.messages
      .filter(function (m) { return m.role === 'user' || m.role === 'assistant'; })
      .slice(-21, -1) // exclude the just-added user message, take up to 20 prior
      .map(function (m) {
        return { role: m.role, content: m.content };
      });

    // Current user message
    var userContent = currentContent;
    if (searchResults && searchResults.length > 0) {
      var searchContext = 'Web search results:\n';
      searchResults.forEach(function (r, i) {
        searchContext += (i + 1) + '. ' + r.title + '\n   ' + r.snippet + '\n   ' + r.link + '\n';
      });
      searchContext += '\nUse these results to inform your answer.\n\nUser question: ' + currentContent;
      userContent = searchContext;
    }

    contextMessages.push({ role: 'user', content: userContent });
    return contextMessages;
  }

  function buildSystemPrompt() {
    var lane = (window.userProfile && window.userProfile.lane) || 'community-manager';
    var workStyle = (window.userProfile && window.userProfile.workStyle) || 'both';
    return SYSTEM_PROMPT_BASE
      .replace('{{lane}}', lane)
      .replace('{{workStyle}}', workStyle);
  }

  // ── Retry ─────────────────────────────────────────────
  function retryLastMessage() {
    // Remove the last error from state and DOM
    var lastError = dom.messageList.querySelector('.ai-error-row:last-child');
    if (lastError) lastError.remove();

    if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'error') {
      state.messages.pop();
    }

    if (state.lastFailedMessage) {
      sendMessage(state.lastFailedMessage);
    }
  }

  // ── Suggested Prompts ─────────────────────────────────
  function updateSuggestedVisibility() {
    var hasMessages = state.messages.some(function (m) {
      return m.role === 'user' || m.role === 'assistant';
    });
    dom.suggested.classList.toggle('hidden', hasMessages);
  }

  function handlePromptChip(prompt) {
    dom.chatInput.value = prompt;
    sendMessage(prompt);
  }

  // ── Template Param (DM personalisation) ───────────────
  function checkTemplateParam() {
    var params = new URLSearchParams(window.location.search);
    var template = params.get('template');
    if (template) {
      // Pre-load DM template text into chat
      var templateText = decodeURIComponent(template);
      setTimeout(function () {
        sendMessage(templateText);
      }, 500);
    }
  }

  // ── Settings Drawer ───────────────────────────────────
  function openDrawer() {
    dom.drawer.classList.add('open');
    dom.drawerOverlay.classList.add('visible');
    dom.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    dom.drawer.classList.remove('open');
    dom.drawerOverlay.classList.remove('visible');
    dom.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ── Confirm Modal ─────────────────────────────────────
  function openConfirmModal() {
    dom.confirmOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeConfirmModal() {
    dom.confirmOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  async function clearChatHistory() {
    closeConfirmModal();
    closeDrawer();

    if (!currentUser) return;

    try {
      await deleteChatHistory(currentUser.uid);
      state.messages = [];
      renderMessages();
      updateSuggestedVisibility();
      showToast('Chat history cleared', 'success');
    } catch (err) {
      console.error('Failed to clear chat history:', err);
      showToast('Failed to clear history', 'error');
    }
  }

  // ── Toast ─────────────────────────────────────────────
  var toastTimer = null;

  function showToast(message, type) {
    if (toastTimer) clearTimeout(toastTimer);

    dom.toast.textContent = message;
    dom.toast.className = 'ai-toast visible';
    if (type === 'error') dom.toast.classList.add('error');
    if (type === 'success') dom.toast.classList.add('success');

    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('visible');
      toastTimer = null;
    }, 2500);
  }

  // ── UI Helpers ────────────────────────────────────────
  function updateSendButton() {
    var hasText = dom.chatInput.value.trim().length > 0;
    dom.btnSend.disabled = !hasText || state.isSending;
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      dom.messageList.scrollTop = dom.messageList.scrollHeight;
    });
  }

  // ── Event Bindings ────────────────────────────────────
  function bindEvents() {
    // Input
    dom.chatInput.addEventListener('input', updateSendButton);
    dom.chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!dom.btnSend.disabled) {
          sendMessage(dom.chatInput.value);
        }
      }
    });

    // Send button
    dom.btnSend.addEventListener('click', function () {
      sendMessage(dom.chatInput.value);
    });

    // Suggested prompt chips
    var chips = document.querySelectorAll('.ai-prompt-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var prompt = this.getAttribute('data-prompt');
        handlePromptChip(prompt);
      });
    });

    // Search toggle (top bar)
    dom.btnSearchToggle.addEventListener('click', function () {
      state.webSearchOn = !state.webSearchOn;
      updateSearchUI();
      saveWebSearchToFirestore(state.webSearchOn);
      showToast(state.webSearchOn ? 'Web search enabled' : 'Web search disabled', 'success');
    });

    // Settings button
    dom.btnSettings.addEventListener('click', openDrawer);

    // Drawer close
    dom.btnDrawerClose.addEventListener('click', closeDrawer);
    dom.drawerOverlay.addEventListener('click', closeDrawer);

    // Provider toggle
    var providerOptions = dom.providerToggle.querySelectorAll('.ai-provider-option');
    providerOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var provider = this.getAttribute('data-provider');
        if (provider === state.provider) return;
        state.provider = provider;
        updateProviderUI();
        saveProviderToFirestore(provider);
        showToast('Switched to ' + (provider === 'gemini' ? 'Gemini' : 'Grok'), 'success');
      });
    });

    // Web search toggle (in drawer)
    dom.toggleWebSearch.addEventListener('click', function () {
      state.webSearchOn = !state.webSearchOn;
      updateSearchUI();
      saveWebSearchToFirestore(state.webSearchOn);
    });

    // Clear chat
    dom.btnClearChat.addEventListener('click', openConfirmModal);

    // Confirm modal
    dom.btnConfirmCancel.addEventListener('click', closeConfirmModal);
    dom.btnConfirmClear.addEventListener('click', clearChatHistory);

    // Close confirm modal on overlay click
    dom.confirmOverlay.addEventListener('click', function (e) {
      if (e.target === dom.confirmOverlay) {
        closeConfirmModal();
      }
    });

    // Keyboard: Escape to close drawer/modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (dom.confirmOverlay.style.display === 'flex') {
          closeConfirmModal();
        } else if (dom.drawer.classList.contains('open')) {
          closeDrawer();
        }
      }
    });

    // Touch: swipe down on drawer to close
    var drawerStartY = 0;
    var drawerCurrentY = 0;

    dom.drawer.addEventListener('touchstart', function (e) {
      drawerStartY = e.touches[0].clientY;
    }, { passive: true });

    dom.drawer.addEventListener('touchmove', function (e) {
      drawerCurrentY = e.touches[0].clientY;
      var diff = drawerCurrentY - drawerStartY;
      if (diff > 0) {
        dom.drawer.style.transform = 'translateY(' + diff + 'px)';
      }
    }, { passive: true });

    dom.drawer.addEventListener('touchend', function () {
      var diff = drawerCurrentY - drawerStartY;
      dom.drawer.style.transform = '';

      if (diff > 80) {
        closeDrawer();
      }
    }, { passive: true });
  }

})();

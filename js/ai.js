// ═══════════════════════════════════════════════════════════
// AVALAN3 — AI ABSTRACTION LAYER
// Unified interface for Gemini and Grok providers.
// ═══════════════════════════════════════════════════════════

async function callAI({ messages, systemPrompt, temperature = 0.7 }) {
  const provider = AVALAN3_CONFIG.ai.activeProvider;

  try {
    if (provider === 'gemini') {
      return await callGemini({ messages, systemPrompt, temperature });
    } else {
      return await callGrok({ messages, systemPrompt, temperature });
    }
  } catch (err) {
    // Re-throw our custom error codes
    if (err.message.startsWith('AI_')) throw err;

    // Classify unknown errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('AI_NETWORK_ERROR');
    }
    throw new Error('AI_SERVER_ERROR');
  }
}

async function callGemini({ messages, systemPrompt, temperature }) {
  const { apiKey, model, baseUrl } = AVALAN3_CONFIG.ai.gemini;
  const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: { temperature, maxOutputTokens: 1000 }
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 401) throw new Error('AI_AUTH_ERROR');
  if (res.status === 429) throw new Error('AI_RATE_LIMIT');
  if (!res.ok) throw new Error('AI_SERVER_ERROR');

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGrok({ messages, systemPrompt, temperature }) {
  const { apiKey, model, baseUrl } = AVALAN3_CONFIG.ai.grok;

  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt });
  }
  allMessages.push(...messages);

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: allMessages,
      temperature,
      max_tokens: 1000
    })
  });

  if (res.status === 401) throw new Error('AI_AUTH_ERROR');
  if (res.status === 429) throw new Error('AI_RATE_LIMIT');
  if (!res.ok) throw new Error('AI_SERVER_ERROR');

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

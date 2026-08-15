// ═══════════════════════════════════════════════════════════
// AVALAN3 — WEB SEARCH (Serper.dev)
// Used by Research Mode and AI Guide (when search is toggled on).
// ═══════════════════════════════════════════════════════════

async function webSearch(query) {
  try {
    const res = await fetch(AVALAN3_CONFIG.serper.endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': AVALAN3_CONFIG.serper.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 5 })
    });

    if (!res.ok) throw new Error('SEARCH_ERROR');

    const data = await res.json();
    return (data.organic || []).map(r => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link
    }));
  } catch (err) {
    if (err.message === 'SEARCH_ERROR') throw err;
    throw new Error('SEARCH_ERROR');
  }
}

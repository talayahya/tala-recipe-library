(() => {
  const QUEUE_URL = 'https://raw.githubusercontent.com/talayahya/tala-recipe-library/main/log-queue.json';
  const POLL_MS = 20000;
  let importing = false;

  function ready() {
    return typeof dailyLog !== 'undefined' &&
      typeof getEntriesForDate === 'function' &&
      typeof entrySignature === 'function' &&
      typeof saveDailyLog === 'function' &&
      typeof renderDailyTracker === 'function' &&
      typeof renderHistory === 'function';
  }

  function normalMacros(value) {
    const source = value || {};
    const macros = {
      calories: Number(source.calories || 0),
      protein: Number(source.protein || 0),
      carbs: Number(source.carbs || 0),
      fat: Number(source.fat || 0),
      fibre: Number(source.fibre || 0),
      addedSugar: Number(source.addedSugar || 0),
      naturalSugar: Number(source.naturalSugar || 0),
      totalSugar: 0
    };
    macros.totalSugar = macros.addedSugar + macros.naturalSugar;
    return macros;
  }

  function deterministicCreatedAt(item, date) {
    if (item.createdAt) return item.createdAt;
    return `${date}T12:00:00.000Z`;
  }

  function candidateFromQueue(item) {
    if (!item || !item.label) return null;
    const date = item.date || (typeof todayLocal === 'function' ? todayLocal() : new Date().toISOString().slice(0, 10));
    const id = item.id || `queue-${date}-${String(item.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    return {
      date,
      entry: {
        id,
        label: String(item.label),
        macros: normalMacros(item.macros),
        details: Array.isArray(item.details) ? item.details.map(d => ({
          name: String(d.name || ''),
          amount: Number(d.amount || 0),
          unit: String(d.unit || '')
        })) : [],
        createdAt: deterministicCreatedAt(item, date)
      }
    };
  }

  function normalizedTime(value) {
    if (typeof normalTime === 'function') return normalTime(value);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value || '') : parsed.toISOString().slice(0, 19);
  }

  function sameQueuedOrigin(existing, incoming) {
    return String(existing?.label || '').trim().toLowerCase() === String(incoming?.label || '').trim().toLowerCase() &&
      normalizedTime(existing?.createdAt) === normalizedTime(incoming?.createdAt);
  }

  async function importQueue() {
    if (!ready() || importing) return;
    importing = true;
    let imported = 0;
    let corrected = 0;

    try {
      const response = await fetch(`${QUEUE_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Queue fetch failed: ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload.entries) ? payload.entries : []);

      for (const item of items) {
        const candidate = candidateFromQueue(item);
        if (!candidate) continue;
        const { date, entry } = candidate;

        if (!dailyLog[date]) dailyLog[date] = { entries: [] };
        if (!Array.isArray(dailyLog[date].entries)) dailyLog[date].entries = [];
        const entries = dailyLog[date].entries;
        const signature = entrySignature(entry);

        if (entries.some(existing => existing.id === entry.id || entrySignature(existing) === signature)) continue;

        const correctionIndex = entries.findIndex(existing => sameQueuedOrigin(existing, entry));
        if (correctionIndex >= 0) {
          const existing = entries[correctionIndex];
          if (typeof supabaseUser !== 'undefined' && supabaseUser && typeof isUUID === 'function' && isUUID(existing.id) && typeof deleteSupabaseEntry === 'function') {
            await deleteSupabaseEntry(existing.id);
          }
          entries[correctionIndex] = entry;
          saveDailyLog();
          if (typeof supabaseUser !== 'undefined' && supabaseUser && typeof saveEntryToSupabase === 'function') {
            await saveEntryToSupabase(date, entry, true);
          }
          corrected += 1;
          continue;
        }

        entries.push(entry);
        saveDailyLog();
        imported += 1;

        if (typeof supabaseUser !== 'undefined' && supabaseUser && typeof saveEntryToSupabase === 'function') {
          await saveEntryToSupabase(date, entry, true);
        }
      }

      if (imported || corrected) {
        saveDailyLog();
        renderDailyTracker();
        renderHistory();
        if (typeof showToast === 'function') {
          if (corrected && !imported) showToast(`Corrected ${corrected} logged meal${corrected === 1 ? '' : 's'}`);
          else if (imported && !corrected) showToast(`Imported ${imported} logged meal${imported === 1 ? '' : 's'}`);
          else showToast(`Imported ${imported} · corrected ${corrected}`);
        }
        if (typeof publishCanonicalFoodDatabase === 'function') publishCanonicalFoodDatabase();
      }
    } catch (error) {
      console.warn('Food log queue import failed:', error);
    } finally {
      importing = false;
    }
  }

  function waitForApp() {
    if (!ready()) {
      setTimeout(waitForApp, 250);
      return;
    }
    importQueue();
    setInterval(importQueue, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) importQueue();
    });
  }

  window.importFoodLogQueue = importQueue;
  waitForApp();
})();
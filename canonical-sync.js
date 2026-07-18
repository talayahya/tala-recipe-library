(() => {
  const BUCKET = 'food-log-public';
  const FILE_PATH = 'canonical-food-database.json';
  const PUBLIC_URL = 'https://dnpfritorhkyqfxqicnd.supabase.co/storage/v1/object/public/food-log-public/canonical-food-database.json';
  let lastSignature = '';
  let publishing = false;

  function ready() {
    return typeof supabaseClient !== 'undefined' && supabaseClient &&
      typeof supabaseUser !== 'undefined' && supabaseUser &&
      typeof ingredients !== 'undefined' && Array.isArray(ingredients) && ingredients.length &&
      typeof recipes !== 'undefined' && Array.isArray(recipes);
  }

  function buildPayload() {
    const targets = typeof macroTargets !== 'undefined' ? macroTargets : null;
    return {
      schemaVersion: 1,
      source: 'Food Log',
      publicUrl: PUBLIC_URL,
      updatedAt: new Date().toISOString(),
      macroTargets: targets,
      ingredients: ingredients,
      recipes: recipes
    };
  }

  function buildSignature() {
    const targets = typeof macroTargets !== 'undefined' ? macroTargets : null;
    return JSON.stringify({ ingredients, recipes, macroTargets: targets });
  }

  async function publish(force = false) {
    if (!ready() || publishing) return;
    const signature = buildSignature();
    if (!force && signature === lastSignature) return;

    publishing = true;
    try {
      const payload = buildPayload();
      const body = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .upload(FILE_PATH, body, {
          contentType: 'application/json',
          cacheControl: '60',
          upsert: true
        });
      if (error) throw error;
      lastSignature = signature;
      window.CANONICAL_FOOD_DATABASE_URL = PUBLIC_URL;
      document.dispatchEvent(new CustomEvent('canonical-food-database-published', { detail: { url: PUBLIC_URL } }));
    } catch (error) {
      console.warn('Canonical food database publish failed:', error);
      document.dispatchEvent(new CustomEvent('canonical-food-database-error', { detail: { message: error?.message || String(error) } }));
    } finally {
      publishing = false;
    }
  }

  window.publishCanonicalFoodDatabase = () => publish(true);
  window.CANONICAL_FOOD_DATABASE_URL = PUBLIC_URL;

  function waitForApp() {
    if (!ready()) {
      setTimeout(waitForApp, 250);
      return;
    }
    publish(true);
    setInterval(() => publish(false), 10000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) publish(false);
    });
  }

  waitForApp();
})();
(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const input = args[0];
    const url = String(input instanceof Request ? input.url : input || '');

    if (!/ingredients\.json(?:$|\?)/.test(url)) return response;

    try {
      const base = await response.clone().json();
      if (!Array.isArray(base)) return response;

      const additionsResponse = await originalFetch(`ingredients-additions.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!additionsResponse.ok) return response;
      const additions = await additionsResponse.json();
      if (!Array.isArray(additions)) return response;

      const existingIds = new Set(base.map(item => item?.id));
      additions.forEach(item => {
        if (item?.id && !existingIds.has(item.id)) base.push(item);
      });

      return new Response(JSON.stringify(base), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (error) {
      console.warn('Ingredient additions merge failed:', error);
      return response;
    }
  };
})();
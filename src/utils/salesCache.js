let salesCache = null;
let salesCacheTime = 0;
export const SALES_CACHE_TTL = 300_000;
export let sseRefreshTimer = null;

export const setSseRefreshTimer = (timer) => { sseRefreshTimer = timer; };
export const clearSseRefreshTimer = () => { if (sseRefreshTimer) clearTimeout(sseRefreshTimer); };

export const invalidateSalesCache = () => {
  salesCache = null;
  salesCacheTime = 0;
};

export const getSalesCache = () => ({ salesCache, salesCacheTime });
export const setSalesCache = (data) => {
  salesCache = data;
  salesCacheTime = Date.now();
};
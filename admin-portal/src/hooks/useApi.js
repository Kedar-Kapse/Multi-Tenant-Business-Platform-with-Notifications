import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data-fetching hook with loading/error state.
 * @param {Function} apiFn - API service function (must return a promise)
 * @param {Array} deps - Dependencies to trigger refetch
 * @param {Object} options - { immediate: bool, initialData: any }
 */
export default function useApi(apiFn, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      const resolved = Array.isArray(result) ? result : result?.content || result?.data || result;
      setData(resolved);
      return resolved;
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Request failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => execute(), [execute]);

  return { data, loading, error, execute, refresh, setData };
}

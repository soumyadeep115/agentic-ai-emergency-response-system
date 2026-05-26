import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePolling — generic polling hook with fallback data.
 *
 * @param {Function} fetchFn       Async function returning { data, error, source }
 * @param {*}        fallback      Initial / fallback data shown while loading or on error
 * @param {number}   intervalMs   Poll interval in ms (default 15 s)
 */
export function usePolling(fetchFn, fallback, intervalMs = 15_000) {
  const [data, setData] = useState(fallback);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('cached');
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  const poll = useCallback(async () => {
  try {
    const result = await fnRef.current();

    if (result !== null && result !== undefined) {
      setData(result);
      setSource(result.source ?? 'live');
      setError(null);
    } else {
      setError('No data');
      setSource('cached');
    }
  } catch (err) {
    setError(err.message);
    setSource('cached');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs]);

  return { data, error, source, loading, refetch: poll };
}

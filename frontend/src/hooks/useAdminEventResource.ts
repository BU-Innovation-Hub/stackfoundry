import { useCallback, useEffect, useState } from 'react';
import { eventErrorMessage, eventErrorStatus } from '../services/adminEventService';

/** Abort old requests and retain usable data during a recoverable refresh failure. */
export function useAdminEventResource<T>(fetcher: (signal: AbortSignal) => Promise<T>, version: number, fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetcher(controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(cause => {
      if (!controller.signal.aborted) {
        setError(eventErrorMessage(cause, fallback));
        if ([401, 403, 404].includes(eventErrorStatus(cause) || 0)) setData(null);
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [fetcher, version, retry, fallback]);
  return { data, loading, error, reload };
}

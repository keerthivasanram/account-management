import { useCallback, useEffect, useRef, useState } from 'react';

const messageFor = (err) =>
  err?.response?.data?.detail
  || (err?.message === 'Network Error' ? 'Could not reach the server.' : err?.message)
  || 'Request failed.';

/**
 * One request's lifecycle, kept separate per panel so a failure in one panel
 * leaves the others usable. `data` stays null on failure: callers must never
 * render a failed request as zero or as a healthy status.
 *
 *   const stats = useResource(() => api.employees.getMyDashboardStats().then((r) => r.data));
 *   stats.loading | stats.error | stats.data | stats.reload()
 *
 * Pass enabled=false to skip a request the user isn't allowed to make.
 */
export const useResource = (fetcher, deps = [], { enabled = true } = {}) => {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const id = ++seq.current;
    setState((s) => ({ ...s, error: null, loading: true }));
    try {
      const data = await fetcher();
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (err) {
      if (id === seq.current) setState({ data: null, error: messageFor(err), loading: false });
    }
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
};

export default useResource;

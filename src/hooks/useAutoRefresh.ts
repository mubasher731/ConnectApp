import { useEffect, useRef } from 'react';
import { liveData } from '../api/socket';

/**
 * Re-runs `refresh()` automatically whenever live data changes arrive from the
 * backend over the socket (new request, decision, session start/end, presence).
 * Throttled so a burst of events doesn't hammer the API.
 *
 * Safe to call even before the socket connects — the emitter is wired inside
 * socketService, so any data event that arrives triggers a refresh here.
 */
export function useAutoRefresh(refresh: () => void, enabled = true): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    return liveData.subscribe(() => {
      const now = Date.now();
      if (now - lastRun.current < 1000) return; // throttle to 1 call / second
      lastRun.current = now;
      refreshRef.current();
    });
  }, [enabled]);
}

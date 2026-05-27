import { useEffect, useRef } from 'react';

type PollingOptions = {
  intervalMs: number;
  enabled?: boolean;
};

export function usePolling(callback: () => void | Promise<void>, options: PollingOptions, deps: unknown[] = []) {
  const { intervalMs, enabled = true } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    if (!intervalMs || intervalMs <= 0) return;

    let cancelled = false;

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch {
        // Callback should handle errors locally.
      }
    };

    void tick();

    const id = window.setInterval(() => {
      if (cancelled) return;
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...deps]);
}

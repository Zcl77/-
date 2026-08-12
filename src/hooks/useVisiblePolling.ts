import { useEffect, useRef } from 'react';

export function pollingDelay(failureCount: number, intervalMs: number, maximumMs = 120_000) {
  return Math.min(maximumMs, intervalMs * 2 ** Math.max(0, failureCount));
}

export class LatestRequestGate {
  private version = 0;

  issue() {
    const issued = ++this.version;
    return () => issued === this.version;
  }

  invalidate() {
    this.version += 1;
  }
}

export interface PollingRuntime {
  isVisible: () => boolean;
  setTimer: (callback: () => void, delay: number) => unknown;
  clearTimer: (timer: unknown) => void;
  onVisibilityChange: (callback: () => void) => () => void;
}

export interface VisiblePoller {
  syncNow: () => void;
  stop: () => void;
}

function browserPollingRuntime(): PollingRuntime {
  return {
    isVisible: () => document.visibilityState === 'visible',
    setTimer: (callback, delay) => window.setTimeout(callback, delay),
    clearTimer: (timer) => window.clearTimeout(timer as number),
    onVisibilityChange: (callback) => {
      document.addEventListener('visibilitychange', callback);
      return () => document.removeEventListener('visibilitychange', callback);
    },
  };
}

export function startVisiblePolling(
  task: () => Promise<void>,
  intervalMs: number,
  runtime: PollingRuntime = browserPollingRuntime(),
): VisiblePoller {
  let stopped = false;
  let timer: unknown;
  let failures = 0;
  let running = false;
  let runAgain = false;

  const clearScheduled = () => {
    if (timer === undefined) return;
    runtime.clearTimer(timer);
    timer = undefined;
  };

  const schedule = (delay: number) => {
    if (stopped) return;
    clearScheduled();
    timer = runtime.setTimer(() => {
      timer = undefined;
      void tick();
    }, delay);
  };

  const tick = async () => {
    if (stopped) return;
    if (running) {
      runAgain = true;
      return;
    }
    if (!runtime.isVisible()) {
      schedule(intervalMs);
      return;
    }
    running = true;
    try {
      await task();
      failures = 0;
    } catch {
      failures += 1;
    } finally {
      running = false;
    }
    if (stopped) return;
    if (runAgain) {
      runAgain = false;
      void tick();
      return;
    }
    schedule(pollingDelay(failures, intervalMs));
  };

  const syncNow = () => {
    if (stopped || !runtime.isVisible()) return;
    clearScheduled();
    void tick();
  };

  const removeVisibilityListener = runtime.onVisibilityChange(() => {
    if (runtime.isVisible()) syncNow();
  });
  schedule(intervalMs);

  return {
    syncNow,
    stop: () => {
      if (stopped) return;
      stopped = true;
      runAgain = false;
      clearScheduled();
      removeVisibilityListener();
    },
  };
}

export function useVisiblePolling(task: () => Promise<void>, intervalMs: number, enabled = true) {
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) return undefined;
    const poller = startVisiblePolling(() => taskRef.current(), intervalMs);
    return poller.stop;
  }, [enabled, intervalMs]);
}

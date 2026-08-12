import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LatestRequestGate,
  PollingRuntime,
  pollingDelay,
  startVisiblePolling,
} from '../src/hooks/useVisiblePolling';

function pollingRuntime(initiallyVisible = true) {
  let visible = initiallyVisible;
  let visibilityListener = () => undefined;
  const runtime: PollingRuntime = {
    isVisible: () => visible,
    setTimer: (callback, delay) => setTimeout(callback, delay),
    clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
    onVisibilityChange: (callback) => {
      visibilityListener = callback;
      return () => {
        visibilityListener = () => undefined;
      };
    },
  };
  return {
    runtime,
    setVisible(next: boolean) {
      visible = next;
      visibilityListener();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('reliable polling primitives', () => {
  it('backs off repeated failures without exceeding the cap', () => {
    expect(pollingDelay(0, 20_000)).toBe(20_000);
    expect(pollingDelay(1, 20_000)).toBe(40_000);
    expect(pollingDelay(4, 20_000)).toBe(120_000);
  });

  it('prevents an older response from replacing newer data', () => {
    const gate = new LatestRequestGate();
    const firstMayApply = gate.issue();
    const secondMayApply = gate.issue();
    expect(firstMayApply()).toBe(false);
    expect(secondMayApply()).toBe(true);
    gate.invalidate();
    expect(secondMayApply()).toBe(false);
  });

  it('pauses while hidden and synchronizes immediately when visible again', async () => {
    vi.useFakeTimers();
    const page = pollingRuntime(false);
    const task = vi.fn().mockResolvedValue(undefined);
    const poller = startVisiblePolling(task, 1_000, page.runtime);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(task).not.toHaveBeenCalled();

    page.setVisible(true);
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it('backs off after failures and resets after recovery', async () => {
    vi.useFakeTimers();
    const page = pollingRuntime();
    const task = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const poller = startVisiblePolling(task, 1_000, page.runtime);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(task).toHaveBeenCalledTimes(3);
    poller.stop();
  });

  it('coalesces overlapping synchronization requests into one follow-up', async () => {
    vi.useFakeTimers();
    const page = pollingRuntime();
    let resolveFirst: (() => void) | undefined;
    const task = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const poller = startVisiblePolling(task, 1_000, page.runtime);

    poller.syncNow();
    poller.syncNow();
    poller.syncNow();
    expect(task).toHaveBeenCalledTimes(1);
    resolveFirst?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('stops timers and visibility work after unmount cleanup', async () => {
    vi.useFakeTimers();
    const page = pollingRuntime();
    const task = vi.fn().mockResolvedValue(undefined);
    const poller = startVisiblePolling(task, 1_000, page.runtime);

    poller.stop();
    page.setVisible(false);
    page.setVisible(true);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(task).not.toHaveBeenCalled();
  });
});

export type LocaleTransitionPhase = 'idle' | 'out' | 'in';

interface LocaleTransitionOptions<TLocale extends string> {
  prefersReducedMotion: () => boolean;
  commitLocale: (locale: TLocale) => void;
  setPhase: (phase: LocaleTransitionPhase) => void;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}

export const LOCALE_TRANSITION_TIMING = {
  swapDelay: 100,
  settleDelay: 110,
} as const;

export function createLocaleTransitionController<TLocale extends string>({
  prefersReducedMotion,
  commitLocale,
  setPhase,
  schedule = setTimeout,
  cancel = clearTimeout,
}: LocaleTransitionOptions<TLocale>) {
  let changing = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (callback: () => void, delay: number) => {
    const timer = schedule(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  };

  return {
    change(currentLocale: TLocale, nextLocale: TLocale) {
      if (changing || nextLocale === currentLocale) return false;
      if (prefersReducedMotion()) {
        commitLocale(nextLocale);
        return true;
      }

      changing = true;
      setPhase('out');
      later(() => {
        commitLocale(nextLocale);
        setPhase('in');
        later(() => {
          changing = false;
          setPhase('idle');
        }, LOCALE_TRANSITION_TIMING.settleDelay);
      }, LOCALE_TRANSITION_TIMING.swapDelay);
      return true;
    },
    isChanging: () => changing,
    dispose() {
      timers.forEach(cancel);
      timers.clear();
      changing = false;
    },
  };
}

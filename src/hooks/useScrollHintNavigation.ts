import { useLayoutEffect, useState, type RefObject } from 'react';
import type { RegisterPageNavigation } from '../lib/pageNavigation';
import { rafThrottle } from '../lib/rafThrottle';

interface ScrollHintNavigationOptions {
  animationsEnabled: boolean;
  isActive: boolean;
  registerNavigation: RegisterPageNavigation;
  viewportRef: RefObject<HTMLElement | null>;
  minStepPx?: number;
  viewportStepRatio?: number;
}

export function useScrollHintNavigation({
  animationsEnabled,
  isActive,
  registerNavigation,
  viewportRef,
  minStepPx = 96,
  viewportStepRatio = 0.72,
}: ScrollHintNavigationOptions): boolean {
  const [isScrollable, setIsScrollable] = useState(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScrollability = rafThrottle(() => {
      setIsScrollable(viewport.scrollHeight - viewport.clientHeight > 1);
    });

    updateScrollability();

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollability);

    resizeObserver?.observe(viewport);
    if (viewport.firstElementChild instanceof HTMLElement) {
      resizeObserver?.observe(viewport.firstElementChild);
    }

    window.addEventListener('resize', updateScrollability);
    return () => {
      updateScrollability.cancel();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollability);
    };
  }, [viewportRef]);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      showScrollHint: isScrollable,
      onDirection: (direction) => {
        if (direction !== 'up' && direction !== 'down') return false;

        const viewport = viewportRef.current;
        if (!viewport) return false;

        const scrollRange = viewport.scrollHeight - viewport.clientHeight;
        if (scrollRange <= 1) return false;

        const step = Math.max(minStepPx, viewport.clientHeight * viewportStepRatio);
        viewport.scrollBy({
          top: direction === 'down' ? step : -step,
          behavior: animationsEnabled ? 'smooth' : 'auto',
        });
        return true;
      },
    });

    return () => registerNavigation(null);
  }, [
    animationsEnabled,
    isActive,
    isScrollable,
    minStepPx,
    registerNavigation,
    viewportRef,
    viewportStepRatio,
  ]);

  return isScrollable;
}

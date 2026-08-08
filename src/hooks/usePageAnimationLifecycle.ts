import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import {
  addTimelineCallback,
  killTimeline,
  playTimelineAfterDelay,
  playTimelineAfterLayoutSettle,
  type TimelinePlaybackHandle,
} from '../lib/animations/shared';
import type { PerformanceDebugDetails } from '../lib/performanceDebug';

export type PageAnimationState = 'entering-page' | 'page-active' | 'exiting-page';

interface PageAnimationConfig {
  isActive: boolean;
  animationsEnabled: boolean;
  initialEntryDelaySeconds: number;
  pageState: PageAnimationState;
  containerRef: RefObject<HTMLElement | null>;
  createEntryTimeline: (
    container: Element,
    options?: { paused?: boolean },
  ) => gsap.core.Timeline;
  createExitTimeline: (container: Element) => gsap.core.Timeline;
  onEntryAnimationComplete?: () => void;
}

function beginPerformanceSpan(name: string, details?: PerformanceDebugDetails): string | null {
  if (typeof window === 'undefined') return null;
  return window.__portfolioPerf?.begin(name, details) ?? null;
}

function endPerformanceSpan(token: string | null, details?: PerformanceDebugDetails): void {
  if (typeof window === 'undefined') return;
  window.__portfolioPerf?.end(token, details);
}

export function usePageAnimationLifecycle({
  isActive,
  animationsEnabled,
  initialEntryDelaySeconds,
  pageState,
  containerRef,
  createEntryTimeline,
  createExitTimeline,
  onEntryAnimationComplete,
}: PageAnimationConfig): void {
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const entryPlaybackRef = useRef<TimelinePlaybackHandle | null>(null);
  const entryPerfTokenRef = useRef<string | null>(null);
  const exitPerfTokenRef = useRef<string | null>(null);
  const prevIsActive = useRef(isActive);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (!animationsEnabled) return;

    const shouldDelayDirectMountPlayback = pageState === 'page-active';
    entryPerfTokenRef.current = beginPerformanceSpan('page-animation-entry', {
      directMount: shouldDelayDirectMountPlayback,
      initialDelayMs: initialEntryDelaySeconds * 1000,
    });
    entryTlRef.current = addTimelineCallback(
      createEntryTimeline(containerRef.current, {
        paused: initialEntryDelaySeconds > 0 || shouldDelayDirectMountPlayback,
      }),
      () => {
        endPerformanceSpan(entryPerfTokenRef.current);
        entryPerfTokenRef.current = null;
        onEntryAnimationComplete?.();
      },
    );

    if (initialEntryDelaySeconds > 0) {
      entryPlaybackRef.current = playTimelineAfterDelay(
        entryTlRef.current,
        initialEntryDelaySeconds,
      );
    } else if (shouldDelayDirectMountPlayback) {
      entryPlaybackRef.current = playTimelineAfterLayoutSettle(entryTlRef.current);
    }

    return () => {
      endPerformanceSpan(entryPerfTokenRef.current, { interrupted: true });
      entryPerfTokenRef.current = null;
      entryPlaybackRef.current?.cancel();
      entryPlaybackRef.current = null;
      entryTlRef.current = killTimeline(entryTlRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (!wasActive || isActive || !containerRef.current || !animationsEnabled) return;

    exitTlRef.current = killTimeline(exitTlRef.current);
    endPerformanceSpan(exitPerfTokenRef.current, { interrupted: true });
    exitPerfTokenRef.current = beginPerformanceSpan('page-animation-exit');
    exitTlRef.current = addTimelineCallback(
      createExitTimeline(containerRef.current),
      () => {
        endPerformanceSpan(exitPerfTokenRef.current);
        exitPerfTokenRef.current = null;
      },
    );
  }, [animationsEnabled, containerRef, createExitTimeline, isActive]);

  useEffect(() => {
    return () => {
      endPerformanceSpan(exitPerfTokenRef.current, { interrupted: true });
      exitPerfTokenRef.current = null;
      exitTlRef.current = killTimeline(exitTlRef.current);
    };
  }, []);
}

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import {
  addTimelineCallback,
  killTimeline,
  playTimelineAfterDelay,
  playTimelineAfterLayoutSettle,
  type TimelinePlaybackHandle,
} from '../lib/animations/shared';

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
  const prevIsActive = useRef(isActive);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (!animationsEnabled) return;

    const shouldDelayDirectMountPlayback = pageState === 'page-active';
    entryTlRef.current = addTimelineCallback(
      createEntryTimeline(containerRef.current, {
        paused: initialEntryDelaySeconds > 0 || shouldDelayDirectMountPlayback,
      }),
      onEntryAnimationComplete,
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
    exitTlRef.current = createExitTimeline(containerRef.current);
  }, [animationsEnabled, containerRef, createExitTimeline, isActive]);

  useEffect(() => {
    return () => {
      exitTlRef.current = killTimeline(exitTlRef.current);
    };
  }, []);
}

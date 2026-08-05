import gsap from 'gsap';

export interface TimelinePlaybackHandle {
  cancel: () => void;
}

export function toDefinedTargets(targets: gsap.TweenTarget): Element[] {
  return gsap.utils.toArray(targets).filter((target): target is Element => target instanceof Element);
}

export function getOptionalElement<TElement extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string,
): TElement | null {
  const element = parent.querySelector(selector);
  return element instanceof Element ? element as TElement : null;
}

export function getRequiredElement<TElement extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string,
): TElement {
  const element = getOptionalElement<TElement>(parent, selector);
  if (!element) {
    throw new Error(`Missing animation target: ${selector}`);
  }

  return element;
}

export function killTimeline<TTimeline extends gsap.core.Timeline | null | undefined>(
  timeline: TTimeline,
): null {
  timeline?.kill();
  return null;
}

export function addTimelineCallback(
  timeline: gsap.core.Timeline,
  callback?: () => void,
): gsap.core.Timeline {
  if (callback) {
    timeline.add(callback);
  }

  return timeline;
}

export function setTemporaryWillChange(
  targets: gsap.TweenTarget,
  value = 'transform, opacity',
): () => void {
  const elements = toDefinedTargets(targets);

  if (!elements.length) return () => {};

  gsap.set(elements, { willChange: value });
  return () => {
    gsap.set(elements, { willChange: 'auto' });
  };
}

export function playTimelineAfterDelay(
  timeline: gsap.core.Timeline,
  delaySeconds: number,
): TimelinePlaybackHandle {
  if (delaySeconds <= 0) {
    timeline.play(0);
    return { cancel: () => {} };
  }

  const delayedCall = gsap.delayedCall(delaySeconds, () => {
    timeline.play(0);
  });

  return {
    cancel: () => delayedCall.kill(),
  };
}

export function playTimelineAfterLayoutSettle(
  timeline: gsap.core.Timeline,
): TimelinePlaybackHandle {
  let rafId: number | null = requestAnimationFrame(() => {
    rafId = requestAnimationFrame(() => {
      rafId = null;
      timeline.play(0);
    });
  });

  return {
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

export function snapTimelineIfReducedMotion(
  timeline: gsap.core.Timeline,
  reducedMotion: boolean,
): gsap.core.Timeline {
  if (reducedMotion) {
    timeline.progress(1).pause();
  }

  return timeline;
}

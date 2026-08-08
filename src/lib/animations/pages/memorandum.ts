import gsap from 'gsap';

import { toDefinedTargets } from '../shared';

function withWillChange(targets: gsap.TweenTarget): gsap.TweenTarget[] {
  return toDefinedTargets(targets);
}

function clearMemorandumBrowserProps(
  watermark: Element | null,
  prompt: Element | null,
  controls: Element | null,
  listShell: Element | null,
  rightPanel: Element | null,
  shelfMotion: Element | null,
  collection: Element | null,
  bookSpines: Element | null,
  bgLines: Element | null,
  trapezoids: Element | null,
  wipeLine: Element | null,
) {
  gsap.set([watermark, prompt, controls, listShell, rightPanel, shelfMotion, collection, bookSpines, bgLines, trapezoids], {
    clearProps: 'x,y,scale,opacity,willChange',
  });
  gsap.set(wipeLine, {
    clearProps: 'x,y,scaleX,scaleY,opacity,willChange',
    autoAlpha: 0,
  });
}

export function createMemorandumEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const watermark = container.querySelector('[data-memorandum-watermark]');
  const prompt = container.querySelector('[data-memorandum-prompt]');
  const controls = container.querySelector('[data-memorandum-tab-controls]');
  const shelfMotion = container.querySelector('[data-memorandum-shelf-motion]');
  const collection = container.querySelector('[data-memorandum-collection]');
  const listShell = container.querySelector('[data-memorandum-list-shell]');
  const rightPanel = container.querySelector('[data-memorandum-right-panel]');
  const bookSpines = container.querySelector('[data-memorandum-book-spines]');
  const bgLines = container.querySelector('[data-memorandum-background-lines]');
  const trapezoids = container.querySelector('[data-memorandum-trapezoids]');
  const wipeLine = container.querySelector('[data-memorandum-wipe-line]');
  const shelfOffset = Math.min(window.innerWidth * 0.025, 32);

  const animated = withWillChange([
    watermark,
    prompt,
    controls,
    shelfMotion,
    collection,
    listShell,
    rightPanel,
    bookSpines,
    bgLines,
    trapezoids,
    wipeLine,
  ]);
  const wipeTarget = wipeLine instanceof HTMLElement
    ? wipeLine.getBoundingClientRect()
    : { top: 0, left: 0, height: 3, width: window.innerWidth };
  const wipeScaleY = Math.max(1, window.innerHeight * 0.25 / Math.max(wipeTarget.height, 1));

  gsap.set(wipeLine, {
    autoAlpha: 1,
    y: -wipeTarget.top,
    scaleY: wipeScaleY,
    transformOrigin: 'top center',
  });
  gsap.set([watermark, bgLines, listShell, prompt, controls, collection, rightPanel], {
    opacity: 0,
    scale: 1.06,
    transformOrigin: '50% 50%',
  });
  gsap.set(shelfMotion, {
    opacity: 0,
    x: shelfOffset,
  });
  gsap.set(trapezoids, {
    opacity: 0,
    scale: 1.08,
    transformOrigin: '50% 50%',
  });

  const tl = gsap.timeline({
    paused: options?.paused ?? false,
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      clearMemorandumBrowserProps(
        watermark,
        prompt,
        controls,
        listShell,
        rightPanel,
        shelfMotion,
        collection,
        bookSpines,
        bgLines,
        trapezoids,
        wipeLine,
      );
    },
    onInterrupt: () => {
      clearMemorandumBrowserProps(
        watermark,
        prompt,
        controls,
        listShell,
        rightPanel,
        shelfMotion,
        collection,
        bookSpines,
        bgLines,
        trapezoids,
        wipeLine,
      );
    },
  });

  tl.to(wipeLine, {
      y: 0,
      scaleY: 1,
      duration: 0.44,
      ease: 'power2.inOut',
    }, 0)
    .to(wipeLine, {
      opacity: 0,
      duration: 0.16,
      ease: 'power1.out',
    }, 0.28)
    .to([watermark, bgLines, listShell, prompt, controls, collection, rightPanel], {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0,
    }, 0.1)
    .to(shelfMotion, {
      opacity: 1,
      x: 0,
      duration: 0.34,
      ease: 'power3.out',
    }, 0.18)
    .to(trapezoids, {
      opacity: 1,
      scale: 1,
      duration: 0.34,
      ease: 'power2.out',
    }, 0.16)
    .set(wipeLine, { autoAlpha: 0 }, 0.44);

  return tl;
}

export function setMemorandumBrowserEnteredState(container: Element): void {
  const watermark = container.querySelector('[data-memorandum-watermark]');
  const prompt = container.querySelector('[data-memorandum-prompt]');
  const controls = container.querySelector('[data-memorandum-tab-controls]');
  const shelfMotion = container.querySelector('[data-memorandum-shelf-motion]');
  const collection = container.querySelector('[data-memorandum-collection]');
  const listShell = container.querySelector('[data-memorandum-list-shell]');
  const rightPanel = container.querySelector('[data-memorandum-right-panel]');
  const bookSpines = container.querySelector('[data-memorandum-book-spines]');
  const bgLines = container.querySelector('[data-memorandum-background-lines]');
  const trapezoids = container.querySelector('[data-memorandum-trapezoids]');
  const wipeLine = container.querySelector('[data-memorandum-wipe-line]');

  clearMemorandumBrowserProps(
    watermark,
    prompt,
    controls,
    listShell,
    rightPanel,
    shelfMotion,
    collection,
    bookSpines,
    bgLines,
    trapezoids,
    wipeLine,
  );
}

export function createMemorandumExitTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-memorandum-watermark]');
  const watermarkLine = container.querySelector('[data-memorandum-watermark-line]');
  const prompt = container.querySelector('[data-memorandum-prompt]');
  const controls = container.querySelector('[data-memorandum-tab-controls]');
  const shelfMotion = container.querySelector('[data-memorandum-shelf-motion]');
  const collection = container.querySelector('[data-memorandum-collection]');
  const listShell = container.querySelector('[data-memorandum-list-shell]');
  const rightPanel = container.querySelector('[data-memorandum-right-panel]');
  const bookSpines = container.querySelector('[data-memorandum-book-spines]');
  const bgLines = container.querySelector('[data-memorandum-background-lines]');
  const trapezoids = container.querySelector('[data-memorandum-trapezoids]');
  const shelfOffset = Math.min(window.innerWidth * 0.025, 32);

  const animated = withWillChange([
    watermark,
    watermarkLine,
    prompt,
    controls,
    shelfMotion,
    collection,
    listShell,
    rightPanel,
    bookSpines,
    bgLines,
    trapezoids,
  ]);

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'x,y,opacity,willChange' });
    },
  });

  tl.to([prompt, controls, listShell], {
      x: -window.innerWidth * 0.05,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      stagger: 0,
    }, 0)
    .to(shelfMotion, {
      x: shelfOffset,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    .to(watermark, {
      y: -window.innerHeight * 0.05,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    .to(watermarkLine, {
      y: -window.innerHeight * 0.05,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    .to([rightPanel, bgLines, trapezoids], {
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
      stagger: 0,
    }, 0.02);

  return tl;
}

export function createMemorandumBrowserReEntryTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-memorandum-watermark]');
  const watermarkLine = container.querySelector('[data-memorandum-watermark-line]');
  const prompt = container.querySelector('[data-memorandum-prompt]');
  const controls = container.querySelector('[data-memorandum-tab-controls]');
  const shelfMotion = container.querySelector('[data-memorandum-shelf-motion]');
  const collection = container.querySelector('[data-memorandum-collection]');
  const listShell = container.querySelector('[data-memorandum-list-shell]');
  const rightPanel = container.querySelector('[data-memorandum-right-panel]');
  const bookSpines = container.querySelector('[data-memorandum-book-spines]');
  const bgLines = container.querySelector('[data-memorandum-background-lines]');
  const trapezoids = container.querySelector('[data-memorandum-trapezoids]');
  const shelfOffset = Math.min(window.innerWidth * 0.025, 32);

  const animated = withWillChange([
    watermark,
    watermarkLine,
    prompt,
    controls,
    shelfMotion,
    collection,
    listShell,
    rightPanel,
    bookSpines,
    bgLines,
    trapezoids,
  ]);

  gsap.set([prompt, controls, listShell], {
    x: -window.innerWidth * 0.05,
    opacity: 0,
  });
  gsap.set(rightPanel, {
    opacity: 0,
  });
  gsap.set(shelfMotion, {
    x: shelfOffset,
    opacity: 0,
  });
  gsap.set(watermark, {
    y: -window.innerHeight * 0.05,
    opacity: 0,
  });
  gsap.set(watermarkLine, {
    y: -window.innerHeight * 0.05,
    opacity: 0,
  });
  gsap.set([bgLines, trapezoids], {
    opacity: 0,
  });

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'x,y,willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'x,y,opacity,willChange' });
    },
  });

  tl.to([prompt, controls, listShell], {
      x: 0,
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out',
      stagger: 0,
    }, 0)
    .to(rightPanel, {
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out',
    }, 0)
    .to(shelfMotion, {
      x: 0,
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out',
    }, 0)
    .to(watermark, {
      y: 0,
      opacity: 0.78,
      duration: 0.22,
      ease: 'power2.out',
    }, 0)
    .to(watermarkLine, {
      y: 0,
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out',
    }, 0)
    .to([bgLines, trapezoids], {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out',
      stagger: 0,
    }, 0.02);

  return tl;
}

export function createMemorandumDetailEnterTimeline(container: Element): gsap.core.Timeline {
  const detailShell = container.querySelector('[data-memorandum-detail-shell]');
  const detailPanel = container.querySelector('[data-memorandum-detail-panel]');
  const leftPanel = container.querySelector('[data-memorandum-detail-left]');
  const rightPanel = container.querySelector('[data-memorandum-detail-right]');

  const animated = withWillChange([detailShell, detailPanel, leftPanel, rightPanel]);

  gsap.set(detailShell, {
    opacity: 1,
  });
  gsap.set(detailPanel, {
    opacity: 1,
  });
  gsap.set(leftPanel, {
    x: window.innerWidth * 0.04,
    opacity: 0,
  });
  gsap.set(rightPanel, {
    x: -window.innerWidth * 0.04,
    opacity: 0,
  });

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
  });

  tl.to(leftPanel, {
      x: 0,
      opacity: 1,
      duration: 0.26,
      ease: 'power3.out',
    }, 0)
    .to(rightPanel, {
      x: 0,
      opacity: 1,
      duration: 0.26,
      ease: 'power3.out',
    }, 0);

  return tl;
}

export function createMemorandumDetailExitTimeline(container: Element): gsap.core.Timeline {
  const detailShell = container.querySelector('[data-memorandum-detail-shell]');
  const detailPanel = container.querySelector('[data-memorandum-detail-panel]');
  const leftPanel = container.querySelector('[data-memorandum-detail-left]');
  const rightPanel = container.querySelector('[data-memorandum-detail-right]');

  const animated = withWillChange([detailShell, detailPanel, leftPanel, rightPanel]);
  const slidingPanels = withWillChange([leftPanel, rightPanel]);

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(slidingPanels, { clearProps: 'x,willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(slidingPanels, { clearProps: 'x,willChange' });
    },
  });

  tl.to(leftPanel, {
      x: window.innerWidth * 0.04,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
    }, 0)
    .to(rightPanel, {
      x: -window.innerWidth * 0.04,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
    }, 0)
    .to([detailPanel, detailShell], {
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
      stagger: 0,
    }, 0.04);

  return tl;
}

export type MemorandumDetailPageTurnDirection = 'backward' | 'forward';

export function createMemorandumDetailContentExitTimeline(
  container: Element,
  direction: MemorandumDetailPageTurnDirection,
): gsap.core.Timeline {
  const body = container.querySelector('[data-memorandum-detail-body-motion]');
  const image = container.querySelector('[data-memorandum-detail-image-motion]');
  const animated = withWillChange([body, image]);
  const distance = Math.max(window.innerWidth * 0.015, 18);
  const outgoingX = direction === 'forward' ? -distance : distance;

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
  });

  gsap.set(body, {
    x: 0,
    opacity: 1,
  });
  gsap.set(image, {
    x: 0,
    opacity: 1,
  });

  tl.to(body, {
      x: outgoingX,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
    }, 0)
    .to(image, {
      x: outgoingX * 0.3,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
    }, 0);

  return tl;
}

export function createMemorandumDetailContentEnterTimeline(
  container: Element,
  direction: MemorandumDetailPageTurnDirection,
): gsap.core.Timeline {
  const body = container.querySelector('[data-memorandum-detail-body-motion]');
  const image = container.querySelector('[data-memorandum-detail-image-motion]');
  const animated = withWillChange([body, image]);
  const distance = Math.max(window.innerWidth * 0.018, 20);
  const incomingX = direction === 'forward' ? distance : -distance;

  gsap.set(body, {
    x: incomingX,
    opacity: 0,
  });
  gsap.set(image, {
    x: incomingX * 0.3,
    opacity: 0,
  });

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'x,opacity,willChange' });
    },
  });

  tl.to(body, {
      x: 0,
      opacity: 1,
      duration: 0.18,
      ease: 'power2.out',
    }, 0);
  tl.to(image, {
    x: 0,
    opacity: 1,
    duration: 0.18,
    ease: 'power2.out',
  }, 0.02);

  return tl;
}

export function createMemorandumCategoryTimeline(
  background: Element | null,
  whiteLabel: Element | null,
  darkLabel: Element | null,
): gsap.core.Timeline {
  const animated = withWillChange([background, whiteLabel, darkLabel]);

  gsap.set(background, {
    scaleY: 0.58,
    opacity: 1,
    transformOrigin: '50% 100%',
  });
  gsap.set(whiteLabel, {
    opacity: 1,
  });
  gsap.set(darkLabel, {
    opacity: 0,
  });

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(background, { clearProps: 'scaleY,willChange' });
      gsap.set([whiteLabel, darkLabel], { clearProps: 'willChange' });
    },
    onInterrupt: () => {
      gsap.set(background, { clearProps: 'scaleY,willChange' });
      gsap.set([whiteLabel, darkLabel], { clearProps: 'willChange' });
    },
  });

  tl.to(background, {
      scaleY: 1,
      duration: 0.18,
      ease: 'power2.out',
    }, 0)
    .to(whiteLabel, {
      opacity: 0,
      duration: 0.14,
      ease: 'power1.out',
    }, 0)
    .to(darkLabel, {
      opacity: 1,
      duration: 0.16,
      ease: 'power1.out',
    }, 0.02);

  return tl;
}

export interface TrapData {
  left: string;
  top: string;
  w: string;
  h: string;
  rot: number;
  dir: number;
  color: string;
}

export interface MemorandumTrapData {
  left: string;
  width: string;
  height: string;
  rotation: number;
  driftVw: number;
  duration: number;
  delay: number;
  opacity: number;
}

// Rotation only - physics x/y is handled separately in the component
export function createMemorandumRotationTimelines(
  trapEls: (HTMLDivElement | null)[],
  trapData: TrapData[],
  containerWidth: number,
  containerHeight: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  trapEls.forEach((el, i) => {
    if (!el || i >= trapData.length) return;
    const t = trapData[i];
    const cx = (parseFloat(t.left) / 100) * containerWidth;
    const cy = (parseFloat(t.top)  / 100) * containerHeight;
    gsap.set(el, { xPercent: -50, yPercent: -50, x: cx, y: cy, rotation: t.rot });
    const tween = gsap.to(el, {
      rotation: t.rot + 360 * t.dir,
      duration: 13 + i * 1.4,
      ease: 'none',
      repeat: -1,
      paused: true,
    });
    tween.seek(Math.random() * tween.duration());
    timelines.push(tween);
  });

  return timelines;
}

export function createMemorandumTrapezoidTimelines(
  trapEls: (HTMLDivElement | null)[],
  trapData: MemorandumTrapData[],
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  trapEls.forEach((el, i) => {
    if (!el || i >= trapData.length) return;
    const trap = trapData[i];

    gsap.set(el, {
      x: 0,
      y: '18vh',
      rotation: trap.rotation - 8,
      opacity: 0,
    });

    const tl = gsap.timeline({ repeat: -1, delay: trap.delay, paused: true });
    tl.to(el, {
      opacity: trap.opacity,
      duration: 0.7,
      ease: 'power1.out',
    }, 0)
      .to(el, {
        y: '-128vh',
        x: `${trap.driftVw}vw`,
        rotation: trap.rotation + 10,
        duration: trap.duration,
        ease: 'none',
      }, 0)
      .to(el, {
        opacity: 0,
        duration: 0.8,
        ease: 'power1.in',
      }, Math.max(trap.duration - 0.8, 0.1))
      .set(el, {
        x: 0,
        y: '18vh',
        rotation: trap.rotation - 8,
        opacity: 0,
      })
      .to(el, { duration: 0.18 });

    tl.seek((0.3 + Math.random() * 0.4) * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

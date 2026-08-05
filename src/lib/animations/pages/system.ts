import gsap from 'gsap';

import { toDefinedTargets } from '../shared';

function withWillChange(targets: gsap.TweenTarget): gsap.TweenTarget[] {
  return toDefinedTargets(targets);
}

export function createSystemEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const watermark = container.querySelector('[data-system-watermark]');
  const background = container.querySelector('[data-system-background]');
  const portrait = container.querySelector('[data-system-portrait]');
  const panel = container.querySelector('[data-system-panel]');
  const wipeLine = container.querySelector('[data-system-wipe]');

  const animated = withWillChange([watermark, background, portrait, panel, wipeLine]);
  const lineW = window.innerWidth * 0.16;

  gsap.set(wipeLine, {
    x: lineW,
    scaleX: 1.32,
    autoAlpha: 1,
    transformOrigin: '50% 50%',
  });
  gsap.set([watermark, background], {
    opacity: 0,
  });
  gsap.set(portrait, {
    opacity: 0,
    scale: 1.1,
    transformOrigin: '50% 100%',
  });
  gsap.set(panel, {
    opacity: 0,
    x: window.innerWidth * 0.08,
  });

  const tl = gsap.timeline({
    paused: options?.paused ?? false,
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(watermark, { clearProps: 'willChange' });
      gsap.set(background, { clearProps: 'willChange' });
      gsap.set(portrait, { clearProps: 'scale,willChange' });
      gsap.set(panel, { clearProps: 'x,willChange' });
      gsap.set(wipeLine, { clearProps: 'x,scaleX,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
    },
    onInterrupt: () => {
      gsap.set(watermark, { clearProps: 'willChange' });
      gsap.set(background, { clearProps: 'willChange' });
      gsap.set(portrait, { clearProps: 'scale,willChange' });
      gsap.set(panel, { clearProps: 'x,willChange' });
      gsap.set(wipeLine, { clearProps: 'x,scaleX,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
    },
  });

  tl.to(wipeLine, {
    x: -window.innerWidth - lineW,
    duration: 0.35,
    ease: 'power1.inOut',
  }, 0)
    .to(wipeLine, {
      scaleX: 1,
      duration: 0.35,
      ease: 'power1.out',
    }, 0)
    .to([watermark, background], {
      opacity: 1,
      duration: 0.24,
      ease: 'power2.out',
      stagger: 0,
    }, 0.08)
    .to(portrait, {
      opacity: 1,
      scale: 1,
      duration: 0.42,
      ease: 'power3.out',
    }, 0.12)
    .to(panel, {
      opacity: 1,
      x: 0,
      duration: 0.32,
      ease: 'power3.out',
    }, 0.16)
    .set(wipeLine, { autoAlpha: 0 }, 0.35);

  return tl;
}

export function createSystemExitTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-system-watermark]');
  const background = container.querySelector('[data-system-background]');
  const portrait = container.querySelector('[data-system-portrait]');
  const panel = container.querySelector('[data-system-panel]');
  const glitch = container.querySelector('[data-system-glitch]');

  const animated = withWillChange([watermark, background, portrait, panel, glitch]);

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(panel, { clearProps: 'x' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(panel, { clearProps: 'x' });
    },
  });

  tl.to(panel, {
    x: -window.innerWidth * 0.08,
    opacity: 0,
    duration: 0.16,
    ease: 'power2.in',
  }, 0)
    .to([watermark, background, portrait, glitch], {
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
      stagger: 0,
    }, 0);

  return tl;
}

export function setSystemEnteredState(container: Element): void {
  const watermark = container.querySelector('[data-system-watermark]');
  const background = container.querySelector('[data-system-background]');
  const portrait = container.querySelector('[data-system-portrait]');
  const panel = container.querySelector('[data-system-panel]');
  const wipeLine = container.querySelector('[data-system-wipe]');

  gsap.set([watermark, background], { opacity: 1, clearProps: 'willChange' });
  gsap.set(portrait, { opacity: 1, scale: 1, clearProps: 'willChange' });
  gsap.set(panel, { x: 0, opacity: 1, clearProps: 'willChange' });
  gsap.set(wipeLine, { autoAlpha: 0, clearProps: 'x,scaleX,willChange' });
}


const GLITCH_BASE_BAR_H_VH = 2;

export function createSystemGlitchTimelines(
  barEls: (HTMLDivElement | null)[],
  scanEl: HTMLDivElement | null,
  getContainerHeight: () => number,
  vh: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];
  const baseBarH = GLITCH_BASE_BAR_H_VH * vh;

  barEls.forEach((bar, i) => {
    if (!bar) return;
    let cycle = Math.floor(Math.random() * 5);

    const applyBarPlacement = () => {
      const containerH = getContainerHeight();
      const pct = cycle === 0
        ? 10 + i * 11
        : 8 + ((i * 23 + cycle * 37) % 76);
      const heightVh = cycle === 0
        ? 0.5
        : 0.25 + ((i + cycle * 2) % 5) * 0.25;

      gsap.set(bar, {
        y: (pct / 100) * containerH,
        scaleY: (heightVh * vh) / baseBarH,
      });
    };

    gsap.set(bar, {
      opacity: 0,
      transformOrigin: 'top center',
    });
    applyBarPlacement();

    const tl = gsap.timeline({
      repeat: -1,
      delay: i * 0.38,
      paused: true,
      onRepeat() {
        cycle++;
        applyBarPlacement();
      },
    });

    tl.to(bar, { opacity: 0.75, duration: 0.04 })
      .to(bar, { opacity: 0.08, duration: 0.09 })
      .to(bar, { opacity: 0.6,  duration: 0.04 })
      .to(bar, { opacity: 0.15, duration: 0.05 })
      .to(bar, { opacity: 0,    duration: 0.06 })
      .to(bar, { duration: 1.8 + i * 0.28 });

    tl.progress(0.35 + Math.random() * 0.5);
    timelines.push(tl);
  });

  if (scanEl) {
    const scanTween = gsap.to(scanEl, {
      y: '1100%', duration: 2.8, ease: 'none', repeat: -1, paused: true,
    });
    scanTween.progress(0.35 + Math.random() * 0.5);
    timelines.push(scanTween);
  }

  return timelines;
}

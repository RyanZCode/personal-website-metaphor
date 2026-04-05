import gsap from 'gsap';

export function setEntryInitialStates(container: Element): void {
  gsap.set(container.querySelector('[data-portrait-wrap]'), { y: '25vh', opacity: 0 });
  gsap.set(container.querySelector('[data-bg-layers]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-geometric-overlays]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-char]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-menu-item-wrap]'), { x: 0, y: 0 });
  gsap.set(container.querySelector('[data-menu-index]'), { y: '-1.5vh', opacity: 0 });
  gsap.set(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0 });
  gsap.set(container.querySelector('[data-stats-hints]'), { x: '3vw', opacity: 0 });
}

export function createEntryTimeline(
  container: Element,
  onComplete: () => void,
  onSubtitleVisible: () => void,
): gsap.core.Timeline {
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const bgLayers = container.querySelector('[data-bg-layers]');
  const geoOverlays = Array.from(container.querySelectorAll('[data-geometric-overlays]'));
  const menuItemEls = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];
  const firstSubtitle = container.querySelector('[data-subtitle]');
  const menuIndex = container.querySelector('[data-menu-index]');
  const paintSplash = container.querySelector('[data-paint-splash-wrap]');
  const statsHints = container.querySelector('[data-stats-hints]');

  type CharEntry = { char: HTMLElement; withinItemIdx: number; itemIdx: number };
  const charEntries: CharEntry[] = [];
  menuItemEls.forEach((itemEl, itemIdx) => {
    const chars = Array.from(itemEl.querySelectorAll('[data-char]')) as HTMLElement[];
    [...chars].sort(() => Math.random() - 0.5).forEach((char, j) => {
      charEntries.push({ char, withinItemIdx: j, itemIdx });
    });
  });

  // Displace every char to the shared screen origin NOW, before any tl.to() calls.
  // GSAP captures FROM values at tween-creation time, so the displaced values must
  // already be in GSAP's cache when the tweens are added below.
  // Chars live inside rotate/rotateY/scale transforms, so a local (lx, ly) does not
  // map 1:1 to screen pixels. Probe one char per item with test displacements to
  // measure the actual 2x2 local->screen matrix, then invert it.
  const originX = window.innerWidth  * 1.05;
  const originY = window.innerHeight * 0.82;

  menuItemEls.forEach((_, i) => {
    const items = charEntries.filter(e => e.itemIdx === i);
    if (!items.length) return;

    const probe = items[0].char;
    const r0 = probe.getBoundingClientRect();

    gsap.set(probe, { x: 100 });
    const r1 = probe.getBoundingClientRect();

    gsap.set(probe, { x: 0, y: 100 });
    const r2 = probe.getBoundingClientRect();

    gsap.set(probe, { x: 0, y: 0 });

    const a = (r1.left - r0.left) / 100;
    const b = (r2.left - r0.left) / 100;
    const c = (r1.top  - r0.top)  / 100;
    const d = (r2.top  - r0.top)  / 100;
    const det = a * d - b * c;

    items.forEach(({ char }) => {
      const rect = char.getBoundingClientRect();
      const sdx = originX - (rect.left + rect.width  / 2);
      const sdy = originY - (rect.top  + rect.height / 2);
      gsap.set(char, {
        x: ( d * sdx - b * sdy) / det,
        y: (-c * sdx + a * sdy) / det,
      });
    });
  });

  const snapAll = () => {
    charEntries.forEach(({ char }) => gsap.set(char, { x: 0, y: 0, opacity: 1 }));
  };

  const tl = gsap.timeline({ onComplete, onInterrupt: snapAll });

  const flyXDuration = 0.45;
  const flyYDuration = 0.55;
  const firstCharStart = 0.4;
  const itemStagger  = 0.035;
  const charStagger  = 0.028;

  // Chars fly in one by one: each item starts itemStagger later than the previous,
  // each char within an item starts charStagger later than the previous (shuffled order).
  // x uses power3.out (fast dart from origin, decelerates), y uses power2.inOut (gentle arc).
  // Opacity snaps in at the moment each char starts moving so you see the full arc path.
  charEntries.forEach(({ char: charEl, withinItemIdx: j, itemIdx: i }) => {
    const start = firstCharStart + i * itemStagger + j * charStagger;
    tl.to(charEl, { x: 0, duration: flyXDuration, ease: 'power3.out'   }, start);
    tl.to(charEl, { y: 0, duration: flyYDuration, ease: 'power2.inOut' }, start);
    tl.to(charEl, { opacity: 1, duration: 0.1, ease: 'none' }, start);
  });

  tl.to(portraitWrap,              { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0)
    .to([bgLayers, ...geoOverlays], { opacity: 1, duration: 0.6 }, 0.35)
    .to(firstSubtitle,             { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.75)
    .call(onSubtitleVisible,       [], 0.95)
    .to(menuIndex,                 { y: 0, opacity: 1, duration: 0.1, ease: 'power2.out' }, 0.45)
    .to(paintSplash,               { opacity: 1, duration: 0.25 }, 0.45)
    .to(statsHints,                { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.7);

  return tl;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// triData columns: [leftVh, top, w, h, maxOpacity, delay, duration, clipIdx]
export function createAboutTrianglesTimelines(
  triEls: (HTMLDivElement | null)[],
  triData: Array<[number, string, number, number, number, number, number, number]>,
  travelPx: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  triEls.forEach((el, i) => {
    if (!el || i >= triData.length) return;
    const [, , , , maxOpacity, delay, duration] = triData[i];

    gsap.set(el, { opacity: 0, x: 0, rotation: -45, transformOrigin: 'center center' });
    const tl = gsap.timeline({ repeat: -1, delay, paused: true });
    tl.to(el, { x: travelPx, duration, ease: 'none' })
      .to(el, { opacity: maxOpacity, duration: 0.35, ease: 'power2.out' }, 0)
      .to(el, { opacity: 0, duration: 0.5, ease: 'power1.in' }, duration - 0.5)
      .set(el, { x: 0 });

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

// ringData columns: [sizeVh, startXVh, startYVh, endXVh, endYVh, delayS, opacity]
export function createContactRingsTimelines(
  ringEls: (HTMLDivElement | null)[],
  ringData: Array<[number, number, number, number, number, number, number]>,
  vh: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  ringEls.forEach((el, i) => {
    if (!el || i >= ringData.length) return;
    const [, sx, sy, ex, ey, delay, opacity] = ringData[i];
    const pxSX = sx * vh, pxSY = sy * vh, pxEX = ex * vh, pxEY = ey * vh;

    gsap.set(el, { x: pxSX, y: pxSY, opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, delay, paused: true });
    tl.to(el, { opacity, duration: 0.8, ease: 'power2.out' })
      .to(el, { x: pxEX, y: pxEY, duration: 6.0, ease: 'power1.inOut' }, 0)
      .to(el, { opacity: 0, duration: 1.0, ease: 'power1.in' }, '-=1.0')
      .set(el, { x: pxSX, y: pxSY })
      .to(el, { duration: 5.0 });

    tl.seek(((i + Math.random()) / ringData.length) * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

export interface RippleSlot {
  left: string;
  top: string;
  delay: number;
  inward: boolean;
}

export function createExperienceRipplesTimelines(
  dotEls: (HTMLDivElement | null)[],
  ringEls: (HTMLDivElement | null)[],
  slots: RippleSlot[],
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  slots.forEach((slot, i) => {
    const dot = dotEls[i];
    const ring = ringEls[i];
    if (!dot || !ring) return;

    const tl = gsap.timeline({ repeat: -1, delay: slot.delay, paused: true });

    if (slot.inward) {
      gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 4.5, opacity: 0 });
      gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 10,  opacity: 0 });

      tl.to(ring, { scale: 0, duration: 1.8, ease: 'power1.in' })
        .to(ring, { opacity: 0.35, duration: 0.4, ease: 'power1.out' }, 0)
        .to(ring, { opacity: 0,   duration: 0.6, ease: 'power1.in'  }, 1.2)
        .to(dot,  { scale: 0, duration: 1.6, ease: 'power1.in' }, 0.1)
        .to(dot,  { opacity: 0.35, duration: 0.3, ease: 'power1.out' }, 0.1)
        .to(dot,  { opacity: 0,    duration: 0.5, ease: 'power1.in'  }, 1.1)
        .to(dot,  { duration: 4.0 });
    } else {
      gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
      gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

      // Expand directly from scale 0 - no intermediate scale:1 step, so no spawn-wait stutter
      tl.to(ring, { scale: 10,  duration: 2.4, ease: 'power1.out' })
        .to(ring, { opacity: 0.32, duration: 0.3, ease: 'power2.out' }, 0)
        .to(ring, { opacity: 0,   duration: 0.7, ease: 'power1.in'  }, 1.7)
        .to(dot,  { scale: 5,  duration: 2.2, ease: 'power1.out' }, 0)
        .to(dot,  { opacity: 0.38, duration: 0.25, ease: 'power2.out' }, 0)
        .to(dot,  { opacity: 0,    duration: 0.6,  ease: 'power1.in'  }, 1.6)
        .to(dot,  { duration: 2.5 });
    }

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
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

// bandData columns: [widthVh, delayS]
export function createSkillsBandsTimelines(
  bandEls: (HTMLDivElement | null)[],
  bandData: Array<[number, number]>,
  containerWidth: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];
  const endX = containerWidth * 0.65;

  bandEls.forEach((el, i) => {
    if (!el || i >= bandData.length) return;
    gsap.set(el, { x: 0, rotation: -38, transformOrigin: 'center center', opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, delay: bandData[i][1], paused: true });
    tl.to(el, { opacity: 1, duration: 0.4, ease: 'power1.in' })
      .to(el, { x: endX, duration: 3.6, ease: 'expo.in' }, 0)
      .set(el, { x: 0, opacity: 0 })
      .to(el, { duration: 0.2 });

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

// Base height for glitch bars in vh. Bars use scaleY to reach the desired height
// so that animations stay on the compositor (no height/top layout properties).
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
    let cycle = 0;

    // Initial position matches the original top: ${10 + i * 11}% layout
    const initialY = ((10 + i * 11) / 100) * getContainerHeight();
    gsap.set(bar, {
      opacity: 0,
      y: initialY,
      scaleY: 0.5 / GLITCH_BASE_BAR_H_VH,
      transformOrigin: 'top center',
    });

    const tl = gsap.timeline({
      repeat: -1,
      delay: i * 0.38,
      paused: true,
      onRepeat() {
        cycle++;
        const containerH = getContainerHeight();
        const pct      = 8 + ((i * 23 + cycle * 37) % 76);
        const heightVh = 0.25 + ((i + cycle * 2) % 5) * 0.25;
        gsap.set(bar, {
          y:      (pct / 100) * containerH,
          scaleY: (heightVh * vh) / baseBarH,
        });
      },
    });

    tl.to(bar, { opacity: 0.75, duration: 0.04 })
      .to(bar, { opacity: 0.08, duration: 0.09 })
      .to(bar, { opacity: 0.6,  duration: 0.04 })
      .to(bar, { opacity: 0.15, duration: 0.05 })
      .to(bar, { opacity: 0,    duration: 0.06 })
      .to(bar, { duration: 1.8 + i * 0.28 });

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  if (scanEl) {
    const scanTween = gsap.to(scanEl, {
      y: '1100%', duration: 2.8, ease: 'none', repeat: -1, paused: true,
    });
    scanTween.seek(Math.random() * scanTween.duration());
    timelines.push(scanTween);
  }

  return timelines;
}

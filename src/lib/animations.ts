import gsap from 'gsap';

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

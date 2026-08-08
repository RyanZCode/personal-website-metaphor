import gsap from 'gsap';

import { toDefinedTargets } from '../shared';

function withWillChange(targets: gsap.TweenTarget): gsap.TweenTarget[] {
  return toDefinedTargets(targets);
}

export function createContactEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const geoLines = container.querySelector('[data-contact-geo-lines]');
  const watermark = container.querySelector('[data-contact-watermark]');
  const content = container.querySelector('[data-contact-content]');
  const portrait = container.querySelector('[data-contact-portrait]');
  const rings = container.querySelector('[data-contact-rings]');
  const divider = container.querySelector('[data-contact-divider-line]');
  const wipeLine = container.querySelector('[data-contact-wipe]') as HTMLElement | null;

  const animated = withWillChange([geoLines, watermark, content, portrait, rings, divider, wipeLine]);
  const wipeWidth = wipeLine?.getBoundingClientRect().width ?? 8;
  const wipeStartScaleX = (window.innerWidth * 0.7) / wipeWidth;

  gsap.set([geoLines, watermark, content, portrait, rings], {
    opacity: 0,
    scale: 1.08,
    transformOrigin: '50% 50%',
  });
  gsap.set(divider, { opacity: 0 });
  gsap.set(wipeLine, {
    autoAlpha: 1,
    opacity: 0.95,
    scaleX: wipeStartScaleX,
    scaleY: 1,
    rotation: 7,
    transformOrigin: '50% 50%',
  });

  const tl = gsap.timeline({
    paused: options?.paused ?? false,
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(geoLines, { clearProps: 'willChange' });
      gsap.set([watermark, content, portrait, rings], { clearProps: 'scale,willChange' });
      gsap.set(divider, { clearProps: 'willChange' });
      gsap.set(wipeLine, { clearProps: 'scaleX,scaleY,rotation,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
    },
    onInterrupt: () => {
      gsap.set(geoLines, { clearProps: 'willChange' });
      gsap.set([watermark, content, portrait, rings], { clearProps: 'scale,willChange' });
      gsap.set(divider, { clearProps: 'willChange' });
      gsap.set(wipeLine, { clearProps: 'scaleX,scaleY,rotation,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
    },
  });

  tl.to([geoLines, watermark, content, portrait], {
      opacity: 1,
      scale: 1,
      duration: 0.42,
      ease: 'power3.out',
      stagger: 0,
    }, 0)
    .to(rings, {
      opacity: 0.9,
      scale: 1,
      duration: 0.46,
      ease: 'power3.out',
    }, 0.06)
    .to(divider, {
      opacity: 1,
      duration: 0.16,
      ease: 'power2.out',
    }, 0.16)
    .to(wipeLine, {
      scaleX: 1,
      rotation: 0,
      duration: 0.34,
      ease: 'power2.out',
    }, 0.02)
    .to(wipeLine, {
      opacity: 0.3,
      duration: 0.08,
      ease: 'power1.out',
    }, 0.28)
    .set(wipeLine, { autoAlpha: 0 }, 0.36);

  return tl;
}

export function createContactExitTimeline(container: Element): gsap.core.Timeline {
  const geoLines = container.querySelector('[data-contact-geo-lines]');
  const watermark = container.querySelector('[data-contact-watermark]');
  const content = container.querySelector('[data-contact-content]');
  const portrait = container.querySelector('[data-contact-portrait]');
  const rings = container.querySelector('[data-contact-rings]');
  const divider = container.querySelector('[data-contact-divider-line]');
  const portraitCircle = container.querySelector('[data-contact-portrait-circle]');
  const rotatingRing = container.querySelector('[data-contact-rotating-ring]');

  const animated = withWillChange([geoLines, watermark, content, portrait, rings, divider, portraitCircle, rotatingRing]);

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(portraitCircle, { clearProps: 'scale' });
      gsap.set(rotatingRing, { clearProps: 'scale' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'willChange' });
      gsap.set(portraitCircle, { clearProps: 'scale' });
      gsap.set(rotatingRing, { clearProps: 'scale' });
    },
  });

  tl.to([geoLines, watermark, content, portrait, rings, divider], {
    opacity: 0,
    duration: 0.18,
    ease: 'power2.in',
    stagger: 0,
  }, 0)
    .to(portraitCircle, {
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
    }, 0);
  tl.to(rotatingRing, {
    scale: 0.9,
    opacity: 0,
    duration: 0.18,
    ease: 'power2.in',
  }, 0);

  return tl;
}

export function setContactEnteredState(container: Element): void {
  const geoLines = container.querySelector('[data-contact-geo-lines]');
  const watermark = container.querySelector('[data-contact-watermark]');
  const content = container.querySelector('[data-contact-content]');
  const portrait = container.querySelector('[data-contact-portrait]');
  const rings = container.querySelector('[data-contact-rings]');
  const divider = container.querySelector('[data-contact-divider-line]');
  const portraitCircle = container.querySelector('[data-contact-portrait-circle]');
  const rotatingRing = container.querySelector('[data-contact-rotating-ring]');
  const wipeLine = container.querySelector('[data-contact-wipe]');

  gsap.set([geoLines, watermark, content, portrait], {
    opacity: 1,
    scale: 1,
    clearProps: 'willChange',
  });
  gsap.set(rings, { opacity: 0.9, scale: 1, clearProps: 'willChange' });
  gsap.set(divider, { opacity: 1, clearProps: 'willChange' });
  gsap.set([portraitCircle, rotatingRing], { opacity: 1, scale: 1, clearProps: 'willChange' });
  gsap.set(wipeLine, { autoAlpha: 0, clearProps: 'scaleX,scaleY,rotation,willChange' });
}

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

import gsap from 'gsap';

import { toDefinedTargets } from '../shared';

function withWillChange(targets: gsap.TweenTarget): gsap.TweenTarget[] {
  return toDefinedTargets(targets);
}

function getExperiencePanelAngle(container: Element): number {
  const leftTop = Number(container.getAttribute('data-experience-left-top')) || 65;
  const leftBottom = Number(container.getAttribute('data-experience-left-bottom')) || 35;
  const dx = (leftTop - leftBottom) * window.innerWidth / 100;
  const dy = window.innerHeight;
  return Math.atan2(dx, dy) * 180 / Math.PI;
}

function getExperienceWipeEndX(container: Element, wipeWidth: number): number {
  const isCompact = container.getAttribute('data-experience-compact') === 'true';

  if (!isCompact) {
    return window.innerWidth * 0.47 - wipeWidth / 2;
  }

  return -window.innerWidth * 0.1 - wipeWidth / 2;
}

export function createExperienceEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const portrait = container.querySelector('[data-experience-portrait]');
  const watermark = container.querySelector('[data-experience-watermark]');
  const panelGroup = container.querySelector('[data-experience-panel-group]');
  const geoLines = container.querySelector('[data-experience-geo-lines]');
  const wipeLine = container.querySelector('[data-experience-wipe]') as HTMLElement | null;
  const wipeLineInner = container.querySelector('[data-experience-wipe-line]');
  const rippleGroup = container.querySelector('[data-experience-ripples]');
  const rippleFade = container.querySelector('[data-experience-ripples-fade]');

  const isCompact = container.getAttribute('data-experience-compact') === 'true';
  const shouldShowRipples = !isCompact;
  const animated = withWillChange([portrait, watermark, panelGroup, geoLines, wipeLine, wipeLineInner, rippleFade]);
  const angle = getExperiencePanelAngle(container);
  const wipeStartX = window.innerWidth * 0.94;
  const wipeWidth = wipeLine?.getBoundingClientRect().width ?? 0;
  const wipeEndX = getExperienceWipeEndX(container, wipeWidth);
  const wipeMoveDuration = isCompact ? 0.26 : 0.24;
  const wipeCollapseStart = isCompact ? 0.16 : 0.10;
  const wipeCollapseDuration = isCompact ? 0.12 : 0.18;
  const wipeHideAt = wipeCollapseStart + wipeCollapseDuration;

  gsap.set(wipeLine, {
    autoAlpha: 1,
    x: wipeStartX,
    y: -window.innerHeight * 0.08,
    rotation: angle,
    transformOrigin: '50% 50%',
  });
  gsap.set(wipeLineInner, {
    scaleX: 2.25,
    scaleY: 0.92,
    transformOrigin: '50% 50%',
  });
  gsap.set(watermark, { opacity: 0, scale: 1.1, transformOrigin: '50% 50%' });
  gsap.set(portrait, {
    opacity: 0,
    scale: 1.5,
    x: window.innerWidth * 0.08,
    transformOrigin: '50% 50%',
  });
  gsap.set(panelGroup, {
    opacity: 0,
    x: window.innerWidth * 0.09,
    y: -window.innerHeight * 0.08,
  });
  if (geoLines) {
    gsap.set(geoLines, { opacity: 0 });
  }
  if (rippleFade) {
    gsap.set(rippleFade, {
      opacity: 0,
    });
  }

  const tl = gsap.timeline({
    paused: options?.paused ?? false,
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(watermark, { clearProps: 'scale,willChange' });
      gsap.set(portrait, { clearProps: 'x,scale,willChange' });
      gsap.set(panelGroup, { clearProps: 'x,y,willChange' });
      gsap.set(geoLines, { clearProps: 'opacity,willChange' });
      gsap.set(rippleFade, { clearProps: 'opacity,willChange' });
      gsap.set(wipeLineInner, { clearProps: 'scaleX,scaleY,willChange' });
      gsap.set(wipeLine, { clearProps: 'x,y,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
      container.dispatchEvent(new CustomEvent('experience-entry-complete'));
    },
    onInterrupt: () => {
      gsap.set(watermark, { clearProps: 'scale,willChange' });
      gsap.set(portrait, { clearProps: 'x,scale,willChange' });
      gsap.set(panelGroup, { clearProps: 'x,y,willChange' });
      gsap.set(geoLines, { clearProps: 'opacity,willChange' });
      gsap.set(rippleFade, { clearProps: 'opacity,willChange' });
      gsap.set(wipeLineInner, { clearProps: 'scaleX,scaleY,willChange' });
      gsap.set(wipeLine, { clearProps: 'x,y,willChange' });
      gsap.set(wipeLine, { autoAlpha: 0 });
    },
  });

    tl.to(watermark, {
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: 'power3.out',
  }, 0)
    .to(portrait, {
      opacity: 1,
      scale: 1,
      x: 0,
      duration: 0.45,
      ease: 'power3.out',
    }, 0.04)
    .to(wipeLine, {
      x: wipeEndX,
      duration: wipeMoveDuration,
      ease: 'none',
    }, 0.06)
    .to(wipeLineInner, {
      scaleX: 2.25,
      duration: 0.04,
      ease: 'none',
    }, 0.06)
    .to(wipeLineInner, {
      scaleX: 0.008,
      scaleY: 1.08,
      duration: wipeCollapseDuration,
      ease: 'none',
    }, wipeCollapseStart)
    .set(wipeLine, {
      autoAlpha: 0,
    }, wipeHideAt)
    .to(panelGroup, {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.36,
      ease: 'power3.out',
    }, 0.12)
  if (geoLines) {
    tl.to(geoLines, {
      opacity: 1,
      duration: 0.24,
      ease: 'power2.out',
    }, 0.14);
  }
  if (rippleFade) {
    tl.to(rippleFade, {
      opacity: shouldShowRipples ? 1 : 0,
      duration: 0.26,
      ease: 'power2.out',
    }, 0.18);
  }

  return tl;
}

export function createExperienceExitTimeline(container: Element): gsap.core.Timeline {
  const portrait = container.querySelector('[data-experience-portrait]');
  const watermark = container.querySelector('[data-experience-watermark]');
  const panelGroup = container.querySelector('[data-experience-panel-group]');
  const geoLines = container.querySelector('[data-experience-geo-lines]');
  const rippleFade = container.querySelector('[data-experience-ripples-fade]');
  const primaryGroup = toDefinedTargets([panelGroup, portrait, watermark]);

  const shouldShowRipples = container.getAttribute('data-experience-compact') !== 'true';
  const animated = withWillChange([portrait, watermark, panelGroup, geoLines, rippleFade]);

  const tl = gsap.timeline({
    onStart: () => {
      gsap.set(animated, { willChange: 'transform, opacity' });
    },
    onComplete: () => {
      gsap.set(animated, { clearProps: 'willChange' });
    },
    onInterrupt: () => {
      gsap.set(animated, { clearProps: 'willChange' });
    },
  });

  if (primaryGroup.length) {
    tl.to(primaryGroup, {
      x: -window.innerWidth * 0.12,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
      .to(primaryGroup, {
        x: `-=${window.innerWidth * 0.08}`,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
        stagger: 0,
      }, 0.18);
  }

  if (geoLines instanceof Element) {
    tl.to(geoLines, {
      x: -window.innerWidth * 0.12,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
      .to(geoLines, {
        x: `-=${window.innerWidth * 0.08}`,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      }, 0.18);
  }

  if (rippleFade instanceof Element) {
    tl.to(rippleFade, {
      opacity: shouldShowRipples ? 0 : 0,
      duration: 0.14,
      ease: 'power2.in',
    }, 0.18);
  }

  return tl;
}

export function setExperienceEnteredState(container: Element): void {
  const portrait = container.querySelector('[data-experience-portrait]');
  const watermark = container.querySelector('[data-experience-watermark]');
  const panelGroup = container.querySelector('[data-experience-panel-group]');
  const geoLines = container.querySelector('[data-experience-geo-lines]');
  const wipeLine = container.querySelector('[data-experience-wipe]');
  const wipeLineInner = container.querySelector('[data-experience-wipe-line]');
  const rippleFade = container.querySelector('[data-experience-ripples-fade]');

  const shouldShowRipples = container.getAttribute('data-experience-compact') !== 'true';
    gsap.set(watermark, { opacity: 1, scale: 1, clearProps: 'willChange' });
  gsap.set(portrait, { x: 0, opacity: 1, scale: 1, clearProps: 'willChange' });
  gsap.set(panelGroup, { x: 0, y: 0, opacity: 1, clearProps: 'willChange' });
  gsap.set(geoLines, { opacity: 1, clearProps: 'willChange' });
  gsap.set(rippleFade, { opacity: shouldShowRipples ? 1 : 0, clearProps: 'willChange' });
  gsap.set(wipeLineInner, { clearProps: 'scaleX,scaleY,willChange' });
  gsap.set(wipeLine, { autoAlpha: 0, clearProps: 'x,y,rotation,willChange' });
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
      // base: dot 300px, ring 500px - start near natural size so GPU doesn't stretch
      gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 0.9, opacity: 0 });
      gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 1.0, opacity: 0 });

      tl.to(ring, { scale: 0, duration: 1.8, ease: 'power1.in' })
        .to(ring, { opacity: 0.35, duration: 0.4, ease: 'power1.out' }, 0)
        .to(ring, { opacity: 0,   duration: 0.6, ease: 'power1.in'  }, 1.2)
        .to(dot,  { scale: 0, duration: 1.6, ease: 'power1.in' }, 0.1)
        .to(dot,  { opacity: 0.35, duration: 0.3, ease: 'power1.out' }, 0.1)
        .to(dot,  { opacity: 0,    duration: 0.5, ease: 'power1.in'  }, 1.1)
        .to(dot,  { duration: 4.0 });
    } else {
      // base: dot 300px, ring 500px - scale to 1.0 so display size matches rasterized size
      gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
      gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

      tl.to(ring, { scale: 1.0, duration: 2.4, ease: 'power1.out' })
        .to(ring, { opacity: 0.32, duration: 0.3, ease: 'power2.out' }, 0)
        .to(ring, { opacity: 0,   duration: 0.7, ease: 'power1.in'  }, 1.7)
        .to(dot,  { scale: 1.0, duration: 2.2, ease: 'power1.out' }, 0)
        .to(dot,  { opacity: 0.38, duration: 0.25, ease: 'power2.out' }, 0)
        .to(dot,  { opacity: 0,    duration: 0.6,  ease: 'power1.in'  }, 1.6)
        .to(dot,  { duration: 2.5 });
    }

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

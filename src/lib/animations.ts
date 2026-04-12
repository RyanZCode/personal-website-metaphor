import gsap from 'gsap';

type CharEntry = { char: HTMLElement; withinItemIdx: number; itemIdx: number };

// Collects all chars from menu items, shuffles them within each item,
// then displaces each char to a shared screen origin using the local transform matrix.
// Returns the char entries in animation order.
function collectAndDisplaceChars(
  menuItemEls: HTMLElement[],
  originX: number,
  originY: number,
): CharEntry[] {
  const charEntries: CharEntry[] = [];
  menuItemEls.forEach((itemEl, itemIdx) => {
    const chars = Array.from(itemEl.querySelectorAll('[data-char]')) as HTMLElement[];
    [...chars].sort(() => Math.random() - 0.5).forEach((char, j) => {
      charEntries.push({ char, withinItemIdx: j, itemIdx });
    });
  });

  // Probe each item's local->screen transform matrix, then invert to get the
  // local displacement needed to move each char to the shared screen origin.
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

  return charEntries;
}

function appendCharFlyTweens(
  tl: gsap.core.Timeline,
  charEntries: CharEntry[],
  flyXDur: number,
  flyYDur: number,
  firstStart: number,
  itemStagger: number,
  charStagger: number,
): void {
  charEntries.forEach(({ char, withinItemIdx: j, itemIdx: i }) => {
    const start = firstStart + i * itemStagger + j * charStagger;
    tl.to(char, { x: 0, duration: flyXDur, ease: 'power3.out'   }, start);
    tl.to(char, { y: 0, duration: flyYDur, ease: 'power2.inOut' }, start);
    tl.to(char, { opacity: 1, duration: 0.1, ease: 'none'       }, start);
  });
}

export function setEntryInitialStates(container: Element): void {
  gsap.set(container.querySelector('[data-portrait-wrap]'), { y: '25vh', opacity: 0 });
  gsap.set(container.querySelector('[data-bg-layers]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-geometric-overlays]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-char]'), { opacity: 0 });
  gsap.set(container.querySelectorAll('[data-menu-item-wrap]'), { x: 0, y: 0 });
  gsap.set(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
  gsap.set(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0 });
  gsap.set(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
  gsap.set(container.querySelector('[data-control-hints-fixed]'), { y: '1vh', opacity: 0 });
}

export function createEntryTimeline(
  container: Element,
  onComplete: () => void,
  onSubtitleVisible: () => void,
): gsap.core.Timeline {
  const portraitWrap    = container.querySelector('[data-portrait-wrap]');
  const bgLayers        = container.querySelector('[data-bg-layers]');
  const geoOverlays     = Array.from(container.querySelectorAll('[data-geometric-overlays]'));
  const menuItemEls     = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];
  const menuIndex       = container.querySelector('[data-menu-index]');
  const paintSplash     = container.querySelector('[data-paint-splash-wrap]');
  const statsHints      = container.querySelector('[data-stats-hints]');
  const controlHints    = container.querySelector('[data-control-hints-fixed]');

  const originX = window.innerWidth  * 1.05;
  const originY = window.innerHeight * 0.82;
  const charEntries = collectAndDisplaceChars(menuItemEls, originX, originY);

  const snapAll = () => {
    charEntries.forEach(({ char }) => gsap.set(char, { x: 0, y: 0, opacity: 1 }));
  };

  const tl = gsap.timeline({ onComplete, onInterrupt: snapAll });

  appendCharFlyTweens(tl, charEntries, 0.25, 0.35, 0.4, 0.035, 0.028);

  tl.to(portraitWrap,              { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0)
    .to([bgLayers, ...geoOverlays], { opacity: 1, duration: 0.6 }, 0.35)
    .call(onSubtitleVisible,       [], 0.45)
    .to(menuIndex,                 { y: 0, opacity: 1, duration: 0.1, ease: 'power2.out' }, 0.45)
    .to(paintSplash,               { opacity: 1, duration: 0.25 }, 0.45)
    .to(statsHints,                { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.45)
    .to(controlHints,              { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.35);

  return tl;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface CharExitEntry {
  char: HTMLElement;
  localX: number;
  localY: number;
  startTime: number;
}

// Mirror of collectAndDisplaceChars but for exit: probes each item's local->screen
// matrix, computes local offsets that send each char to a random off-screen-left
// target, shuffles and staggers them.
function computeCharExitPositions(menuItemEls: HTMLElement[]): CharExitEntry[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const entries: CharExitEntry[] = [];

  menuItemEls.forEach((itemEl) => {
    const chars = Array.from(itemEl.querySelectorAll('[data-char]')) as HTMLElement[];
    if (!chars.length) return;

    const probe = chars[0];
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

    chars.forEach((char) => {
      const rect = char.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const targetSX = -(vw * (0.30 + Math.random() * 0.12));
      const targetSY = cy + (Math.random() - 0.5) * vh * 0.06;
      const sdx = targetSX - cx;
      const sdy = targetSY - cy;
      entries.push({
        char,
        localX: ( d * sdx - b * sdy) / det,
        localY: (-c * sdx + a * sdy) / det,
        startTime: 0,
      });
    });
  });

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  shuffled.forEach((e, i) => { e.startTime = i * 0.007; });
  return shuffled;
}

// onMountPage fires mid-animation to trigger React rendering the page content.
// Delaying this is what makes the exit animation visible - otherwise the page
// appears in the first frame and covers everything.
export function createPageEnterTimeline(
  container: Element,
  onComplete: () => void,
  onSwitchToPageMode: () => void,
  onMountPage: () => void,
  onSubtitleHide: () => void,
): gsap.core.Timeline {
  const menuIndex    = container.querySelector('[data-menu-index]');
  const statsHints   = container.querySelector('[data-stats-hints]');
  const paintSplash  = container.querySelector('[data-paint-splash-wrap]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const menuItemEls = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];

  gsap.set(paintSplash, { clipPath: 'inset(0 0 0 0%)' });
  gsap.killTweensOf(portraitWrap);

  const charExits = computeCharExitPositions(menuItemEls);

  const FLY_DUR    = 0.55;
  const FADE_DELAY = 0.08;
  const FADE_DUR   = 0.20;
  const MOUNT_AT   = 0.42;
  const DONE_AT    = MOUNT_AT + 0.40;

  const tl = gsap.timeline();

  charExits.forEach(({ char, localX, localY, startTime }) => {
    tl.to(char, { x: localX, y: localY, duration: FLY_DUR, ease: 'power2.in' }, startTime);
    tl.to(char, { opacity: 0, duration: FADE_DUR, ease: 'power1.in'          }, startTime + FADE_DELAY);
  });

  tl.to([menuIndex, statsHints], { y: '1.5vh', opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.24)
    .call(onSubtitleHide, [], 0.20)
    .to(paintSplash,  { clipPath: 'inset(0 0 0 100%)', duration: 0.26, ease: 'power2.inOut' }, 0.20)
    .to(portraitWrap, { opacity: 0, duration: 0.22, ease: 'power2.in' }, 0.22)
    .to(controlHints, { y: '1vh', opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.20)
    .call(onSwitchToPageMode, [], 0.34)
    .to(controlHints, { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }, 0.36)
    .call(() => {
      onMountPage();
      // Double RAF so React has rendered the page shell before we touch it
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const shell = container.querySelector('[data-page-shell]');
        if (!shell) return;
        gsap.set(shell, { opacity: 1 });
      }));
    }, [], MOUNT_AT)
    .call(onComplete, [], DONE_AT);

  return tl;
}

// White vertical line sweeps left-to-right, content zooms out behind it.
// Called from useLayoutEffect in AboutPage so gsap.set runs before first paint.
export function createAboutEntryTimeline(container: Element): gsap.core.Timeline {
  const panel     = container.querySelector('[data-about-panel]');
  const portrait  = container.querySelector('[data-about-portrait-anim]');
  const watermark = container.querySelector('[data-about-watermark]');
  const geoLines  = container.querySelector('[data-about-geo-lines]');
  const triangles = container.querySelector('[data-about-triangles]');
  const wipeLine  = container.querySelector('[data-about-wipe]');

  const vw    = window.innerWidth;
  const lineW = vw * 0.16;

  gsap.set(wipeLine,  { x: -lineW, scaleX: 1.32, autoAlpha: 1, transformOrigin: '50% 50%' });
  // Watermark, geo lines, and panel zoom together - same scale, same origin, same start
  gsap.set([watermark, geoLines, panel], { scale: 1.06, opacity: 0, transformOrigin: 'center center' });
  // Triangles start hidden; revealed by opacity as the line passes over the bottom-right corner
  gsap.set(triangles, { opacity: 0 });
  // Portrait is a separate, more dramatic zoom anchored to the bottom
  gsap.set(portrait, { scale: 1.10, opacity: 0, transformOrigin: '50% 100%' });

  const WIPE_DUR = 0.35;
  const tl = gsap.timeline();

  // Wipe line sweeps across full width
  tl.to(wipeLine, { x: vw + lineW, duration: WIPE_DUR, ease: 'power1.inOut' }, 0);
  tl.to(wipeLine, { scaleX: 1, duration: WIPE_DUR, ease: 'power1.out' }, 0);
  // Content group zooms out together as the line passes the left half.
  // Watermark targets its natural 0.75 opacity; panel and geo lines target 1.
  tl.to([geoLines, panel], { scale: 1, opacity: 1,    duration: 0.40, ease: 'power2.out' }, 0.10);
  tl.to(watermark,         { scale: 1, opacity: 0.75, duration: 0.40, ease: 'power2.out' }, 0.10);
  // Triangles are in the bottom-right (~45% from left). Line left edge reaches them at ~0.25s.
  tl.to(triangles, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0.25);
  // Portrait: reveals just ahead of the wipe reaching the right half, anchored-bottom zoom
  tl.to(portrait, { scale: 1, opacity: 1, duration: 0.42, ease: 'power3.out' }, 0.24);
  tl.set(wipeLine, { autoAlpha: 0 }, WIPE_DUR);

  return tl;
}

// Fast re-entry: fades page out and flies chars in from the center of the Experience item.
export function createMenuReEntryTimeline(
  container: Element,
  onComplete: () => void,
  onSubtitleVisible: () => void,
  onSwitchToMenuMode: () => void,
): gsap.core.Timeline {
  const menuLeft     = container.querySelector('[data-menu-left]');
  const menuIndex    = container.querySelector('[data-menu-index]');
  const paintSplash  = container.querySelector('[data-paint-splash-wrap]');
  const statsHints   = container.querySelector('[data-stats-hints]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const pageShell = container.querySelector('[data-page-shell]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const menuItemEls  = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];

  // Reset menu-left to its natural x before measuring char positions.
  // Also kill any in-flight char tweens from the page-enter animation and reset
  // x/y so collectAndDisplaceChars gets accurate matrix measurements.
  gsap.set(menuLeft, { x: 0, opacity: 1 });
  const allCharsForReset = Array.from(container.querySelectorAll('[data-char]')) as HTMLElement[];
  gsap.killTweensOf(allCharsForReset);
  gsap.set(allCharsForReset, { x: 0, y: 0, opacity: 0 });
  gsap.set(paintSplash, { clipPath: 'inset(0 0 0 0%)', opacity: 0 });
  gsap.set(portraitWrap, { opacity: 0 });

  // Fly chars in from the center of the Experience item (index 2, the middle of the stack)
  const anchorEl = menuItemEls[2] ?? menuItemEls[Math.floor(menuItemEls.length / 2)];
  let originX: number;
  let originY: number;
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    originX = rect.left + rect.width  / 2;
    originY = rect.top  + rect.height / 2;
  } else {
    originX = window.innerWidth  * 0.25;
    originY = window.innerHeight * 0.5;
  }

  const charEntries = collectAndDisplaceChars(menuItemEls, originX, originY);

  const snapAll = () => {
    charEntries.forEach(({ char }) => gsap.set(char, { x: 0, y: 0, opacity: 1 }));
  };

  const FADE_DUR = 0.22;
  const REENTRY_START = FADE_DUR + 0.02;

  const tl = gsap.timeline({ onInterrupt: snapAll });

  // Fade the page content out
  if (pageShell) {
    tl.to(pageShell, { opacity: 0, duration: FADE_DUR, ease: 'power2.in' }, 0);
  }
  tl.to(controlHints, { y: '1vh', opacity: 0, duration: 0.12, ease: 'power2.in' }, 0);

  // Re-entry starts once the page is gone
  // Portrait fades in over the background
  tl.to(portraitWrap, { opacity: 1, duration: 0.8, ease: 'power2.out' }, REENTRY_START);

  // Chars burst out from the Experience item center
  // Last char finishes at roughly REENTRY_START + 5*0.02 + 9*0.016 + 0.18 ≈ REENTRY_START + 0.47
  appendCharFlyTweens(tl, charEntries, 0.14, 0.18, REENTRY_START, 0.02, 0.016);

  const CHROME_IN = REENTRY_START + 0.2;

  tl.call(onSwitchToMenuMode, [], REENTRY_START - 0.02)
    .to(controlHints,            { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }, CHROME_IN)
    .call(onSubtitleVisible, [], REENTRY_START + 0.12)
    .to([menuIndex, statsHints], { y: 0, x: 0, opacity: 1, duration: 0.15, ease: 'power2.out' }, CHROME_IN)
    .to(paintSplash, { opacity: 1, duration: 0.2 }, REENTRY_START + 0.12)
    .call(onComplete, [], CHROME_IN + 0.15);

  return tl;
}

// Top-to-bottom vertical wipe reveal for the Skills page.
// Elements with movement start slightly above their final position (negative y) and
// settle into place while fading in. Background lines and portrait just fade in.
export function createSkillsEntryTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-skills-watermark]');
  const geoLines  = container.querySelector('[data-skills-geo-lines]');
  const content   = container.querySelector('[data-skills-content]');
  const portrait  = container.querySelector('[data-skills-portrait]');
  const bands     = container.querySelector('[data-skills-bands]');
  const wipeLine  = container.querySelector('[data-skills-wipe]');

  const vh = window.innerHeight;
  const lineH = vh * 0.26;

  gsap.set(wipeLine,              { y: -lineH, autoAlpha: 1 });
  gsap.set(watermark,             { y: -18, opacity: 0 });
  gsap.set(content,               { y: -22, opacity: 0 });
  gsap.set([geoLines, portrait, bands], { opacity: 0 });

  const WIPE_DUR = 0.32;
  const tl = gsap.timeline();

  tl.to(wipeLine,  { y: vh + lineH, duration: WIPE_DUR, ease: 'power1.inOut' }, 0);
  tl.to(geoLines,  { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.22);
  tl.to(watermark, { y: 0, opacity: 0.75, duration: 0.38, ease: 'power2.out' }, 0.06);
  tl.to(portrait,  { opacity: 1, duration: 0.70, ease: 'power1.out' }, 0.05);
  tl.to(content,   { y: 0, opacity: 1, duration: 0.40, ease: 'power2.out' }, 0.12);
  tl.to(bands,     { opacity: 1, duration: 0.65, ease: 'power1.out' }, 0);
  tl.set(wipeLine, { autoAlpha: 0 }, WIPE_DUR);

  return tl;
}

// Exit: watermark and content drift downward while the parent shell fades them out.
// Opacity is intentionally not animated here - the shell fade handles it.
export function createSkillsExitTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-skills-watermark]');
  const content   = container.querySelector('[data-skills-content]');

  const tl = gsap.timeline();
  tl.to(watermark, { y: 48, duration: 0.22, ease: 'power2.in' }, 0);
  tl.to(content,   { y: 52, duration: 0.22, ease: 'power2.in' }, 0);
  return tl;
}

function withWillChange(targets: gsap.TweenTarget): gsap.TweenTarget[] {
  return gsap.utils.toArray(targets);
}

function getExperiencePanelAngle(): number {
  const dx = (65 - 35) * window.innerWidth / 100;
  const dy = window.innerHeight;
  return Math.atan2(dx, dy) * 180 / Math.PI;
}

export function createExperienceEntryTimeline(container: Element): gsap.core.Timeline {
  const portrait = container.querySelector('[data-experience-portrait]');
  const watermark = container.querySelector('[data-experience-watermark]');
  const panelGroup = container.querySelector('[data-experience-panel-group]');
  const geoLines = container.querySelector('[data-experience-geo-lines]');
  const wipeLine = container.querySelector('[data-experience-wipe]') as HTMLElement | null;
  const wipeLineInner = container.querySelector('[data-experience-wipe-line]');
  const rippleGroup = container.querySelector('[data-experience-ripples]');
  const rippleFade = container.querySelector('[data-experience-ripples-fade]');

  const animated = withWillChange([portrait, watermark, panelGroup, geoLines, wipeLine, wipeLineInner, rippleFade]);
  const angle = getExperiencePanelAngle();
  const wipeStartX = window.innerWidth * 0.94;
  const wipeWidth = wipeLine?.getBoundingClientRect().width ?? 0;
  const wipeEndX = window.innerWidth * 0.47 - wipeWidth / 2;

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
  gsap.set(geoLines, { opacity: 0 });
  gsap.set(rippleFade, {
    opacity: 0,
  });

  const tl = gsap.timeline({
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
    opacity: 0.75,
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
      duration: 0.24,
      ease: 'none',
    }, 0.06)
    .to(wipeLineInner, {
      scaleX: 2.25,
      duration: 0.04,
      ease: 'none',
    }, 0.06)
    .to(wipeLineInner, {
      scaleX: 0.02,
      scaleY: 1,
      duration: 0.18,
      ease: 'none',
    }, 0.10)
    .set(wipeLine, {
      autoAlpha: 0,
    }, 0.28)
    .to(panelGroup, {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.36,
      ease: 'power3.out',
    }, 0.12)
    .to(geoLines, {
      opacity: 1,
      duration: 0.24,
      ease: 'power2.out',
    }, 0.14)
    .to(rippleFade, {
      opacity: 1,
      duration: 0.26,
      ease: 'power2.out',
    }, 0.18);

  return tl;
}

export function createExperienceExitTimeline(container: Element): gsap.core.Timeline {
  const portrait = container.querySelector('[data-experience-portrait]');
  const watermark = container.querySelector('[data-experience-watermark]');
  const panelGroup = container.querySelector('[data-experience-panel-group]');
  const geoLines = container.querySelector('[data-experience-geo-lines]');
  const rippleFade = container.querySelector('[data-experience-ripples-fade]');

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

  tl.to([panelGroup, portrait, watermark], {
    x: -window.innerWidth * 0.12,
    duration: 0.2,
    ease: 'power2.in',
  }, 0)
    .to([panelGroup, portrait, watermark], {
      x: `-=${window.innerWidth * 0.08}`,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
      stagger: 0,
    }, 0.18)
    .to(geoLines, {
      x: -window.innerWidth * 0.12,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    .to(geoLines, {
      x: `-=${window.innerWidth * 0.08}`,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
    }, 0.18)
    .to(rippleFade, {
      opacity: 0,
      duration: 0.14,
      ease: 'power2.in',
    }, 0.18);

  return tl;
}

export function createContactEntryTimeline(container: Element): gsap.core.Timeline {
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

export function createMemorandumEntryTimeline(container: Element): gsap.core.Timeline {
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

export function createSystemEntryTimeline(container: Element): gsap.core.Timeline {
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

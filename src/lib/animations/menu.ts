import gsap from 'gsap';

type CharEntry = { char: HTMLElement; withinItemIdx: number; itemIdx: number };

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function toDefinedTargets(targets: gsap.TweenTarget): Element[] {
  return gsap.utils.toArray(targets).filter((target): target is Element => target instanceof Element);
}

function setIfPresent(targets: gsap.TweenTarget, vars: gsap.TweenVars): void {
  const elements = toDefinedTargets(targets);
  if (!elements.length) return;
  gsap.set(elements, vars);
}

export function createMenuLetterPulseTimeline(menuItemEls: HTMLElement[]): gsap.core.Timeline {
  const allChars = menuItemEls.flatMap((item) => (
    Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[]
  ));
  const reset = () => {
    gsap.set(allChars, { scaleX: 1, scaleY: 1, clearProps: 'willChange' });
  };
  const tl = gsap.timeline({ onInterrupt: reset });

  tl.set(allChars, { willChange: 'transform', transformOrigin: '50% 100%' }, 0);
  menuItemEls.forEach((item) => {
    const chars = Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[];
    chars.forEach((char, charIndex) => {
      const pulseScaleX = randomBetween(0.975, 0.995);
      const pulseScaleY = randomBetween(0.86, 0.97);
      const start = charIndex * 0.006 + randomBetween(0, 0.024);
      tl.to(char, {
        scaleX: pulseScaleX,
        scaleY: pulseScaleY,
        duration: 0.06,
        ease: 'power2.in',
      }, start).to(char, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.12,
        ease: 'power2.out',
      }, start + 0.06);
    });
  });
  tl.call(() => {
    gsap.set(allChars, { clearProps: 'willChange' });
  });

  return tl;
}

// Collects all chars from menu items, shuffles them within each item,
// then displaces each char to a shared screen origin using the local transform matrix.
// Returns the char entries in animation order.
function collectAndDisplaceChars(
  menuItemEls: HTMLElement[],
  originX: number,
  originY: number,
): CharEntry[] {
  const charEntries: CharEntry[] = [];
  const entriesByItem: CharEntry[][] = menuItemEls.map(() => []);
  menuItemEls.forEach((itemEl, itemIdx) => {
    const chars = Array.from(itemEl.querySelectorAll('[data-char]')) as HTMLElement[];
    [...chars].sort(() => Math.random() - 0.5).forEach((char, j) => {
      const entry = { char, withinItemIdx: j, itemIdx };
      charEntries.push(entry);
      entriesByItem[itemIdx].push(entry);
    });
  });

  // Probe each item's local->screen transform matrix, then invert to get the
  // local displacement needed to move each char to the shared screen origin.
  menuItemEls.forEach((_, i) => {
    const items = entriesByItem[i];
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
  const chars = charEntries.map(({ char }) => char);
  const getDelay = (index: number) => (
    firstStart +
    charEntries[index].itemIdx * itemStagger +
    charEntries[index].withinItemIdx * charStagger
  );

  tl.to(chars, {
    x: 0,
    duration: flyXDur,
    ease: 'power3.out',
    stagger: (index) => getDelay(index),
  }, 0);
  tl.to(chars, {
    y: 0,
    duration: flyYDur,
    ease: 'power2.inOut',
    stagger: (index) => getDelay(index),
  }, 0);
  tl.to(chars, {
    opacity: 1,
    duration: 0.1,
    ease: 'none',
    stagger: (index) => getDelay(index),
  }, 0);
}

export function setEntryInitialStates(container: Element): void {
  setIfPresent(container.querySelector('[data-portrait-wrap]'), { y: '25vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-bg-layers]'), { opacity: 0 });
  setIfPresent(container.querySelectorAll('[data-geometric-overlays]'), { opacity: 0 });
  setIfPresent(container.querySelectorAll('[data-char]'), { opacity: 0 });
  setIfPresent(container.querySelectorAll('[data-menu-item-wrap]'), { x: 0, y: 0 });
  setIfPresent(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0 });
  setIfPresent(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-control-hints-fixed]'), { y: '1vh', opacity: 0 });
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

export function prepareMenuReEntryInitialStates(container: Element): void {
  const menuLeft = container.querySelector('[data-menu-left]');
  const menuIndex = container.querySelector('[data-menu-index]');
  const paintSplash = container.querySelector('[data-paint-splash-wrap]');
  const statsHints = container.querySelector('[data-stats-hints]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const menuItemEls = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];
  const allChars = Array.from(container.querySelectorAll('[data-char]')) as HTMLElement[];

  gsap.set(menuLeft, { x: 0, opacity: 1 });
  gsap.killTweensOf(allChars);
  gsap.set(allChars, { x: 0, y: 0, opacity: 0 });
  gsap.set(menuIndex, { y: '1.5vh', opacity: 0 });
  gsap.set(paintSplash, { clipPath: 'inset(0 0 0 0%)', opacity: 0 });
  gsap.set(statsHints, { y: '1.5vh', opacity: 0 });
  gsap.set(controlHints, { y: '1vh', opacity: 0 });
  gsap.set(portraitWrap, { opacity: 0 });

  const anchorEl = menuItemEls[2] ?? menuItemEls[Math.floor(menuItemEls.length / 2)];
  let originX: number;
  let originY: number;
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  } else {
    originX = window.innerWidth * 0.25;
    originY = window.innerHeight * 0.5;
  }

  collectAndDisplaceChars(menuItemEls, originX, originY);
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
export const PAGE_ENTER_MOUNT_AT = 0.42;

interface PageEnterReadiness {
  promise: Promise<unknown>;
  isReady: () => boolean;
}

export function createPageEnterTimeline(
  container: Element,
  onComplete: () => void,
  onSwitchToPageMode: () => void,
  onMountPage: () => void,
  onSubtitleHide: () => void,
  onRevealPageShell: () => void,
  pageReadiness?: PageEnterReadiness,
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
  const MOUNT_AT   = PAGE_ENTER_MOUNT_AT;
  const DONE_AT    = MOUNT_AT + 0.40;
  const CONTROL_HINTS_OUT_AT = 0.20;
  const CONTROL_HINTS_OUT_DUR = 0.12;
  const CONTROL_HINTS_SWITCH_AT = CONTROL_HINTS_OUT_AT + CONTROL_HINTS_OUT_DUR;
  const CONTROL_HINTS_IN_AT = 0.36;

  let interrupted = false;
  const tl = gsap.timeline({
    onInterrupt: () => {
      interrupted = true;
    },
  });
  const chars = charExits.map(({ char }) => char);

  const mountAndRevealPage = () => {
    if (interrupted) return;
    onMountPage();
    onRevealPageShell();
  };

  tl.to(chars, {
    x: (index) => charExits[index].localX,
    y: (index) => charExits[index].localY,
    duration: FLY_DUR,
    ease: 'power2.in',
    stagger: (index) => charExits[index].startTime,
  }, 0);
  tl.to(chars, {
    opacity: 0,
    duration: FADE_DUR,
    ease: 'power1.in',
    stagger: (index) => charExits[index].startTime + FADE_DELAY,
  }, 0);

  tl.to([menuIndex, statsHints], { y: '1.5vh', opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.24)
    .call(onSubtitleHide, [], 0.20)
    .to(paintSplash,  { clipPath: 'inset(0 0 0 100%)', duration: 0.26, ease: 'power2.inOut' }, 0.20)
    .to(portraitWrap, { opacity: 0, duration: 0.22, ease: 'power2.in' }, 0.22)
    .to(controlHints, { y: '1vh', opacity: 0, duration: CONTROL_HINTS_OUT_DUR, ease: 'power2.in' }, CONTROL_HINTS_OUT_AT)
    .call(onSwitchToPageMode, [], CONTROL_HINTS_SWITCH_AT)
    .to(controlHints, { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }, CONTROL_HINTS_IN_AT)
    .call(() => {
      if (!pageReadiness || pageReadiness.isReady()) {
        mountAndRevealPage();
        return;
      }

      tl.pause();
      void pageReadiness.promise.then(
        () => {
          if (interrupted) return;
          mountAndRevealPage();
          tl.resume();
        },
        () => {
          if (interrupted) return;
          mountAndRevealPage();
          tl.resume();
        },
      );
    }, [], MOUNT_AT)
    .call(onComplete, [], DONE_AT);

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

  const PAGE_FADE_DUR = 0.3;
  const REENTRY_START = 0.08;
  const CONTROL_HINTS_OUT_DUR = 0.12;
  const CONTROL_HINTS_SWITCH_AT = CONTROL_HINTS_OUT_DUR;

  const tl = gsap.timeline({ onInterrupt: snapAll });

  if (pageShell) {
    tl.to(pageShell, { opacity: 0, duration: PAGE_FADE_DUR, ease: 'power2.inOut' }, 0);
  }
  tl.to(controlHints, { y: '1vh', opacity: 0, duration: CONTROL_HINTS_OUT_DUR, ease: 'power2.in' }, 0);

  // Re-entry starts once the page is gone
  // Portrait fades in over the background
  tl.to(portraitWrap, { opacity: 1, duration: 0.8, ease: 'power2.out' }, REENTRY_START);

  // Chars burst out from the Experience item center
  // Last char finishes at roughly REENTRY_START + 5*0.02 + 9*0.016 + 0.18.
  appendCharFlyTweens(tl, charEntries, 0.14, 0.18, REENTRY_START, 0.02, 0.016);

  const CHROME_IN = Math.max(REENTRY_START + 0.2, CONTROL_HINTS_SWITCH_AT + 0.02);

  tl.call(onSwitchToMenuMode, [], CONTROL_HINTS_SWITCH_AT)
    .to(controlHints,            { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }, CHROME_IN)
    .call(onSubtitleVisible, [], REENTRY_START + 0.12)
    .to([menuIndex, statsHints], { y: 0, x: 0, opacity: 1, duration: 0.15, ease: 'power2.out' }, CHROME_IN)
    .to(paintSplash, { opacity: 1, duration: 0.2 }, REENTRY_START + 0.08)
    .call(onComplete, [], CHROME_IN + 0.15);

  return tl;
}

// White vertical line sweeps left-to-right, content zooms out behind it.

import gsap from 'gsap';
import {
  getMenuCharacterGeometry,
  toLocalCharacterOffset,
  type CachedMenuCharacter,
  type MenuCharacterGeometry,
} from '../menuCharacterGeometry';

type CharEntry = {
  char: HTMLElement;
  character: CachedMenuCharacter;
  withinItemIdx: number;
  itemIdx: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const MENU_LETTER_PULSE_RATIO = 0.55;

function toDefinedTargets(targets: gsap.TweenTarget): Element[] {
  return gsap.utils.toArray(targets).filter((target): target is Element => target instanceof Element);
}

function setIfPresent(targets: gsap.TweenTarget, vars: gsap.TweenVars): void {
  const elements = toDefinedTargets(targets);
  if (!elements.length) return;
  gsap.set(elements, vars);
}

function resetSplashWipe(
  splashWrap: Element | null,
  splashContent: Element | null,
  opacity: number,
) {
  gsap.set(splashWrap, {
    opacity,
    xPercent: 0,
    clearProps: 'willChange',
    transformOrigin: 'right center',
  });
  gsap.set(splashContent, {
    xPercent: 0,
    clearProps: 'willChange',
    transformOrigin: 'right center',
  });
}

function appendSplashWipe(
  timeline: gsap.core.Timeline,
  splashWrap: Element | null,
  splashContent: Element | null,
  startTime: number,
) {
  if (!splashWrap || !splashContent) return;

  const wipe = { progress: 0 };
  const setWrapPosition = gsap.quickSetter(splashWrap, 'xPercent');
  const setContentPosition = gsap.quickSetter(splashContent, 'xPercent');
  timeline.to(wipe, {
    progress: 100,
    duration: 0.26,
    ease: 'power2.inOut',
    onStart: () => {
      gsap.set([splashWrap, splashContent], { willChange: 'transform' });
    },
    onUpdate: () => {
      setWrapPosition(wipe.progress);
      setContentPosition(-wipe.progress);
    },
    onComplete: () => {
      resetSplashWipe(splashWrap, splashContent, 0);
    },
  }, startTime);
}

export function createMenuLetterPulseTimeline(menuItemEls: HTMLElement[]): gsap.core.Timeline {
  const allChars = menuItemEls.flatMap((item) => (
    Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[]
  ));
  const pulseCharsByItem = menuItemEls.map((item) => {
    const chars = Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[];
    const pulseCount = Math.max(1, Math.round(chars.length * MENU_LETTER_PULSE_RATIO));
    return [...chars].sort(() => Math.random() - 0.5).slice(0, pulseCount);
  });
  const pulseChars = pulseCharsByItem.flat();
  const reset = () => {
    gsap.set(allChars, { scaleX: 1, scaleY: 1, clearProps: 'willChange' });
  };
  const tl = gsap.timeline({ onInterrupt: reset });

  tl.set(pulseChars, { willChange: 'transform', transformOrigin: '50% 100%' }, 0);
  pulseCharsByItem.forEach((chars) => {
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
    gsap.set(pulseChars, { clearProps: 'willChange' });
  });

  return tl;
}

function collectAndDisplaceChars(
  geometry: MenuCharacterGeometry,
  originX: number,
  originY: number,
): CharEntry[] {
  const charEntries = geometry.items.flatMap((item, itemIdx) => (
    [...item.chars]
      .sort(() => Math.random() - 0.5)
      .map((character, withinItemIdx) => ({
        char: character.char,
        character,
        withinItemIdx,
        itemIdx,
      }))
  ));
  const offsets = charEntries.map(({ character }) => (
    toLocalCharacterOffset(character, originX, originY)
  ));

  gsap.set(charEntries.map(({ char }) => char), {
    x: (index) => offsets[index].x,
    y: (index) => offsets[index].y,
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
  setIfPresent(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0, xPercent: 0 });
  setIfPresent(container.querySelector('[data-paint-splash-wipe-content]'), { xPercent: 0 });
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
  const menuIndex       = container.querySelector('[data-menu-index]');
  const paintSplash     = container.querySelector('[data-paint-splash-wrap]');
  const statsHints      = container.querySelector('[data-stats-hints]');
  const controlHints    = container.querySelector('[data-control-hints-fixed]');
  const geometry = getMenuCharacterGeometry(container);

  const originX = window.innerWidth  * 1.05;
  const originY = window.innerHeight * 0.82;
  const charEntries = collectAndDisplaceChars(geometry, originX, originY);

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
  const paintSplashContent = container.querySelector('[data-paint-splash-wipe-content]');
  const statsHints = container.querySelector('[data-stats-hints]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const allChars = Array.from(container.querySelectorAll('[data-char]')) as HTMLElement[];
  const geometry = getMenuCharacterGeometry(container);
  const anchorItem = geometry.items[2] ?? geometry.items[Math.floor(geometry.items.length / 2)];
  const originX = anchorItem?.centerX ?? window.innerWidth * 0.25;
  const originY = anchorItem?.centerY ?? window.innerHeight * 0.5;

  gsap.set(menuLeft, { x: 0, opacity: 1 });
  gsap.killTweensOf(allChars);
  gsap.set(allChars, { x: 0, y: 0, opacity: 0 });
  gsap.set(menuIndex, { y: '1.5vh', opacity: 0 });
  resetSplashWipe(paintSplash, paintSplashContent, 0);
  gsap.set(statsHints, { y: '1.5vh', opacity: 0 });
  gsap.set(controlHints, { y: '1vh', opacity: 0 });
  gsap.set(portraitWrap, { opacity: 0 });

  collectAndDisplaceChars(geometry, originX, originY);
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

function computeCharExitPositions(geometry: MenuCharacterGeometry): CharExitEntry[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const entries = geometry.chars.map((character): CharExitEntry => {
    const targetSX = -(vw * (0.30 + Math.random() * 0.12));
    const targetSY = character.centerY + (Math.random() - 0.5) * vh * 0.06;
    const localOffset = toLocalCharacterOffset(character, targetSX, targetSY);
    return {
      char: character.char,
      localX: localOffset.x,
      localY: localOffset.y,
      startTime: 0,
    };
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
  const paintSplashContent = container.querySelector('[data-paint-splash-wipe-content]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const geometry = getMenuCharacterGeometry(container);

  resetSplashWipe(paintSplash, paintSplashContent, 1);
  gsap.killTweensOf(portraitWrap);

  const charExits = computeCharExitPositions(geometry);

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
      resetSplashWipe(paintSplash, paintSplashContent, 1);
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
  appendSplashWipe(tl, paintSplash, paintSplashContent, 0.20);

  tl.to([menuIndex, statsHints], { y: '1.5vh', opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.24)
    .call(onSubtitleHide, [], 0.20)
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
  const paintSplashContent = container.querySelector('[data-paint-splash-wipe-content]');
  const statsHints   = container.querySelector('[data-stats-hints]');
  const controlHints = container.querySelector('[data-control-hints-fixed]');
  const pageShell = container.querySelector('[data-page-shell]');
  const portraitWrap = container.querySelector('[data-portrait-wrap]');
  const geometry = getMenuCharacterGeometry(container);
  const anchorItem = geometry.items[2] ?? geometry.items[Math.floor(geometry.items.length / 2)];
  const originX = anchorItem?.centerX ?? window.innerWidth * 0.25;
  const originY = anchorItem?.centerY ?? window.innerHeight * 0.5;

  // Reset menu elements before applying cached re-entry offsets.
  gsap.set(menuLeft, { x: 0, opacity: 1 });
  const allCharsForReset = Array.from(container.querySelectorAll('[data-char]')) as HTMLElement[];
  gsap.killTweensOf(allCharsForReset);
  gsap.set(allCharsForReset, { x: 0, y: 0, opacity: 0 });
  resetSplashWipe(paintSplash, paintSplashContent, 0);
  gsap.set(portraitWrap, { opacity: 0 });

  const charEntries = collectAndDisplaceChars(geometry, originX, originY);

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

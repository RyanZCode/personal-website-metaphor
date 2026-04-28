import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import {
  setEntryInitialStates,
  createEntryTimeline,
  createPageEnterTimeline,
  createMenuReEntryTimeline,
} from '../../lib/animations';
import BackgroundLayers from '../background/BackgroundLayers';
import CharacterPortrait from '../background/CharacterPortrait';
import BackgroundLines from '../background/BackgroundLines';
import MenuItem from './MenuItem';
import MenuIndex from './MenuIndex';
import MenuItemBackground from './MenuItemBackground';
import StatsPanel from './StatsPanel';
import ControlHints from '../shared/ControlHints';
import LoadingScreen from '../shared/LoadingScreen';
import UnsupportedScreen from '../shared/UnsupportedScreen';
import CustomCursor from '../shared/CustomCursor';
import { createAssetPreloadManifest, preloadImages } from '../../lib/assetPreload';
import { shouldReduceBootWork } from '../../lib/deviceProfile';
import { rafThrottle } from '../../lib/rafThrottle';
import type { PageNavigationDirection, PageNavigationHandler } from '../../lib/pageNavigation';
import {
  APP_PAGE_IDS,
  buildPagePath,
  getCurrentPathname,
  normalizePathname,
  pushPathname,
  replacePathname,
  resolveAppRoute,
  type AppPageId,
} from '../../lib/routes';
import { SOUND_EFFECT_SOURCES, type PlaySoundEffect, type SoundEffectId } from '../../lib/soundEffects';
import AboutPage from '../pages/AboutPage';
import SkillsPage from '../pages/SkillsPage';
import ExperiencePage from '../pages/ExperiencePage';
import ContactPage from '../pages/ContactPage';
import MemorandumPage from '../pages/MemorandumPage';
import SystemPage from '../pages/SystemPage';
import type { MemorandumData } from '../../lib/memorandum';

type AppState = 'preloading' | 'entry' | 'idle' | 'entering-page' | 'page-active' | 'exiting-page';
type PageId = AppPageId | null;
type CursorStyle = 'default' | 'metaphor';
type TransitionPhase = 'menu' | 'entering-page' | 'page-active' | 'exiting-page';

interface PageTransitionOptions {
  fromPopState?: boolean;
  playSound?: boolean;
}

interface MainMenuProps {
  memorandumData: MemorandumData;
  initialPathname: string;
}

const MENU_SELECTED_OFFSET_VH = 1;
const MENU_BELOW_SELECTED_OFFSET_VH = 2;
const TOUCH_INPUT_GRACE_MS = 800;
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleWindow = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};
type NavigationDestination = {
  url: string;
};
type AppNavigateEvent = Event & {
  canIntercept?: boolean;
  downloadRequest?: string | null;
  formData?: FormData | null;
  hashChange?: boolean;
  intercept?: (options: {
    focusReset?: 'manual' | 'after-transition';
    scroll?: 'manual' | 'after-transition';
    handler?: () => void | Promise<void>;
  }) => void;
  navigationType?: 'push' | 'replace' | 'reload' | 'traverse';
  destination: NavigationDestination;
};
type AppNavigation = EventTarget;
type WindowWithNavigation = Window & {
  navigation?: AppNavigation;
};

interface ClientPreferences {
  animationsEnabled: boolean;
  cursorStyle: CursorStyle;
  bgInverted: boolean;
  soundEnabled: boolean;
}

function setDirectPageInitialStates(container: Element): void {
  gsap.set(container.querySelectorAll('[data-char]'), { x: 0, y: 0, opacity: 0 });
  gsap.set(container.querySelector('[data-menu-left]'), { x: 0, opacity: 0 });
  gsap.set(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
  gsap.set(container.querySelector('[data-paint-splash-wrap]'), {
    opacity: 0,
    clipPath: 'inset(0 0 0 0%)',
  });
  gsap.set(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
  gsap.set(container.querySelector('[data-control-hints-fixed]'), { y: '1vh', opacity: 0 });
  gsap.set(container.querySelector('[data-portrait-wrap]'), { opacity: 0 });
}

function clearBootMode() {
  if (typeof document === 'undefined') return;
  delete document.documentElement.dataset.bootMode;
}

function createSoundEffectAudio(src: string) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

function getMenuItemWrapOffsetYVh(index: number, selectedIndex: number) {
  if (index === selectedIndex) return MENU_SELECTED_OFFSET_VH;
  if (index > selectedIndex) return MENU_BELOW_SELECTED_OFFSET_VH;
  return 0;
}

function readClientPreferences(): ClientPreferences {
  if (typeof window === 'undefined') {
    return {
      animationsEnabled: true,
      cursorStyle: 'metaphor',
      bgInverted: false,
      soundEnabled: true,
    };
  }

  const stored = window.localStorage.getItem('animationsEnabled');
  const storedCursor = window.localStorage.getItem('cursorStyle');

  return {
    animationsEnabled: stored !== null
      ? stored === 'true'
      : !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    cursorStyle: storedCursor === 'default' || storedCursor === 'metaphor' ? storedCursor : 'metaphor',
    bgInverted: window.localStorage.getItem('bgInverted') === 'true',
    soundEnabled: window.localStorage.getItem('soundEnabled') !== 'false',
  };
}

export default function MainMenu({ memorandumData, initialPathname }: MainMenuProps) {
  const initialNormalizedPathRef = useRef(normalizePathname(initialPathname));
  const initialTargetPathRef = useRef(
    initialNormalizedPathRef.current
  );
  const initialClientPreferencesRef = useRef(readClientPreferences());
  const initialTargetRouteRef = useRef(
    resolveAppRoute(initialTargetPathRef.current, memorandumData)
  );
  const initialAnimationsEnabled = initialClientPreferencesRef.current.animationsEnabled;
  const shouldMountPageDirectOnLoad = initialTargetRouteRef.current.pageId !== null;
  const shouldAnimateDirectPageEntry = shouldMountPageDirectOnLoad && initialAnimationsEnabled;
  const initialDirectMountPageId = initialTargetRouteRef.current?.pageId ?? null;
  const initialSelectedIndex = (() => {
    const targetPageId = initialTargetRouteRef.current?.pageId ?? null;
    const targetIndex = targetPageId
      ? MENU_ITEMS.findIndex((item) => item.id === targetPageId)
      : -1;
    return targetIndex >= 0 ? targetIndex : 0;
  })();
  const initialPendingMenuSelectionIndex = (() => {
    return null;
  })();
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const shouldMountPageDirectOnLoadRef = useRef(
    shouldMountPageDirectOnLoad
  );
  const shouldSkipBlockingPreloadRef = useRef(
    shouldMountPageDirectOnLoad
  );
  const [appState, setAppState] = useState<AppState>(
    shouldAnimateDirectPageEntry
      ? 'entering-page'
      : shouldMountPageDirectOnLoadRef.current && initialTargetRouteRef.current?.pageId
        ? 'page-active'
      : shouldSkipBlockingPreloadRef.current
        ? 'idle'
        : 'preloading'
  );
  const [animationsEnabled, setAnimationsEnabled] = useState(initialAnimationsEnabled);
  const [preferencesReady, setPreferencesReady] = useState(typeof window !== 'undefined');
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
  const [unsupported, setUnsupported] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(initialSelectedIndex);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [activePage, setActivePage] = useState<PageId>(
    shouldMountPageDirectOnLoadRef.current ? initialDirectMountPageId : null
  );
  const [hintsPage, setHintsPage] = useState<PageId>(
    shouldMountPageDirectOnLoadRef.current ? initialDirectMountPageId : null
  );
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(initialClientPreferencesRef.current.cursorStyle);
  const [bgInverted, setBgInverted] = useState(initialClientPreferencesRef.current.bgInverted);
  const [soundEnabled, setSoundEnabled] = useState(initialClientPreferencesRef.current.soundEnabled);
  const [supportsHoverPointer, setSupportsHoverPointer] = useState(false);
  const [splashMeasureKey, setSplashMeasureKey] = useState(0);
  const [hintsMode, setHintsMode] = useState<'menu' | 'page'>(
    shouldMountPageDirectOnLoadRef.current ? 'page' : 'menu'
  );
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hintVariant, setHintVariant] = useState<'memorandum-detail' | undefined>(undefined);
  const [readMemorandumEntryIds, setReadMemorandumEntryIds] = useState<string[]>([]);
  const [currentLocationPath, setCurrentLocationPath] = useState(() =>
    initialTargetPathRef.current
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const menuIndexRef = useRef<HTMLDivElement>(null);
  const menuStackRef = useRef<HTMLDivElement>(null);
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const indexAnimTlRef = useRef<gsap.core.Timeline | null>(null);
  const pageTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevSelectedIndexRef = useRef(initialSelectedIndex);
  const selectedIndexRef = useRef(initialSelectedIndex);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollAt = useRef(0);
  const lastKeyNavAt = useRef(0);
  const appStateRef = useRef<AppState>(
    shouldAnimateDirectPageEntry
      ? 'entering-page'
      : shouldMountPageDirectOnLoadRef.current && initialTargetRouteRef.current?.pageId
        ? 'page-active'
      : shouldSkipBlockingPreloadRef.current
        ? 'idle'
        : 'preloading'
  );
  const activePageRef = useRef<PageId>(
    shouldMountPageDirectOnLoadRef.current ? initialDirectMountPageId : null
  );
  const transitionPhaseRef = useRef<TransitionPhase>(
    shouldAnimateDirectPageEntry
      ? 'entering-page'
      : shouldMountPageDirectOnLoadRef.current && initialTargetRouteRef.current?.pageId
        ? 'page-active'
      : 'menu'
  );
  const currentLocationPathRef = useRef(
    initialTargetPathRef.current
  );
  const pendingLocationPageRef = useRef<string | null>(
    null
  );
  const pendingMenuSelectionIndexRef = useRef<number | null>(initialPendingMenuSelectionIndex);
  const soundRefs = useRef<Record<SoundEffectId, HTMLAudioElement | null>>({
    switch: null,
    enter: null,
    exit: null,
    toggle: null,
  });
  const soundWarmupStartedRef = useRef(false);
  const soundWarmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundWarmupIdleCallbackRef = useRef<number | null>(null);
  const menuReEntryDelayRef = useRef<gsap.core.Tween | null>(null);
  const hoverSyncRafRef = useRef<number | null>(null);
  const interceptedNavigationPathRef = useRef<string | null>(null);
  const interceptedNavigationResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDirectMountAppliedRef = useRef(false);
  const initialDirectPageEntryInProgressRef = useRef(shouldAnimateDirectPageEntry);
  const enterPageRef = useRef<(pageId: AppPageId, options?: PageTransitionOptions) => void>(() => {});
  const exitPageRef = useRef<(options?: PageTransitionOptions) => void>(() => {});
  const pageNavigationRef = useRef<PageNavigationHandler | null>(null);
  const [inputMode, setInputMode] = useState<'keyboard' | 'mouse' | 'touch'>('mouse');
  const deferredImageWarmupStartedRef = useRef(false);
  const lastTouchInputAt = useRef(0);
  const lastPointerTypeRef = useRef<'mouse' | 'touch' | 'pen' | null>(null);
  const lastPointerDownAtRef = useRef(0);
  const pageShellRevealRafRef = useRef<number | null>(null);
  const pageShellRevealNestedRafRef = useRef<number | null>(null);
  const pageShellRevealTokenRef = useRef(0);

  const cancelPendingPageShellReveal = useCallback(() => {
    pageShellRevealTokenRef.current += 1;
    if (pageShellRevealRafRef.current !== null) {
      cancelAnimationFrame(pageShellRevealRafRef.current);
      pageShellRevealRafRef.current = null;
    }
    if (pageShellRevealNestedRafRef.current !== null) {
      cancelAnimationFrame(pageShellRevealNestedRafRef.current);
      pageShellRevealNestedRafRef.current = null;
    }
  }, []);

  const revealPageShellSoon = useCallback(() => {
    cancelPendingPageShellReveal();
    const revealToken = pageShellRevealTokenRef.current;

    pageShellRevealRafRef.current = requestAnimationFrame(() => {
      pageShellRevealRafRef.current = null;

      pageShellRevealNestedRafRef.current = requestAnimationFrame(() => {
        pageShellRevealNestedRafRef.current = null;
        if (pageShellRevealTokenRef.current !== revealToken) return;

        const shell = containerRef.current?.querySelector('[data-page-shell]');
        if (!shell) return;
        gsap.set(shell, { opacity: 1 });
      });
    });
  }, [cancelPendingPageShellReveal]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    currentLocationPathRef.current = currentLocationPath;
  }, [currentLocationPath]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const handleDirectPageEntryComplete = useCallback(() => {
    if (!initialDirectPageEntryInProgressRef.current) return;
    initialDirectPageEntryInProgressRef.current = false;
    appStateRef.current = 'page-active';
    transitionPhaseRef.current = 'page-active';
    if (containerRef.current) {
      gsap.set(containerRef.current.querySelector('[data-control-hints-fixed]'), { y: 0, opacity: 1 });
    }
    setAppState('page-active');
  }, []);

  const ensureSoundEffect = useCallback((id: SoundEffectId) => {
    if (typeof Audio === 'undefined') return null;

    const existing = soundRefs.current[id];
    if (existing) return existing;

    const audio = createSoundEffectAudio(SOUND_EFFECT_SOURCES[id]);
    soundRefs.current[id] = audio;
    return audio;
  }, []);

  const scheduleSoundWarmup = useCallback((priorityId?: SoundEffectId) => {
    if (typeof Audio === 'undefined' || soundWarmupStartedRef.current) return;

    soundWarmupStartedRef.current = true;
    const idleWindow = window as IdleWindow;
    const warmRemainingEffects = () => {
      soundWarmupTimeoutRef.current = null;
      soundWarmupIdleCallbackRef.current = null;

      (Object.keys(SOUND_EFFECT_SOURCES) as SoundEffectId[]).forEach((soundId) => {
        if (soundId === priorityId) return;
        const audio = ensureSoundEffect(soundId);
        if (!audio) return;
        audio.load();
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      soundWarmupIdleCallbackRef.current = idleWindow.requestIdleCallback(warmRemainingEffects, { timeout: 1500 });
      return;
    }

    soundWarmupTimeoutRef.current = window.setTimeout(warmRemainingEffects, 200);
  }, [ensureSoundEffect]);

  useEffect(() => {
    return () => {
      const idleWindow = window as IdleWindow;
      if (soundWarmupTimeoutRef.current) {
        clearTimeout(soundWarmupTimeoutRef.current);
      }
      if (
        soundWarmupIdleCallbackRef.current !== null &&
        typeof idleWindow.cancelIdleCallback === 'function'
      ) {
        idleWindow.cancelIdleCallback(soundWarmupIdleCallbackRef.current);
      }

      (Object.keys(SOUND_EFFECT_SOURCES) as SoundEffectId[]).forEach((id) => {
        const audio = soundRefs.current[id];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        soundRefs.current[id] = null;
      });
    };
  }, []);

  const playSoundEffect = useCallback<PlaySoundEffect>((id, options) => {
    if (!options?.force && !soundEnabled) return;

    const audio = ensureSoundEffect(id);
    if (!audio) return;

    scheduleSoundWarmup(id);
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, [ensureSoundEffect, scheduleSoundWarmup, soundEnabled]);

  const handleAnimationsToggle = useCallback((options?: { playSound?: boolean }) => {
    if (options?.playSound !== false) {
      playSoundEffect('toggle');
    }

    setAnimationsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('animationsEnabled', String(next));
      return next;
    });
  }, [playSoundEffect]);

  const selectMenuIndex = useCallback((nextIndex: number, options?: { playSound?: boolean }) => {
    const normalizedIndex = ((nextIndex % MENU_ITEMS.length) + MENU_ITEMS.length) % MENU_ITEMS.length;
    const changed = selectedIndexRef.current !== normalizedIndex;
    selectedIndexRef.current = normalizedIndex;
    setSelectedIndex(normalizedIndex);

    if (changed && options?.playSound !== false) {
      playSoundEffect('switch');
    }

    return changed;
  }, [playSoundEffect]);

  const setPageNavigation = useCallback((handler: PageNavigationHandler | null) => {
    pageNavigationRef.current = handler;
    setShowScrollHint(Boolean(handler?.showScrollHint));
    setHintVariant(handler?.hintVariant);
  }, []);

  const handleMenuItemMouseEnter = useCallback((index: number) => {
    if (!supportsHoverPointer || Date.now() - lastTouchInputAt.current < TOUCH_INPUT_GRACE_MS) return;
    if (appState === 'idle' && Date.now() - lastKeyNavAt.current > 100) {
      setInputMode('mouse');
      selectMenuIndex(index);
    }
  }, [appState, selectMenuIndex, supportsHoverPointer]);

  const syncHoveredMenuItemSelection = useCallback(() => {
    hoverSyncRafRef.current = null;

    if (!supportsHoverPointer || appStateRef.current !== 'idle' || activePageRef.current) return;
    if (Date.now() - lastTouchInputAt.current < TOUCH_INPUT_GRACE_MS) return;

    const hoveredIndex = itemRefs.current.findIndex((itemRef, index) => (
      Boolean(itemRef?.matches(':hover') || itemWrapRefs.current[index]?.matches(':hover'))
    ));

    if (hoveredIndex === -1) return;

    setInputMode('mouse');
    selectMenuIndex(hoveredIndex);
  }, [selectMenuIndex, supportsHoverPointer]);

  const queueHoveredMenuItemSelectionSync = useCallback(() => {
    if (hoverSyncRafRef.current !== null) {
      cancelAnimationFrame(hoverSyncRafRef.current);
    }

    hoverSyncRafRef.current = requestAnimationFrame(() => {
      syncHoveredMenuItemSelection();
    });
  }, [syncHoveredMenuItemSelection]);

  const syncRouteFromPath = useCallback((pathname: string) => {
    const nextPath = normalizePathname(pathname);
    const nextRoute = resolveAppRoute(nextPath, memorandumData);
    const nextPage = nextRoute.pageId ?? null;
    const canonicalPath = nextRoute.pathname;
    const nextItemIndex = nextPage
      ? MENU_ITEMS.findIndex((item) => item.id === nextPage)
      : -1;

    setCurrentLocationPath(canonicalPath);
    pendingLocationPageRef.current = nextPage ? canonicalPath : null;

    if (nextPage) {
      if (appStateRef.current === 'idle' && activePageRef.current !== nextPage) {
        if (nextItemIndex !== -1) {
          selectMenuIndex(nextItemIndex, { playSound: false });
        }
        enterPageRef.current(nextPage, { fromPopState: true });
        return;
      }

      if (appStateRef.current === 'page-active' && activePageRef.current !== nextPage) {
        pendingMenuSelectionIndexRef.current = nextItemIndex >= 0 ? nextItemIndex : null;
        if (activePageRef.current === 'memorandum') return;
        exitPageRef.current({ fromPopState: true });
      }
      return;
    }

    pendingMenuSelectionIndexRef.current = null;
    if (activePageRef.current && appStateRef.current === 'page-active') {
      if (activePageRef.current === 'memorandum') return;
      exitPageRef.current({ fromPopState: true });
    }
  }, [memorandumData, selectMenuIndex]);

  useEffect(() => {
    const manifest = createAssetPreloadManifest(memorandumData);
    const preloadController = new AbortController();
    const shouldReduceWork = shouldReduceBootWork();
    let cancelled = false;

    Promise.all([
      preloadImages(manifest.blockingImageSrcs, {
        concurrency: shouldReduceWork ? 1 : 2,
        signal: preloadController.signal,
      }),
      document.fonts.load('400 1em Cinzel'),
      document.fonts.load('700 1em Cinzel'),
      document.fonts.load('900 1em Cinzel'),
    ]).then(() => {
      if (cancelled) return;
      if (appStateRef.current !== 'preloading') return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setAppState(shouldMountPageDirectOnLoadRef.current ? 'entering-page' : 'entry');
      }));
    });

    return () => {
      cancelled = true;
      preloadController.abort();
    };
  }, [memorandumData]);

  useEffect(() => {
    if (appState === 'preloading' || deferredImageWarmupStartedRef.current) return;
    if (shouldReduceBootWork()) {
      deferredImageWarmupStartedRef.current = true;
      return;
    }

    const manifest = createAssetPreloadManifest(memorandumData);
    if (!manifest.deferredImageSrcs.length) {
      deferredImageWarmupStartedRef.current = true;
      return;
    }

    deferredImageWarmupStartedRef.current = true;

    const preloadController = new AbortController();
    const idleWindow = window as IdleWindow;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const warmDeferredImages = () => {
      if (preloadController.signal.aborted) return;
      void preloadImages(manifest.deferredImageSrcs, {
        concurrency: 2,
        decode: false,
        signal: preloadController.signal,
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleCallbackId = idleWindow.requestIdleCallback(() => {
        warmDeferredImages();
      }, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(warmDeferredImages, 400);
    }

    return () => {
      preloadController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (idleCallbackId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [appState, memorandumData]);

  useLayoutEffect(() => {
    const preferences = readClientPreferences();
    setAnimationsEnabled(preferences.animationsEnabled);
    setCursorStyle(preferences.cursorStyle);
    setBgInverted(preferences.bgInverted);
    setSoundEnabled(preferences.soundEnabled);
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      'cursor-metaphor',
      cursorStyle === 'metaphor' && supportsHoverPointer && inputMode === 'mouse'
    );
  }, [cursorStyle, inputMode, supportsHoverPointer]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const update = () => {
      setSupportsHoverPointer(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('bg-inverted', bgInverted);
  }, [bgInverted]);

  useLayoutEffect(() => {
    if (
      !preferencesReady ||
      !shouldMountPageDirectOnLoadRef.current ||
      initialDirectMountAppliedRef.current ||
      !containerRef.current ||
      appState !== 'entering-page'
    ) {
      return;
    }

    initialDirectMountAppliedRef.current = true;
    if (!animationsEnabled) {
      initialDirectPageEntryInProgressRef.current = false;
      appStateRef.current = 'page-active';
      transitionPhaseRef.current = 'page-active';
      gsap.set(containerRef.current.querySelector('[data-control-hints-fixed]'), { y: 0, opacity: 1 });
      setAppState('page-active');
      return;
    }

    setDirectPageInitialStates(containerRef.current);
    clearBootMode();
  }, [appState, animationsEnabled, preferencesReady]);

  useLayoutEffect(() => {
    if (
      !preferencesReady ||
      !shouldMountPageDirectOnLoadRef.current ||
      animationsEnabled ||
      appState !== 'page-active' ||
      !containerRef.current
    ) {
      return;
    }

    const pageShell = containerRef.current.querySelector('[data-page-shell]');
    if (!pageShell) {
      clearBootMode();
      return;
    }

    const revealIfReady = () => {
      if (pageShell.querySelector('section')) {
        clearBootMode();
        return true;
      }

      return false;
    };

    if (revealIfReady()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (!revealIfReady()) return;
      observer.disconnect();
    });

    observer.observe(pageShell, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [appState, animationsEnabled, preferencesReady]);

  useLayoutEffect(() => {
    if (!preferencesReady || appState !== 'entry' || !containerRef.current) return;

    const initialRoute = resolveAppRoute(currentLocationPath, memorandumData);
    if (initialRoute.pageId) {
      const itemIndex = MENU_ITEMS.findIndex((item) => item.id === initialRoute.pageId);
      if (itemIndex !== -1) selectMenuIndex(itemIndex, { playSound: false });
    }

    if (!animationsEnabled) {
      clearBootMode();
      setAppState('idle');
      setSubtitleVisible(true);
      return;
    }

    setEntryInitialStates(containerRef.current);
    clearBootMode();
  }, [appState, animationsEnabled, currentLocationPath, memorandumData, preferencesReady, selectMenuIndex]);

  // Start entry animation after initial states are applied.
  // activePage check guards against running when a page transition starts before cleanup.
  useEffect(() => {
    if (appState !== 'entry' || !containerRef.current || !animationsEnabled || activePage) return;

    entryTlRef.current = createEntryTimeline(
      containerRef.current,
      () => {
        setAppState('idle');
      },
      () => setSubtitleVisible(true)
    );

    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, [appState, animationsEnabled, activePage]);

  // Smooth scroll + index fade when selectedIndex changes
  useEffect(() => {
    const prevIdx = prevSelectedIndexRef.current;
    prevSelectedIndexRef.current = selectedIndex;
    const changed = prevIdx !== selectedIndex && appState === 'idle' && animationsEnabled;
    const newY = `${(2.5 - selectedIndex) * 1.5}vh`;

    MENU_ITEMS.forEach((_, i) => {
      const wrap = itemWrapRefs.current[i];
      if (!wrap) return;

      const nextOffset = `${getMenuItemWrapOffsetYVh(i, selectedIndex)}vh`;
      if (changed) {
        gsap.to(wrap, {
          y: nextOffset,
          duration: 0.2,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      } else {
        gsap.set(wrap, { y: nextOffset });
      }
    });

    if (menuLeftRef.current) {
      if (changed) {
        gsap.to(menuLeftRef.current, { y: newY, duration: 0.2, ease: 'power3.out' });
      } else {
        gsap.set(menuLeftRef.current, { y: newY });
      }
    }

    if (menuIndexRef.current && changed) {
      indexAnimTlRef.current?.kill();
      const el = menuIndexRef.current;
      indexAnimTlRef.current = gsap.timeline()
        .to(el, { y: 5, opacity: 0, duration: 0.06, ease: 'power2.in' })
        .call(() => setDisplayIndex(selectedIndex))
        .set(el, { y: -5 })
        .to(el, { y: 0, opacity: 1, duration: 0.07, ease: 'power2.out' });
    } else {
      setDisplayIndex(selectedIndex);
    }

    if (changed) {
      const activeItem = itemRefs.current[selectedIndex];
      const activeChars = activeItem
        ? Array.from(activeItem.querySelectorAll('[data-char]')) as HTMLElement[]
        : [];

      if (activeChars.length) {
        gsap.killTweensOf(activeChars);
        gsap.fromTo(
          activeChars,
          {
            scaleX: 1.08,
            scaleY: 0.9,
            transformOrigin: '50% 100%',
          },
          {
            scaleX: 1,
            scaleY: 1,
            duration: 0.18,
            ease: 'power2.out',
            stagger: 0.01,
            overwrite: 'auto',
          },
        );
      }
    }
  }, [selectedIndex, appState, animationsEnabled]);


  useEffect(() => {
    const markTouchInput = () => {
      const now = Date.now();
      lastTouchInputAt.current = now;
      lastPointerTypeRef.current = 'touch';
      lastPointerDownAtRef.current = now;
      setInputMode('touch');
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        markTouchInput();
        return;
      }

      const now = Date.now();
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        lastPointerTypeRef.current = event.pointerType;
        lastPointerDownAtRef.current = now;
      } else {
        lastPointerTypeRef.current = null;
      }

      if (event.pointerType === 'mouse' && supportsHoverPointer) {
        setInputMode('mouse');
      }
    };

    window.addEventListener('touchstart', markTouchInput, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => {
      window.removeEventListener('touchstart', markTouchInput);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [supportsHoverPointer]);

  useEffect(() => {
    const onMove = () => {
      if (!supportsHoverPointer) return;
      if (Date.now() - lastTouchInputAt.current < TOUCH_INPUT_GRACE_MS) return;
      if (Date.now() - lastKeyNavAt.current < 600) return;
      setInputMode('mouse');
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [supportsHoverPointer]);

  // Scroll wheel navigation - no wraparound, cooldown to handle trackpad micro-events
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (appState === 'page-active' && pageNavigationRef.current?.inputLocked) {
        e.preventDefault();
        return;
      }

      if (appState === 'page-active' && pageNavigationRef.current?.captureWheel) {
        const direction = e.deltaY > 0 ? 'down' : e.deltaY < 0 ? 'up' : null;
        if (!direction) return;

        const handled =
          pageNavigationRef.current.onWheelDirection?.(direction) ??
          pageNavigationRef.current.onDirection?.(direction) ??
          false;
        if (handled) e.preventDefault();
        return;
      }

      if (appState !== 'idle') return;
      const now = Date.now();
      // TODO: Make sure trackpad scrolls are handled properly
      // if (now - lastScrollAt.current < 100) return;
      lastScrollAt.current = now;
      lastKeyNavAt.current = now;
      setInputMode('keyboard');
      if (e.deltaY > 0) {
        selectMenuIndex(Math.min(selectedIndexRef.current + 1, MENU_ITEMS.length - 1));
      } else if (e.deltaY < 0) {
        selectMenuIndex(Math.max(selectedIndexRef.current - 1, 0));
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [appState, selectMenuIndex]);

  // Keyboard navigation - all input blocked during non-idle states
  useEffect(() => {
    const getDirectionForKey = (key: string): PageNavigationDirection | null => {
      if (key === 'w' || key === 'W' || key === 'ArrowUp') return 'up';
      if (key === 's' || key === 'S' || key === 'ArrowDown') return 'down';
      if (key === 'a' || key === 'A' || key === 'ArrowLeft') return 'left';
      if (key === 'd' || key === 'D' || key === 'ArrowRight') return 'right';
      return null;
    };

    const isVerticalKey = (key: string) =>
      key === 'w' || key === 'W' || key === 'ArrowUp' || key === 's' || key === 'S' || key === 'ArrowDown';

    const applyMenuKey = (key: string, isRepeat = false) => {
      lastKeyNavAt.current = Date.now();

      if (key === 'w' || key === 'W' || key === 'ArrowUp') {
        if (isRepeat && selectedIndexRef.current === 0) return false;
        return selectMenuIndex(selectedIndexRef.current === 0
          ? MENU_ITEMS.length - 1
          : selectedIndexRef.current - 1);
      }

      if (key === 's' || key === 'S' || key === 'ArrowDown') {
        if (isRepeat && selectedIndexRef.current === MENU_ITEMS.length - 1) return false;
        return selectMenuIndex(selectedIndexRef.current === MENU_ITEMS.length - 1
          ? 0
          : selectedIndexRef.current + 1);
      }

      if (key === 'a' || key === 'A' || key === 'ArrowLeft') {
        return selectMenuIndex(selectedIndexRef.current === 0 ? MENU_ITEMS.length - 1 : 0);
      }

      if (key === 'd' || key === 'D' || key === 'ArrowRight') {
        return selectMenuIndex(
          selectedIndexRef.current === MENU_ITEMS.length - 1 ? 0 : MENU_ITEMS.length - 1
        );
      }

      return false;
    };

    const applyPageDirection = (direction: PageNavigationDirection, isRepeat = false) => {
      lastKeyNavAt.current = Date.now();
      return pageNavigationRef.current?.onDirection?.(direction, { isRepeat }) ?? false;
    };

    const onKey = (e: KeyboardEvent) => {
      const currentAppState = appStateRef.current;

      if (e.ctrlKey) {
        return;
      }

      if (currentAppState === 'page-active') {
        if (pageNavigationRef.current?.inputLocked) {
          if (
            e.key === 'Escape' ||
            e.key === 'c' ||
            e.key === 'C' ||
            e.key === 'Enter' ||
            e.key === ' ' ||
            e.key === '1' ||
            e.key === '3' ||
            getDirectionForKey(e.key)
          ) {
            e.preventDefault();
          }
          return;
        }

        if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          if (e.repeat) return;
          if (pageNavigationRef.current?.onBack?.()) return;
          exitPageRef.current({ playSound: true });
          return;
        }
        if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
          handleAnimationsToggle({ playSound: true });
          return;
        }
        if ((e.key === '1' || e.key === '3') && pageNavigationRef.current?.onActionKey) {
          if (e.repeat) {
            e.preventDefault();
            return;
          }
          const handled = pageNavigationRef.current.onActionKey(e.key);
          if (handled) e.preventDefault();
          return;
        }

        const direction = getDirectionForKey(e.key);
        if (direction) {
          if (e.repeat && direction !== 'up' && direction !== 'down') {
            if (e.key.startsWith('Arrow')) {
              e.preventDefault();
            }
            return;
          }

          setInputMode('keyboard');
          const handled = applyPageDirection(direction, e.repeat);
          if (handled || e.key.startsWith('Arrow')) e.preventDefault();
          return;
        }

        if ((e.key === 'Enter' || e.key === ' ') && pageNavigationRef.current?.onConfirm) {
          const handled = pageNavigationRef.current.onConfirm();
          if (handled) e.preventDefault();
        }
        return;
      }

      if (currentAppState !== 'idle') return;

      if (e.key === 'f' || e.key === 'F') {
        if (e.repeat) return;
        handleAnimationsToggle({ playSound: true });
        return;
      }

      const isNav = ['w','W','s','S','a','A','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
      const isEnter = e.key === 'Enter' || e.key === ' ';
      if (isEnter) {
        e.preventDefault();
        enterPageRef.current(MENU_ITEMS[selectedIndexRef.current].id as AppPageId, { playSound: true });
        return;
      }
      if (!isNav) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
      if (e.repeat && !isVerticalKey(e.key)) return;

      setInputMode('keyboard');
      applyMenuKey(e.key, e.repeat);
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [handleAnimationsToggle, selectMenuIndex]);

  useEffect(() => {
    return () => {
      if (interceptedNavigationResetTimeoutRef.current) {
        clearTimeout(interceptedNavigationResetTimeoutRef.current);
      }
      if (hoverSyncRafRef.current !== null) {
        cancelAnimationFrame(hoverSyncRafRef.current);
      }
      cancelPendingPageShellReveal();
      menuReEntryDelayRef.current?.kill();
      pageTlRef.current?.kill();
    };
  }, [cancelPendingPageShellReveal]);

  // When animations are off, snap hints visible whenever the app reaches a stable state.
  // With animations on, the timelines handle their own hint fade-ins directly.
  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    if (appState === 'page-active' || appState === 'idle') {
      const el = containerRef.current.querySelector('[data-control-hints-fixed]');
      if (el) gsap.set(el, { opacity: 1 });
    }
    if (appState === 'idle') setSubtitleVisible(true);
  }, [appState, animationsEnabled]);

  useEffect(() => {
    const check = rafThrottle(() => {
      const ratio = window.innerWidth / window.innerHeight;
      setUnsupported(ratio < 1.3 || ratio > 2.3);
    });
    check();
    window.addEventListener('resize', check);
    return () => {
      check.cancel();
      window.removeEventListener('resize', check);
    };
  }, []);

  useEffect(() => {
    if (appState === 'page-active' && activePage) {
      const pendingPath = pendingLocationPageRef.current;
      const resolvedCurrentRoute = resolveAppRoute(currentLocationPath, memorandumData);
      const desiredPath = activePage === 'memorandum'
        ? (resolvedCurrentRoute.pageId === 'memorandum'
            ? resolvedCurrentRoute.pathname
            : buildPagePath('memorandum'))
        : buildPagePath(activePage);

      if (pendingPath && pendingPath !== desiredPath) {
        return;
      }

      if (getCurrentPathname() !== desiredPath) {
        replacePathname(desiredPath);
      }

      if (currentLocationPath !== desiredPath) {
        setCurrentLocationPath(desiredPath);
      }
      return;
    }

    if (appState === 'exiting-page' && getCurrentPathname() !== '/') {
      if (pendingLocationPageRef.current) return;
      replacePathname('/');
      return;
    }

    if (appState === 'idle' && !activePage && getCurrentPathname() !== '/') {
      if (!pendingLocationPageRef.current) {
        replacePathname('/');
      }
      if (currentLocationPath !== '/') {
        setCurrentLocationPath('/');
      }
    }
  }, [appState, activePage, currentLocationPath, memorandumData]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getCurrentPathname();
      if (interceptedNavigationPathRef.current === nextPath) {
        interceptedNavigationPathRef.current = null;
        if (interceptedNavigationResetTimeoutRef.current) {
          clearTimeout(interceptedNavigationResetTimeoutRef.current);
          interceptedNavigationResetTimeoutRef.current = null;
        }
        return;
      }

      syncRouteFromPath(nextPath);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [syncRouteFromPath]);

  useEffect(() => {
    const navigation = (window as WindowWithNavigation).navigation;
    if (!navigation) return;

    const onNavigate = (event: Event) => {
      const navigateEvent = event as AppNavigateEvent;
      if (navigateEvent.hashChange || navigateEvent.downloadRequest || navigateEvent.formData) return;

      const destinationUrl = new URL(navigateEvent.destination.url);
      if (destinationUrl.origin !== window.location.origin) return;

      const destinationPath = normalizePathname(destinationUrl.pathname);
      if (destinationPath === getCurrentPathname()) return;

      if (navigateEvent.navigationType === 'reload') {
        // Some browsers report address-bar same-origin navigations as reloads.
        // If the destination path actually changed, keep it in-app.
      }

      const destinationRoute = resolveAppRoute(destinationPath, memorandumData);
      if (!destinationRoute.pathname) return;

      const shouldUseDirectPageLoad =
        getCurrentPathname() === '/' &&
        !activePageRef.current &&
        destinationRoute.pageId !== null;

      if (shouldUseDirectPageLoad) {
        return;
      }

      if (!navigateEvent.canIntercept || typeof navigateEvent.intercept !== 'function') return;

      navigateEvent.intercept({
        focusReset: 'manual',
        scroll: 'manual',
        handler: () => {
          if (interceptedNavigationResetTimeoutRef.current) {
            clearTimeout(interceptedNavigationResetTimeoutRef.current);
          }
          interceptedNavigationPathRef.current = destinationPath;
          interceptedNavigationResetTimeoutRef.current = window.setTimeout(() => {
            if (interceptedNavigationPathRef.current === destinationPath) {
              interceptedNavigationPathRef.current = null;
            }
            interceptedNavigationResetTimeoutRef.current = null;
          }, 500);
          syncRouteFromPath(destinationPath);
        },
      });
    };

    navigation.addEventListener('navigate', onNavigate as EventListener);
    return () => {
      navigation.removeEventListener('navigate', onNavigate as EventListener);
    };
  }, [memorandumData, syncRouteFromPath]);

  useEffect(() => {
    const pendingPath = pendingLocationPageRef.current;
    if (appState !== 'idle' || activePage || !pendingPath) return;
    if (currentLocationPath !== pendingPath) {
      setCurrentLocationPath(pendingPath);
      return;
    }

    const pageId = resolveAppRoute(pendingPath, memorandumData).pageId ?? null;
    if (!pageId) return;
    enterPage(pageId, { fromPopState: true });
  }, [appState, activePage, currentLocationPath, enterPage, memorandumData]);

  useEffect(() => {
    if (
      appState === 'page-active' &&
      activePage &&
      resolveAppRoute(pendingLocationPageRef.current ?? '/', memorandumData).pageId === activePage
    ) {
      pendingLocationPageRef.current = null;
      return;
    }

    if (appState === 'idle' && !activePage && getCurrentPathname() === '/') {
      pendingLocationPageRef.current = null;
    }
  }, [appState, activePage, memorandumData]);

  // Keep the red/white split on the menu index aligned with the diagonal line
  const menuRendered = appState !== 'preloading';
  useEffect(() => {
    if (!menuRendered || !menuIndexRef.current) return;

    const update = rafThrottle(() => {
      const el = menuIndexRef.current;
      if (!el) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Use offsetWidth/offsetHeight (unaffected by GSAP transforms) and compute
      // position from the element's CSS: top:6vh, right:-2vw inside menu-root (fixed, inset:0).
      // getBoundingClientRect() includes the GSAP y-translate from the entry animation,
      // which gives a wrong result until the animation finishes.
      const elW = el.offsetWidth;
      const elH = el.offsetHeight;
      const top = 0.06 * vh;
      const right = vw * 1.02; // right: -2vw overflows the container by 2vw
      const left = right - elW;
      const bottom = top + elH;

      const lineY = (x: number) => vh * (2.35 - 2.25 * x / vw);
      const lineX = (y: number) => (vw * (2.35 - y / vh)) / 2.25;

      const hits: Array<{ x: number; y: number }> = [];

      const yL = lineY(left);
      if (yL >= top && yL <= bottom) hits.push({ x: left, y: yL });

      const yR = lineY(right);
      if (yR >= top && yR <= bottom) hits.push({ x: right, y: yR });

      const xT = lineX(top);
      if (xT >= left && xT <= right) hits.push({ x: xT, y: top });

      const xB = lineX(bottom);
      if (xB >= left && xB <= right) hits.push({ x: xB, y: bottom });

      if (hits.length < 2) return;

      const toLocal = ({ x, y }: { x: number; y: number }) => ({
        xp: ((x - left) / elW * 100).toFixed(1),
        yp: ((y - top) / elH * 100).toFixed(1),
      });

      const [p1, p2] = hits[0].y > hits[1].y ? [hits[0], hits[1]] : [hits[1], hits[0]];
      const lp1 = toLocal(p1);
      const lp2 = toLocal(p2);

      setClipPath(`polygon(${lp1.xp}% ${lp1.yp}%, ${lp2.xp}% ${lp2.yp}%, 100% 0%, 100% 100%)`);
    });

    update();

    const ro = new ResizeObserver(update);
    ro.observe(menuIndexRef.current);
    window.addEventListener('resize', update);
    return () => {
      update.cancel();
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [menuRendered]);

  const activeItem = MENU_ITEMS[selectedIndex];
  const pageVisible = appState === 'page-active' ||
    appState === 'exiting-page' ||
    (appState === 'entering-page' && initialDirectPageEntryInProgressRef.current);
  const directPageEntryCompleteHandler = appState === 'entering-page' &&
    initialDirectPageEntryInProgressRef.current
    ? handleDirectPageEntryComplete
    : undefined;

  function handleCursorChange(style: CursorStyle, options?: { playSound?: boolean }) {
    if (cursorStyle === style) return;
    if (options?.playSound !== false) {
      playSoundEffect('toggle');
    }
    setCursorStyle(style);
    localStorage.setItem('cursorStyle', style);
  }

  function handleBgInvertedChange(inverted: boolean, options?: { playSound?: boolean }) {
    if (bgInverted === inverted) return;
    if (options?.playSound !== false) {
      playSoundEffect('toggle');
    }
    setBgInverted(inverted);
    localStorage.setItem('bgInverted', String(inverted));
  }

  function handleSoundToggle(options?: { playSound?: boolean }) {
    if (options?.playSound !== false) {
      playSoundEffect('toggle', { force: true });
    }

    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('soundEnabled', String(next));
      return next;
    });
  }

  const handleMemorandumEntryRead = useCallback((entryId: string) => {
    setReadMemorandumEntryIds((current) =>
      current.includes(entryId) ? current : [...current, entryId]
    );
  }, []);

  const handleMemorandumPathChange = useCallback((
    nextPath: string,
    options?: { replace?: boolean }
  ) => {
    const normalizedPath = normalizePathname(nextPath);
    setCurrentLocationPath(normalizedPath);
    if (getCurrentPathname() === normalizedPath) return;

    if (options?.replace) {
      replacePathname(normalizedPath);
      return;
    }

    pushPathname(normalizedPath);
  }, []);

  const navigateToPage = useCallback((pageId: AppPageId, options?: { playSound?: boolean }) => {
    if (activePage === pageId && appState === 'page-active') return;

    const nextPath = buildPagePath(pageId);
    const itemIndex = MENU_ITEMS.findIndex((item) => item.id === pageId);

    if (appState === 'idle') {
      if (itemIndex !== -1) {
        selectMenuIndex(itemIndex, { playSound: false });
      }
      enterPageRef.current(pageId, options);
      return;
    }

    if (appState !== 'page-active' || !activePage) return;

    pendingMenuSelectionIndexRef.current = itemIndex >= 0 ? itemIndex : null;
    pushPathname(nextPath);
    pendingLocationPageRef.current = nextPath;
    setCurrentLocationPath(nextPath);
    exitPageRef.current({ fromPopState: true, playSound: options?.playSound });
  }, [activePage, appState, selectMenuIndex]);

  function enterPage(pageId: AppPageId, options: PageTransitionOptions = {}) {
    const { fromPopState = false, playSound = false } = options;
    if (
      !APP_PAGE_IDS.includes(pageId) ||
      activePageRef.current ||
      appStateRef.current !== 'idle' ||
      transitionPhaseRef.current !== 'menu'
    ) {
      return;
    }

    if (playSound) playSoundEffect('enter');

    const nextPath = buildPagePath(pageId);
    const resolvedPath = fromPopState
      ? resolveAppRoute(
          pendingLocationPageRef.current ?? currentLocationPathRef.current,
          memorandumData
        ).pathname
      : nextPath;

    if (!fromPopState) {
      pushPathname(nextPath);
    }
    setCurrentLocationPath(resolvedPath);
    cancelPendingPageShellReveal();
    pageTlRef.current?.kill();

    if (!animationsEnabled) {
      setSubtitleVisible(false);
      activePageRef.current = pageId;
      appStateRef.current = 'page-active';
      transitionPhaseRef.current = 'page-active';
      setActivePage(pageId);
      setHintsPage(pageId);
      setHintsMode('page');
      setAppState('page-active');
      return;
    }

    // Don't mount the page yet - let the exit animation play first.
    // onMountPage fires mid-timeline so the page appears after ~0.28s.
    setHintsPage(pageId);
    appStateRef.current = 'entering-page';
    transitionPhaseRef.current = 'entering-page';
    setAppState('entering-page');
    pageTlRef.current = createPageEnterTimeline(
      containerRef.current!,
      () => {
        pageTlRef.current = null;
        appStateRef.current = 'page-active';
        transitionPhaseRef.current = 'page-active';
        setAppState('page-active');
      },
      () => setHintsMode('page'),
      () => {
        activePageRef.current = pageId;
        setActivePage(pageId);
      },
      () => setSubtitleVisible(false),
      revealPageShellSoon,
    );
  }

  function exitPage(options: PageTransitionOptions = {}) {
    const { fromPopState = false, playSound = false } = options;
    const currentActivePage = activePageRef.current;
    if (
      !currentActivePage ||
      appStateRef.current !== 'page-active' ||
      transitionPhaseRef.current !== 'page-active'
    ) {
      return;
    }
    const pendingLocationPath = pendingLocationPageRef.current;
    const shouldPreserveLocationPath = fromPopState || (
      Boolean(pendingLocationPath) &&
      resolveAppRoute(pendingLocationPath!, memorandumData).pageId !== currentActivePage
    );

    if (!shouldPreserveLocationPath) {
      pendingLocationPageRef.current = null;
    }

    appStateRef.current = animationsEnabled ? 'exiting-page' : 'idle';
    transitionPhaseRef.current = animationsEnabled ? 'exiting-page' : 'menu';
    if (playSound) playSoundEffect('exit');

    if (!fromPopState) {
      pushPathname('/');
    }
    menuReEntryDelayRef.current?.kill();
    menuReEntryDelayRef.current = null;
    cancelPendingPageShellReveal();
    pageTlRef.current?.kill();

    if (!animationsEnabled) {
      // Snap menu elements back - may have GSAP inline styles from page enter animation.
      if (containerRef.current) {
        const c = containerRef.current;
        gsap.set(c.querySelector('[data-menu-left]'),           { x: 0, opacity: 1 });
        gsap.set(c.querySelector('[data-menu-index]'),          { y: 0, opacity: 1 });
        gsap.set(c.querySelector('[data-stats-hints]'),         { y: 0, opacity: 1 });
        gsap.set(c.querySelector('[data-paint-splash-wrap]'),   { opacity: 1, clipPath: 'inset(0 0 0 0%)' });
        gsap.set(c.querySelector('[data-control-hints-fixed]'), { y: 0, opacity: 1 });
        gsap.set(c.querySelector('[data-portrait-wrap]'),       { y: 0, opacity: 1 });
        gsap.set(c.querySelectorAll('[data-char]'),             { x: 0, y: 0, opacity: 1 });
      }
      setSubtitleVisible(true);
      setHintsMode('menu');
      activePageRef.current = null;
      appStateRef.current = 'idle';
      transitionPhaseRef.current = 'menu';
      setActivePage(null);
      setHintsPage(null);
      setAppState('idle');
      if (shouldPreserveLocationPath) {
        const pendingPath = pendingLocationPageRef.current;
        if (pendingPath && currentLocationPathRef.current !== pendingPath) {
          setCurrentLocationPath(pendingPath);
        }
      } else {
        setCurrentLocationPath('/');
      }
      setSplashMeasureKey(k => k + 1);
      queueHoveredMenuItemSelectionSync();
      return;
    }

    setSubtitleVisible(false);
    setAppState('exiting-page');
    setSplashMeasureKey(k => k + 1);
    if (pendingMenuSelectionIndexRef.current !== null) {
      selectMenuIndex(pendingMenuSelectionIndexRef.current, { playSound: false });
      pendingMenuSelectionIndexRef.current = null;
    }
    pageTlRef.current = createMenuReEntryTimeline(
      containerRef.current!,
      () => {
        pageTlRef.current = null;
        activePageRef.current = null;
        appStateRef.current = 'idle';
        transitionPhaseRef.current = 'menu';
        setActivePage(null);
        setHintsPage(null);
        setAppState('idle');
        if (shouldPreserveLocationPath) {
          const pendingPath = pendingLocationPageRef.current;
          if (pendingPath && currentLocationPathRef.current !== pendingPath) {
            setCurrentLocationPath(pendingPath);
          }
        } else {
          setCurrentLocationPath('/');
        }
        queueHoveredMenuItemSelectionSync();
      },
      () => setSubtitleVisible(true),
      () => setHintsMode('menu'),
    );
  }

  useEffect(() => {
    enterPageRef.current = enterPage;
    exitPageRef.current = exitPage;
  }, [enterPage, exitPage]);

  if (unsupported) return <UnsupportedScreen />;

  const cursorActive = cursorStyle === 'metaphor' && supportsHoverPointer && inputMode === 'mouse';
  const pageAnimationState =
    appState === 'entering-page'
      ? 'entering-page'
      : appState === 'exiting-page'
        ? 'exiting-page'
        : 'page-active';
  const initialEntryDelaySeconds = 0;
  const activePageContent = activePage === 'about' ? (
    <AboutPage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      playSoundEffect={playSoundEffect}
      onMemorandumNavigate={() => navigateToPage('memorandum', { playSound: false })}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'skills' ? (
    <SkillsPage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'experience' ? (
    <ExperiencePage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'contact' ? (
    <ContactPage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      playSoundEffect={playSoundEffect}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'memorandum' ? (
    <MemorandumPage
      memorandumData={memorandumData}
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      requestPageExit={exitPage}
      readEntryIds={readMemorandumEntryIds}
      onEntryRead={handleMemorandumEntryRead}
      locationPath={currentLocationPath}
      onPathChange={handleMemorandumPathChange}
      playSoundEffect={playSoundEffect}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'system' ? (
    <SystemPage
      isActive={appState === 'page-active'}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      cursorStyle={cursorStyle}
      onCursorChange={handleCursorChange}
      bgInverted={bgInverted}
      onBgInvertedChange={handleBgInvertedChange}
      animationsEnabled={animationsEnabled}
      onAnimationsToggle={handleAnimationsToggle}
      soundEnabled={soundEnabled}
      onSoundToggle={handleSoundToggle}
      registerNavigation={setPageNavigation}
      playSoundEffect={playSoundEffect}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : null;

  return (
    <>
    {appState === 'preloading' && <LoadingScreen />}
    <CustomCursor visible={cursorActive} />
    <div
      ref={containerRef}
      data-app-root
      className={`menu-root${inputMode === 'keyboard' ? ' keyboard-mode' : ''}`}
      onClick={(e) => {
        if (appState !== 'idle') return;
        if ((e.target as Element).closest('[data-control-hints-fixed]')) return;
        const tappedMenuItemTarget = (e.target as Element).closest<HTMLElement>('[data-menu-item-target]');
        const tappedMenuItem = (e.target as Element).closest<HTMLElement>('[data-menu-item]');
        const tappedPageId = tappedMenuItemTarget?.dataset.menuItemTarget ?? tappedMenuItem?.dataset.menuItem;
        const intendedPageId = tappedPageId && APP_PAGE_IDS.includes(tappedPageId as AppPageId)
          ? tappedPageId as AppPageId
          : null;
        const isTouchActivation = lastPointerTypeRef.current === 'touch' ||
          Date.now() - lastTouchInputAt.current < TOUCH_INPUT_GRACE_MS;

        if (isTouchActivation && !intendedPageId) {
          return;
        }

        if (isTouchActivation && intendedPageId) {
          const tappedIndex = MENU_ITEMS.findIndex((item) => item.id === intendedPageId);
          if (tappedIndex !== -1) {
            selectMenuIndex(tappedIndex, { playSound: false });
          }
        }

        enterPage(intendedPageId ?? MENU_ITEMS[selectedIndex].id as AppPageId, { playSound: true });
      }}
    >
      <BackgroundLayers />
      <div
        data-portrait-wrap
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <CharacterPortrait animationsEnabled={animationsEnabled} />
      </div>
      <BackgroundLines animationsEnabled={animationsEnabled} />

      <div
        data-paint-splash-wrap
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}
      >
        <MenuItemBackground
          itemRefs={itemRefs}
          menuStackRef={menuStackRef}
          selectedIndex={selectedIndex}
          animationsEnabled={animationsEnabled}
          accentH={activeItem.accentH}
          accentS={activeItem.accentS}
          accentL={activeItem.accentL}
          splashHeightVh={activeItem.splashHeightVh}
          splashWidthVh={activeItem.splashWidthVh}
          splashOffsetY={activeItem.splashOffsetY}
          splashTipXPct={activeItem.splashTipXPct}
          splashTaperYPct={activeItem.splashTaperYPct}
          menuScrollYVh={(2.5 - selectedIndex) * 1.5}
          selectedItemOffsetYVh={getMenuItemWrapOffsetYVh(selectedIndex, selectedIndex)}
          measureKey={splashMeasureKey}
        />
      </div>

      <div ref={menuLeftRef} className="menu-left" data-menu-left>
        <div className="menu-splash-wrap">
          <div ref={menuStackRef} className="menu-stack">
            {MENU_ITEMS.map((item, i) => {
              return (
                <div
                  key={item.id}
                  data-menu-item-target={item.id}
                  data-menu-item-wrap
                  ref={(el) => { itemWrapRefs.current[i] = el; }}
                  style={{
                    marginBottom: item.marginBottom,
                    marginTop: item.marginTop,
                  }}
                >
                  <MenuItem
                    ref={(el) => { itemRefs.current[i] = el; }}
                    item={item}
                    index={i}
                    isSelected={i === selectedIndex}
                    subtitle={item.subtitle}
                    subtitleVisible={subtitleVisible}
                    animationsEnabled={animationsEnabled}
                    onMouseEnter={handleMenuItemMouseEnter}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={menuIndexRef}
        data-menu-index
        style={{
          position: 'absolute',
          top: '6vh',
          right: '-2vw',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <MenuIndex index={MENU_ITEMS[displayIndex].index} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath,
            pointerEvents: 'none',
          }}
        >
          <MenuIndex index={MENU_ITEMS[displayIndex].index} textColor={COLORS.accentRed} />
        </div>
      </div>

      <div
        data-stats-hints
        style={{
          position: 'fixed',
          bottom: 'calc(2vh + 2.6rem)',
          right: 0,
          zIndex: 10,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <StatsPanel />
      </div>

      {/* Control hints - above page shell, always visible */}
      <div
        data-control-hints-fixed
        style={{
          position: 'fixed',
          bottom: '2vh',
          right: '2vw',
          zIndex: 20,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <ControlHints
          animationsEnabled={animationsEnabled}
          mode={hintsMode}
          activePage={hintsPage}
          hintVariant={hintVariant}
          showScrollHint={showScrollHint}
          onShortcutClick={(key) => {
            if (pageNavigationRef.current?.inputLocked) return;
            if (key === 'a' || key === 'A') {
              pageNavigationRef.current?.onDirection?.('left');
              return;
            }
            if (key === 'd' || key === 'D') {
              pageNavigationRef.current?.onDirection?.('right');
              return;
            }
            if (key === '1' || key === '3') {
              pageNavigationRef.current?.onActionKey?.(key);
            }
          }}
          onConfirm={() => {
            if (hintsMode === 'menu') {
              enterPage(MENU_ITEMS[selectedIndex].id as AppPageId, { playSound: true });
              return;
            }

            if (pageNavigationRef.current?.inputLocked) return;
            pageNavigationRef.current?.onConfirm?.();
          }}
          onBack={() => {
            if (pageNavigationRef.current?.inputLocked) return;
            if (pageNavigationRef.current?.onBack?.()) return;
            exitPage({ playSound: true });
          }}
          onAnimationsToggle={() => handleAnimationsToggle({ playSound: true })}
        />
      </div>

      {activePage && (
        <div
          data-page-shell
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 11,
            opacity: pageVisible ? 1 : 0,
            isolation: 'isolate',
            pointerEvents: appState === 'page-active' ? 'auto' : 'none',
            willChange: appState === 'entering-page' || appState === 'exiting-page'
              ? 'opacity'
              : undefined,
          }}
      >
          {activePageContent}
        </div>
      )}
    </div>
    </>
  );
}

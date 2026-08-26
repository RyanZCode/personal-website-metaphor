import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import {
  setEntryInitialStates,
  createEntryTimeline,
  createMenuLetterPulseTimeline,
  createPageEnterTimeline,
  createMenuReEntryTimeline,
} from '../../lib/animations';
import BackgroundLayers from '../background/BackgroundLayers';
import CharacterPortrait from '../background/CharacterPortrait';
import BackgroundLines from '../background/BackgroundLines';
import MenuItem from './MenuItem';
import MenuIndex from './MenuIndex';
import MenuItemBackground, { type MenuSplashHandle } from './MenuItemBackground';
import StatsPanel from './StatsPanel';
import ControlHints from '../shared/ControlHints';
import LoadingScreen from '../shared/LoadingScreen';
import CustomCursor from '../shared/CustomCursor';
import { readViewportProfile, useViewportProfile } from '../../lib/deviceProfile';
import { rafThrottle } from '../../lib/rafThrottle';
import {
  invalidateMenuCharacterGeometry,
  measureMenuCharacterGeometry,
} from '../../lib/menuCharacterGeometry';
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
import {
  getVisualActivity,
  getVisualQuality,
  shouldRunAmbientAnimations,
  shouldRunPageAmbientAnimations,
} from '../../lib/visualActivity';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { usePageShellReveal } from '../../hooks/usePageShellReveal';
import { useMainMenuBootPreload } from '../../hooks/useMainMenuBootPreload';
import { MEMORANDUM_CATEGORIES, type MemorandumData } from '../../lib/memorandum';
import type {
  PerformanceDebugDetails,
  PortfolioPerformanceDebug,
} from '../../lib/performanceDebug';

type AppState = 'preloading' | 'entry' | 'idle' | 'entering-page' | 'page-active' | 'exiting-page';
type PageId = AppPageId | null;
type CursorStyle = 'default' | 'metaphor';
type TransitionPhase = 'menu' | 'entering-page' | 'page-active' | 'exiting-page';

interface PageTransitionOptions {
  fromPopState?: boolean;
  playSound?: boolean;
}

interface MainMenuProps {
  initialPathname: string;
}

const EMPTY_MEMORANDUM_DATA: MemorandumData = {
  columns: MEMORANDUM_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, entries: [] })),
  totalEntries: 0,
  defaultColumnId: 'tech',
};

function beginPerformanceSpan(name: string, details?: PerformanceDebugDetails): string | null {
  if (typeof window === 'undefined') return null;
  return window.__portfolioPerf?.begin(name, details) ?? null;
}

function endPerformanceSpan(token: string | null, details?: PerformanceDebugDetails): void {
  if (typeof window === 'undefined') return;
  window.__portfolioPerf?.end(token, details);
}

function markPerformanceEvent(name: string, details?: PerformanceDebugDetails): void {
  if (typeof window === 'undefined') return;
  window.__portfolioPerf?.mark(name, details);
}

const loadedPageComponents = new Set<AppPageId>();

function createPageComponentLoader<T>(pageId: AppPageId, loader: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  let loadedModule: T | null = null;

  return {
    load: () => {
      if (!promise) {
        const perfToken = beginPerformanceSpan('page-module-load', { pageId });
        promise = loader().then(
          (module) => {
            loadedModule = module;
            loadedPageComponents.add(pageId);
            endPerformanceSpan(perfToken, { pageId, success: true });
            return module;
          },
          (error: unknown) => {
            endPerformanceSpan(perfToken, { pageId, success: false });
            throw error;
          },
        );
      }
      return promise;
    },
    getLoadedModule: () => loadedModule,
  };
}

const PAGE_COMPONENT_MODULES = {
  about: createPageComponentLoader('about', () => import('../pages/AboutPage')),
  skills: createPageComponentLoader('skills', () => import('../pages/SkillsPage')),
  experience: createPageComponentLoader('experience', () => import('../pages/ExperiencePage')),
  contact: createPageComponentLoader('contact', () => import('../pages/ContactPage')),
  memorandum: createPageComponentLoader('memorandum', () => import('../pages/MemorandumPage')),
  system: createPageComponentLoader('system', () => import('../pages/SystemPage')),
} as const;

const PAGE_COMPONENT_LOADERS = {
  about: PAGE_COMPONENT_MODULES.about.load,
  skills: PAGE_COMPONENT_MODULES.skills.load,
  experience: PAGE_COMPONENT_MODULES.experience.load,
  contact: PAGE_COMPONENT_MODULES.contact.load,
  memorandum: PAGE_COMPONENT_MODULES.memorandum.load,
  system: PAGE_COMPONENT_MODULES.system.load,
} as const;

const LazyAboutPage = lazy(PAGE_COMPONENT_LOADERS.about);
const LazySkillsPage = lazy(PAGE_COMPONENT_LOADERS.skills);
const LazyExperiencePage = lazy(PAGE_COMPONENT_LOADERS.experience);
const LazyContactPage = lazy(PAGE_COMPONENT_LOADERS.contact);
const LazyMemorandumPage = lazy(PAGE_COMPONENT_LOADERS.memorandum);
const LazySystemPage = lazy(PAGE_COMPONENT_LOADERS.system);

const MENU_SELECTED_OFFSET_VH = 1;
const MENU_BELOW_SELECTED_OFFSET_VH = 2;
const TOUCH_INPUT_GRACE_MS = 800;
const MENU_TOUCH_STEP_VH = 4.5;
const MENU_TOUCH_DIRECTION_LOCK_PX = 10;
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

const DEFAULT_CLIENT_PREFERENCES: ClientPreferences = {
  animationsEnabled: true,
  cursorStyle: 'metaphor',
  bgInverted: false,
  soundEnabled: true,
};

function setIfPresent(targets: gsap.TweenTarget, vars: gsap.TweenVars): void {
  const elements = gsap.utils
    .toArray(targets)
    .filter((target): target is Element => target instanceof Element);
  if (!elements.length) return;
  gsap.set(elements, vars);
}

function setDirectPageInitialStates(container: Element): void {
  setIfPresent(container.querySelectorAll('[data-char]'), { x: 0, y: 0, opacity: 0 });
  setIfPresent(container.querySelector('[data-menu-left]'), { x: 0, opacity: 0 });
  setIfPresent(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-paint-splash-wrap]'), {
    opacity: 0,
    xPercent: 0,
  });
  setIfPresent(container.querySelector('[data-paint-splash-wipe-content]'), { xPercent: 0 });
  setIfPresent(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-control-hints-fixed]'), { y: '1vh', opacity: 0 });
  setIfPresent(container.querySelector('[data-portrait-wrap]'), { opacity: 0 });
}

function clearBootMode() {
  if (typeof document === 'undefined') return;
  delete document.documentElement.dataset.bootMode;
}

function getMenuItemWrapOffsetYVh(index: number, selectedIndex: number) {
  if (index === selectedIndex) return MENU_SELECTED_OFFSET_VH;
  if (index > selectedIndex) return MENU_BELOW_SELECTED_OFFSET_VH;
  return 0;
}

function scaleVhSpacing(value: string | undefined, factor: number) {
  if (!value) return value;
  if (!value.endsWith('vh')) return value;
  return `${parseFloat(value) * factor}vh`;
}

function getMenuTouchStepPx() {
  if (typeof window === 'undefined') return 34;
  return Math.max(window.innerHeight * (MENU_TOUCH_STEP_VH / 100), 24);
}

function getResponsiveMenuItemSpacing(
  item: (typeof MENU_ITEMS)[number],
  layoutMode: 'desktop' | 'tablet' | 'compact',
) {
  if (layoutMode === 'compact') {
    const compactMarginBottom: Record<(typeof MENU_ITEMS)[number]['id'], string> = {
      about: '0',
      skills: '1vh',
      experience: '1vh',
      contact: '3vh',
      memorandum: '2vh',
      system: '0',
    };

    return {
      marginBottom: compactMarginBottom[item.id],
      marginTop: item.marginTop,
    };
  }

  const factor = 1;
  let marginBottom = scaleVhSpacing(item.marginBottom, factor) ?? item.marginBottom;
  const marginTop = scaleVhSpacing(item.marginTop, factor) ?? item.marginTop;

  if (item.id === 'memorandum') {
    marginBottom = layoutMode === 'compact'
      ? '-7vh'
      : layoutMode === 'tablet'
        ? '-7vh'
        : '-7vh';
  }

  return { marginBottom, marginTop };
}

function readClientPreferences(): ClientPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_CLIENT_PREFERENCES;
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

export default function MainMenu({ initialPathname }: MainMenuProps) {
  const [memorandumData, setMemorandumData] = useState<MemorandumData | null>(null);
  const effectiveMemorandumData = memorandumData ?? EMPTY_MEMORANDUM_DATA;
  const initialNormalizedPathRef = useRef(normalizePathname(initialPathname));
  const initialTargetPathRef = useRef(
    initialNormalizedPathRef.current
  );
  const initialClientPreferencesRef = useRef(DEFAULT_CLIENT_PREFERENCES);
  const initialTargetRouteRef = useRef(
    resolveAppRoute(initialTargetPathRef.current, effectiveMemorandumData)
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
  const [clientReady, setClientReady] = useState(false);
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
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
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
  const [touchSplashEffectIndex, setTouchSplashEffectIndex] = useState(initialSelectedIndex);
  const [touchSelectionEffectsSuspended, setTouchSelectionEffectsSuspended] = useState(false);
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
  const menuScrollViewportRef = useRef<HTMLDivElement>(null);
  const menuScrollOverlayRef = useRef<HTMLDivElement>(null);
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const splashHandleRef = useRef<MenuSplashHandle | null>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const indexAnimTlRef = useRef<gsap.core.Timeline | null>(null);
  const letterPulseTlRef = useRef<gsap.core.Timeline | null>(null);
  const pageTlRef = useRef<gsap.core.Timeline | null>(null);
  const menuGeometryKeyRef = useRef<string | null>(null);
  const menuEntryPerfTokenRef = useRef<string | null>(null);
  const pageEnterPerfTokenRef = useRef<string | null>(null);
  const pageExitPerfTokenRef = useRef<string | null>(null);
  const controlHintsRevealTweenRef = useRef<gsap.core.Tween | null>(null);
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
  const lastTouchInputAt = useRef(0);
  const lastPointerTypeRef = useRef<'mouse' | 'touch' | 'pen' | null>(null);
  const lastPointerDownAtRef = useRef(0);
  const menuTouchStartYRef = useRef<number | null>(null);
  const menuTouchStartXRef = useRef<number | null>(null);
  const menuTouchStartIndexRef = useRef<number | null>(null);
  const menuTouchNavigatedRef = useRef(false);
  const menuTouchAxisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const menuTouchSuppressClickUntilRef = useRef(0);
  const menuTouchSelectionActiveRef = useRef(false);
  const menuTouchLastSelectionAtRef = useRef(0);
  const menuTouchSettleDelayRef = useRef<gsap.core.Tween | null>(null);
  const menuTouchPendingIndexRef = useRef<number | null>(null);
  const menuTouchSelectionRafRef = useRef<number | null>(null);
  const viewportProfile = useViewportProfile();

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('perf') !== '1') return;

    let disposed = false;
    let debugApi: PortfolioPerformanceDebug | null = null;
    void import('../../lib/performanceDebug').then(({ startPerformanceDebug }) => {
      if (disposed) return;
      debugApi = startPerformanceDebug();
    });

    return () => {
      disposed = true;
      debugApi?.stop();
      if (window.__portfolioPerf === debugApi) {
        delete window.__portfolioPerf;
      }
    };
  }, []);

  const {
    cancelPendingPageShellReveal,
    revealPageShellSoon,
  } = usePageShellReveal(containerRef);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    return () => {
      controlHintsRevealTweenRef.current?.kill();
      controlHintsRevealTweenRef.current = null;
      letterPulseTlRef.current?.kill();
      letterPulseTlRef.current = null;
      menuTouchSettleDelayRef.current?.kill();
      menuTouchSettleDelayRef.current = null;
      if (menuTouchSelectionRafRef.current !== null) {
        cancelAnimationFrame(menuTouchSelectionRafRef.current);
        menuTouchSelectionRafRef.current = null;
      }
    };
  }, []);

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
      controlHintsRevealTweenRef.current?.kill();
      controlHintsRevealTweenRef.current = gsap.to(
        containerRef.current.querySelector('[data-control-hints-fixed]'),
        { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }
      );
    }
    setAppState('page-active');
  }, []);

  const playSoundEffect = useSoundEffects(soundEnabled, appState);

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

  const selectMenuIndex = useCallback((
    nextIndex: number,
    options?: { playSound?: boolean; prefetch?: boolean },
  ) => {
    const normalizedIndex = ((nextIndex % MENU_ITEMS.length) + MENU_ITEMS.length) % MENU_ITEMS.length;
    const changed = selectedIndexRef.current !== normalizedIndex;
    selectedIndexRef.current = normalizedIndex;
    setSelectedIndex(normalizedIndex);

    if (appStateRef.current === 'idle' && options?.prefetch !== false) {
      const pageId = MENU_ITEMS[normalizedIndex].id as AppPageId;
      void PAGE_COMPONENT_LOADERS[pageId]?.();
    }

    if (changed) {
      markPerformanceEvent('menu-selection', {
        pageId: MENU_ITEMS[normalizedIndex].id,
        inputSound: options?.playSound !== false,
      });
    }

    if (changed && options?.playSound !== false) {
      playSoundEffect('switch');
    }

    return changed;
  }, [playSoundEffect]);

  const playMenuLetterPulse = useCallback(() => {
    letterPulseTlRef.current?.kill();
    letterPulseTlRef.current = null;
    const menuItems = itemRefs.current.filter((item): item is HTMLDivElement => item !== null);
    letterPulseTlRef.current = createMenuLetterPulseTimeline(menuItems);
  }, []);

  const beginMenuTouchSelection = useCallback(() => {
    if (menuTouchSelectionActiveRef.current) return;

    menuTouchSettleDelayRef.current?.kill();
    menuTouchSettleDelayRef.current = null;
    menuTouchSelectionActiveRef.current = true;
    setTouchSplashEffectIndex(selectedIndexRef.current);
    setTouchSelectionEffectsSuspended(true);
    splashHandleRef.current?.pauseAmbient();
    letterPulseTlRef.current?.kill();
    letterPulseTlRef.current = null;
  }, []);

  const applyMenuTouchSelection = useCallback((nextIndex: number) => {
    if (nextIndex === selectedIndexRef.current) return;

    beginMenuTouchSelection();
    if (selectMenuIndex(nextIndex, { prefetch: false })) {
      menuTouchLastSelectionAtRef.current = performance.now();
    }
  }, [beginMenuTouchSelection, selectMenuIndex]);

  const queueMenuTouchSelection = useCallback((nextIndex: number) => {
    menuTouchPendingIndexRef.current = nextIndex;
    if (menuTouchSelectionRafRef.current !== null) return;

    menuTouchSelectionRafRef.current = requestAnimationFrame(() => {
      menuTouchSelectionRafRef.current = null;
      const pendingIndex = menuTouchPendingIndexRef.current;
      menuTouchPendingIndexRef.current = null;
      if (pendingIndex !== null) {
        applyMenuTouchSelection(pendingIndex);
      }
    });
  }, [applyMenuTouchSelection]);

  const flushMenuTouchSelection = useCallback(() => {
    if (menuTouchSelectionRafRef.current !== null) {
      cancelAnimationFrame(menuTouchSelectionRafRef.current);
      menuTouchSelectionRafRef.current = null;
    }

    const pendingIndex = menuTouchPendingIndexRef.current;
    menuTouchPendingIndexRef.current = null;
    if (pendingIndex !== null) {
      applyMenuTouchSelection(pendingIndex);
    }
  }, [applyMenuTouchSelection]);

  const finishMenuTouchSelection = useCallback((didNavigate: boolean) => {
    if (!menuTouchSelectionActiveRef.current) return;

    menuTouchSelectionActiveRef.current = false;
    menuTouchSettleDelayRef.current?.kill();

    const elapsedSeconds = (performance.now() - menuTouchLastSelectionAtRef.current) / 1000;
    const settleDelaySeconds = didNavigate && animationsEnabled
      ? Math.max(0, 0.2 - elapsedSeconds)
      : 0;

    menuTouchSettleDelayRef.current = gsap.delayedCall(settleDelaySeconds, () => {
      menuTouchSettleDelayRef.current = null;
      const finalIndex = selectedIndexRef.current;
      setTouchSplashEffectIndex(finalIndex);
      setTouchSelectionEffectsSuspended(false);

      if (!didNavigate) return;

      const pageId = MENU_ITEMS[finalIndex].id as AppPageId;
      void PAGE_COMPONENT_LOADERS[pageId]?.();
      setSplashMeasureKey((key) => key + 1);

      const container = containerRef.current;
      if (container) {
        invalidateMenuCharacterGeometry(container);
        measureMenuCharacterGeometry(container);
      }

      if (animationsEnabled) {
        playMenuLetterPulse();
      }
    });
  }, [animationsEnabled, playMenuLetterPulse]);

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
    const nextRoute = resolveAppRoute(nextPath, effectiveMemorandumData);
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

  useMainMenuBootPreload({
    animationsEnabled,
    appState,
    appStateRef,
    activePageRef,
    emptyMemorandumData: EMPTY_MEMORANDUM_DATA,
    effectiveMemorandumData,
    initialNormalizedPathRef,
    initialTargetRouteRef,
    setAppState,
    setMemorandumData,
    shouldMountPageDirectOnLoadRef,
  });

  useLayoutEffect(() => {
    const preferences = readClientPreferences();
    setAnimationsEnabled(preferences.animationsEnabled);
    setCursorStyle(preferences.cursorStyle);
    setBgInverted(preferences.bgInverted);
    setSoundEnabled(preferences.soundEnabled);
    setPreferencesReady(true);
  }, []);

  const cursorActive = cursorStyle === 'metaphor' &&
    supportsHoverPointer &&
    inputMode === 'mouse';

  useEffect(() => {
    document.body.classList.toggle('cursor-metaphor', cursorActive);
    return () => {
      document.body.classList.remove('cursor-metaphor');
    };
  }, [cursorActive]);

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

    const initialRoute = resolveAppRoute(currentLocationPath, effectiveMemorandumData);
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

    menuEntryPerfTokenRef.current = beginPerformanceSpan('menu-entry');
    entryTlRef.current = createEntryTimeline(
      containerRef.current,
      () => {
        endPerformanceSpan(menuEntryPerfTokenRef.current);
        menuEntryPerfTokenRef.current = null;
        if (containerRef.current) measureMenuCharacterGeometry(containerRef.current);
        setAppState('idle');
      },
      () => setSubtitleVisible(true)
    );

    return () => {
      endPerformanceSpan(menuEntryPerfTokenRef.current, { interrupted: true });
      menuEntryPerfTokenRef.current = null;
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, [appState, animationsEnabled, activePage]);

  useEffect(() => {
    if (!activePage || appState !== 'entering-page') return;
    markPerformanceEvent('page-content-committed', { pageId: activePage });
  }, [activePage, appState]);

  useEffect(() => {
    if (appState !== 'idle') return;
    if (menuTouchSelectionActiveRef.current) return;

    const selectedPageId = MENU_ITEMS[selectedIndex].id as AppPageId;
    void PAGE_COMPONENT_LOADERS[selectedPageId]();

    if (viewportProfile.layoutMode === 'compact' && viewportProfile.shouldUseTouchNav) {
      return;
    }

    const idleWindow = window as IdleWindow;
    const preloadRemainingPages = () => {
      APP_PAGE_IDS.forEach((pageId) => {
        if (pageId !== selectedPageId) {
          void PAGE_COMPONENT_LOADERS[pageId]();
        }
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleCallbackId = idleWindow.requestIdleCallback(preloadRemainingPages, { timeout: 1000 });
      return () => idleWindow.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = window.setTimeout(preloadRemainingPages, 250);
    return () => window.clearTimeout(timeoutId);
  }, [appState, selectedIndex, viewportProfile.layoutMode, viewportProfile.shouldUseTouchNav]);

  useLayoutEffect(() => {
    const inactiveVerticalMotionTarget = viewportProfile.layoutMode === 'compact'
      ? menuLeftRef.current
      : menuScrollOverlayRef.current;

    if (!inactiveVerticalMotionTarget) return;
    gsap.killTweensOf(inactiveVerticalMotionTarget, 'y');
    gsap.set(inactiveVerticalMotionTarget, { y: 0 });
  }, [viewportProfile.layoutMode]);

  // Smooth scroll + index fade when selectedIndex changes
  useEffect(() => {
    const prevIdx = prevSelectedIndexRef.current;
    prevSelectedIndexRef.current = selectedIndex;
    const changed = prevIdx !== selectedIndex && appState === 'idle' && animationsEnabled;
    const newY = `${(2.5 - selectedIndex) * 1.5}vh`;

    splashHandleRef.current?.moveToSelection();

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

    const menuVerticalMotionTarget = viewportProfile.layoutMode === 'compact'
      ? menuScrollOverlayRef.current
      : menuLeftRef.current;

    if (menuVerticalMotionTarget) {
      if (changed) {
        gsap.to(menuVerticalMotionTarget, {
          y: newY,
          duration: 0.2,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else {
        gsap.killTweensOf(menuVerticalMotionTarget, 'y');
        gsap.set(menuVerticalMotionTarget, { y: newY });
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

    letterPulseTlRef.current?.kill();
    letterPulseTlRef.current = null;
    if (changed && !menuTouchSelectionActiveRef.current) {
      playMenuLetterPulse();
    }
  }, [selectedIndex, appState, animationsEnabled, viewportProfile.layoutMode, playMenuLetterPulse]);

  useEffect(() => {
    const container = containerRef.current;
    if (appState !== 'idle' || !container) return;
    if (menuTouchSelectionActiveRef.current) return;

    const geometryKey = [
      selectedIndex,
      viewportProfile.layoutMode,
      viewportProfile.orientation,
    ].join(':');
    const keyChanged = menuGeometryKeyRef.current !== null && menuGeometryKeyRef.current !== geometryKey;
    menuGeometryKeyRef.current = geometryKey;
    if (keyChanged) invalidateMenuCharacterGeometry(container);
    if (!keyChanged && container.dataset.menuGeometryCache === 'ready') return;

    const measurement = gsap.delayedCall(keyChanged && animationsEnabled ? 0.4 : 0, () => {
      if (appStateRef.current === 'idle') measureMenuCharacterGeometry(container);
    });

    return () => measurement.kill();
  }, [appState, animationsEnabled, selectedIndex, viewportProfile.layoutMode, viewportProfile.orientation]);

  useEffect(() => {
    let pendingMeasurement: gsap.core.Tween | null = null;
    let cancelled = false;
    const scheduleMeasurement = () => {
      const container = containerRef.current;
      if (!container || appStateRef.current !== 'idle') return;

      invalidateMenuCharacterGeometry(container);
      pendingMeasurement?.kill();
      pendingMeasurement = gsap.delayedCall(0.22, () => {
        if (!cancelled && appStateRef.current === 'idle') {
          measureMenuCharacterGeometry(container);
        }
      });
    };

    void document.fonts.ready.then(() => {
      if (containerRef.current?.dataset.menuGeometryCache !== 'ready') {
        scheduleMeasurement();
      }
    });
    window.addEventListener('resize', scheduleMeasurement);

    return () => {
      cancelled = true;
      pendingMeasurement?.kill();
      window.removeEventListener('resize', scheduleMeasurement);
    };
  }, []);

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
    setSplashMeasureKey((key) => key + 1);
  }, [viewportProfile.layoutMode, viewportProfile.orientation]);

  useEffect(() => {
    if (appState === 'page-active' && activePage) {
      const pendingPath = pendingLocationPageRef.current;
      const resolvedCurrentRoute = resolveAppRoute(currentLocationPath, effectiveMemorandumData);
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

      const destinationRoute = resolveAppRoute(destinationPath, effectiveMemorandumData);
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

    const pageId = resolveAppRoute(pendingPath, effectiveMemorandumData).pageId ?? null;
    if (!pageId) return;
    enterPage(pageId, { fromPopState: true });
  }, [appState, activePage, currentLocationPath, enterPage, memorandumData]);

  useEffect(() => {
    if (
      appState === 'page-active' &&
      activePage &&
      resolveAppRoute(pendingLocationPageRef.current ?? '/', effectiveMemorandumData).pageId === activePage
    ) {
      pendingLocationPageRef.current = null;
      return;
    }

    if (appState === 'idle' && !activePage && getCurrentPathname() === '/') {
      pendingLocationPageRef.current = null;
    }
  }, [appState, activePage, memorandumData]);

  // When memorandum data first loads, re-resolve the current URL. Handles direct deep links
  // to memorandum entries: the initial resolve used empty data and fell back to /memorandum,
  // so now we can navigate to the correct entry.
  const memoDataPrevRef = useRef<MemorandumData | null>(null);
  useEffect(() => {
    if (!memorandumData || memoDataPrevRef.current) return;
    memoDataPrevRef.current = memorandumData;

    const actualPath = getCurrentPathname();
    const resolvedRoute = resolveAppRoute(actualPath, memorandumData);
    if (resolvedRoute.pageId === 'memorandum' && resolvedRoute.pathname !== currentLocationPath) {
      setCurrentLocationPath(resolvedRoute.pathname);
    }
  }, [memorandumData, currentLocationPath]);

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
  const visualActivity = getVisualActivity(appState, animationsEnabled);
  const visualQuality = getVisualQuality(animationsEnabled);
  const ambientAnimationsEnabled = shouldRunAmbientAnimations(visualActivity);
  const pageAmbientAnimationsEnabled = shouldRunPageAmbientAnimations(visualActivity);
  const splashAmbientAnimationsEnabled = ambientAnimationsEnabled && !touchSelectionEffectsSuspended;
  const splashEffectIndex = touchSelectionEffectsSuspended
    ? touchSplashEffectIndex
    : selectedIndex;

  useEffect(() => {
    if (ambientAnimationsEnabled) {
      splashHandleRef.current?.resumeAmbient();
      return;
    }

    splashHandleRef.current?.pauseAmbient();
  }, [ambientAnimationsEnabled]);

  useEffect(() => {
    splashHandleRef.current?.measureNow();
  }, [splashMeasureKey, viewportProfile.layoutMode, viewportProfile.orientation]);

  const pageVisible = appState === 'page-active' ||
    appState === 'exiting-page' ||
    (appState === 'entering-page' && initialDirectPageEntryInProgressRef.current);
  const directPageEntryCompleteHandler = appState === 'entering-page' &&
    initialDirectPageEntryInProgressRef.current
    ? handleDirectPageEntryComplete
    : undefined;
  const shouldRenderPageShell = Boolean(activePage) && appState !== 'preloading';

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

    endPerformanceSpan(pageEnterPerfTokenRef.current, { interrupted: true });
    pageEnterPerfTokenRef.current = beginPerformanceSpan('page-enter', {
      pageId,
      moduleReady: loadedPageComponents.has(pageId),
      animationsEnabled,
    });
    if (playSound) playSoundEffect('enter');

    const nextPath = buildPagePath(pageId);
    const resolvedPath = fromPopState
      ? resolveAppRoute(
          pendingLocationPageRef.current ?? currentLocationPathRef.current,
          effectiveMemorandumData
        ).pathname
      : nextPath;

    if (!fromPopState) {
      pushPathname(nextPath);
    }
    setCurrentLocationPath(resolvedPath);
    cancelPendingPageShellReveal();
    splashHandleRef.current?.pauseAmbient();
    pageTlRef.current?.kill();
    const pageComponentPromise = PAGE_COMPONENT_LOADERS[pageId]();

    if (!animationsEnabled) {
      setSubtitleVisible(false);
      activePageRef.current = pageId;
      appStateRef.current = 'page-active';
      transitionPhaseRef.current = 'page-active';
      setActivePage(pageId);
      setHintsPage(pageId);
      setHintsMode('page');
      setAppState('page-active');
      splashHandleRef.current?.measureNow();
      endPerformanceSpan(pageEnterPerfTokenRef.current, { pageId });
      pageEnterPerfTokenRef.current = null;
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
        endPerformanceSpan(pageEnterPerfTokenRef.current, { pageId });
        pageEnterPerfTokenRef.current = null;
      },
      () => setHintsMode('page'),
      () => {
        markPerformanceEvent('page-mount-requested', {
          pageId,
          moduleReady: loadedPageComponents.has(pageId),
        });
        activePageRef.current = pageId;
        setActivePage(pageId);
      },
      () => setSubtitleVisible(false),
      revealPageShellSoon,
      {
        promise: pageComponentPromise,
        isReady: () => loadedPageComponents.has(pageId),
      },
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
    endPerformanceSpan(pageExitPerfTokenRef.current, { interrupted: true });
    pageExitPerfTokenRef.current = beginPerformanceSpan('page-exit', {
      pageId: currentActivePage,
      animationsEnabled,
    });
    const pendingLocationPath = pendingLocationPageRef.current;
    const shouldPreserveLocationPath = fromPopState || (
      Boolean(pendingLocationPath) &&
      resolveAppRoute(pendingLocationPath!, effectiveMemorandumData).pageId !== currentActivePage
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
        gsap.set(c.querySelector('[data-paint-splash-wrap]'),   { opacity: 1, xPercent: 0 });
        gsap.set(c.querySelector('[data-paint-splash-wipe-content]'), { xPercent: 0 });
        gsap.set(c.querySelector('[data-control-hints-fixed]'), { y: 0, opacity: 1 });
        gsap.set(c.querySelector('[data-portrait-wrap]'),       { y: 0, opacity: 1 });
        gsap.set(c.querySelectorAll('[data-char]'),             { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 });
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
      splashHandleRef.current?.measureNow();
      splashHandleRef.current?.resetAmbient();
      queueHoveredMenuItemSelectionSync();
      endPerformanceSpan(pageExitPerfTokenRef.current, { pageId: currentActivePage });
      pageExitPerfTokenRef.current = null;
      return;
    }

    setSubtitleVisible(false);
    setAppState('exiting-page');
    setSplashMeasureKey(k => k + 1);
    splashHandleRef.current?.measureNow();
    splashHandleRef.current?.resetAmbient();
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
        splashHandleRef.current?.measureNow();
        queueHoveredMenuItemSelectionSync();
        endPerformanceSpan(pageExitPerfTokenRef.current, { pageId: currentActivePage });
        pageExitPerfTokenRef.current = null;
      },
      () => setSubtitleVisible(true),
      () => setHintsMode('menu'),
    );
  }

  useEffect(() => {
    enterPageRef.current = enterPage;
    exitPageRef.current = exitPage;
  }, [enterPage, exitPage]);

  const pageAnimationState =
    appState === 'entering-page'
      ? 'entering-page'
      : appState === 'exiting-page'
        ? 'exiting-page'
        : 'page-active';
  const shouldShowLoadingScreen = appState === 'preloading';
  const initialEntryDelaySeconds = 0;
  const AboutPage = PAGE_COMPONENT_MODULES.about.getLoadedModule()?.default ?? LazyAboutPage;
  const SkillsPage = PAGE_COMPONENT_MODULES.skills.getLoadedModule()?.default ?? LazySkillsPage;
  const ExperiencePage = PAGE_COMPONENT_MODULES.experience.getLoadedModule()?.default ?? LazyExperiencePage;
  const ContactPage = PAGE_COMPONENT_MODULES.contact.getLoadedModule()?.default ?? LazyContactPage;
  const MemorandumPage = PAGE_COMPONENT_MODULES.memorandum.getLoadedModule()?.default ?? LazyMemorandumPage;
  const SystemPage = PAGE_COMPONENT_MODULES.system.getLoadedModule()?.default ?? LazySystemPage;
  const activePageInner = activePage === 'about' ? (
    <AboutPage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
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
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'experience' ? (
    <ExperiencePage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'contact' ? (
    <ContactPage
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
      initialEntryDelaySeconds={initialEntryDelaySeconds}
      pageState={pageAnimationState}
      registerNavigation={setPageNavigation}
      playSoundEffect={playSoundEffect}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : activePage === 'memorandum' ? (
    <MemorandumPage
      memorandumData={effectiveMemorandumData}
      isActive={appState === 'page-active'}
      animationsEnabled={animationsEnabled}
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
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
      ambientAnimationsEnabled={pageAmbientAnimationsEnabled}
      onAnimationsToggle={handleAnimationsToggle}
      soundEnabled={soundEnabled}
      onSoundToggle={handleSoundToggle}
      registerNavigation={setPageNavigation}
      playSoundEffect={playSoundEffect}
      onEntryAnimationComplete={directPageEntryCompleteHandler}
    />
  ) : null;
  const activePageContent = activePageInner ? (
    <Suspense fallback={null}>
      {activePageInner}
    </Suspense>
  ) : null;

  return (
    <>
    {shouldShowLoadingScreen && <LoadingScreen animateBar={appState === 'preloading'} />}
    <CustomCursor visible={cursorActive} />
    <div
      ref={containerRef}
      data-app-root
      data-app-state={appState}
      data-active-page={activePage ?? 'none'}
      data-selected-menu-item={activeItem.id}
      data-animations-enabled={animationsEnabled ? 'true' : 'false'}
      data-client-ready={clientReady ? 'true' : 'false'}
      data-visual-activity={visualActivity}
      data-visual-quality={visualQuality}
      data-root-ambient={ambientAnimationsEnabled ? 'running' : 'paused'}
      data-menu-touch-effects={touchSelectionEffectsSuspended ? 'suspended' : 'active'}
      data-layout-mode={viewportProfile.layoutMode}
      data-orientation={viewportProfile.orientation}
      className={`menu-root${inputMode === 'keyboard' ? ' keyboard-mode' : ''}`}
      onTouchStart={(event) => {
        if (!viewportProfile.shouldUseTouchNav || appState !== 'idle') return;
        menuTouchAxisRef.current = null;
        const touch = event.touches[0];
        menuTouchStartYRef.current = touch.clientY;
        menuTouchStartXRef.current = touch.clientX;
        menuTouchStartIndexRef.current = selectedIndexRef.current;
        menuTouchNavigatedRef.current = false;
        menuTouchPendingIndexRef.current = null;
      }}
      onTouchMove={(event) => {
        if (!viewportProfile.shouldUseTouchNav || appState !== 'idle') return;
        if (
          menuTouchStartYRef.current === null ||
          menuTouchStartXRef.current === null ||
          menuTouchStartIndexRef.current === null
        ) return;

        const touch = event.touches[0];
        const deltaY = touch.clientY - menuTouchStartYRef.current;
        const deltaX = touch.clientX - menuTouchStartXRef.current;
        const absDeltaY = Math.abs(deltaY);
        const absDeltaX = Math.abs(deltaX);
        const touchStepPx = getMenuTouchStepPx();

        if (!menuTouchAxisRef.current) {
          if (Math.max(absDeltaX, absDeltaY) < MENU_TOUCH_DIRECTION_LOCK_PX) return;
          if (absDeltaX === absDeltaY) return;
          menuTouchAxisRef.current = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
        }

        if (menuTouchAxisRef.current === 'horizontal') {
          return;
        }

        if (absDeltaY < touchStepPx) return;
        const indexDelta = Math.floor(absDeltaY / touchStepPx);
        if (indexDelta < 1) return;

        const startIndex = menuTouchStartIndexRef.current;
        const nextIndex = deltaY > 0
          ? Math.max(startIndex - indexDelta, 0)
          : Math.min(startIndex + indexDelta, MENU_ITEMS.length - 1);

        if (nextIndex !== startIndex) {
          menuTouchNavigatedRef.current = true;
        }
        menuTouchSuppressClickUntilRef.current = Date.now() + 250;
        lastTouchInputAt.current = Date.now();
        setInputMode('touch');
        queueMenuTouchSelection(nextIndex);
      }}
      onTouchEnd={() => {
        flushMenuTouchSelection();
        finishMenuTouchSelection(menuTouchNavigatedRef.current);
        menuTouchStartYRef.current = null;
        menuTouchStartXRef.current = null;
        menuTouchStartIndexRef.current = null;
        menuTouchNavigatedRef.current = false;
        menuTouchAxisRef.current = null;
      }}
      onTouchCancel={() => {
        flushMenuTouchSelection();
        finishMenuTouchSelection(menuTouchNavigatedRef.current);
        menuTouchStartYRef.current = null;
        menuTouchStartXRef.current = null;
        menuTouchStartIndexRef.current = null;
        menuTouchNavigatedRef.current = false;
        menuTouchAxisRef.current = null;
      }}
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
        if (isTouchActivation && Date.now() < menuTouchSuppressClickUntilRef.current) {
          return;
        }

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
      style={{
        touchAction: viewportProfile.shouldUseTouchNav && appState === 'idle' ? 'manipulation' : 'auto',
      }}
    >
      <BackgroundLayers />
      <div
        data-portrait-wrap
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <CharacterPortrait animationsEnabled={ambientAnimationsEnabled} layoutMode={viewportProfile.layoutMode} />
      </div>
      <BackgroundLines animationsEnabled={ambientAnimationsEnabled} layoutMode={viewportProfile.layoutMode} />

      <div
        data-paint-splash-wrap
        data-splash-wipe-mode="transform"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          transformOrigin: 'right center',
          zIndex: 4,
        }}
      >
        <div
          data-paint-splash-wipe-content
          style={{ position: 'absolute', inset: 0, transformOrigin: 'right center' }}
        >
          <MenuItemBackground
            ref={splashHandleRef}
            itemRefs={itemRefs}
            menuStackRef={menuStackRef}
            menuScrollViewportRef={menuScrollViewportRef}
            selectedIndex={selectedIndex}
            effectIndex={splashEffectIndex}
            ambientAnimationsEnabled={splashAmbientAnimationsEnabled}
            accentH={activeItem.accentH}
            accentS={activeItem.accentS}
            accentL={activeItem.accentL}
            splashHeightVh={activeItem.splashHeightVh}
            compactSplashMinHeightVh={activeItem.compactSplashMinHeightVh}
            splashTipExtensionVh={activeItem.splashTipExtensionVh}
            splashOffsetY={activeItem.splashOffsetY}
            splashTipXPct={activeItem.splashTipXPct}
            splashTaperYPct={activeItem.splashTaperYPct}
            menuScrollYVh={(2.5 - selectedIndex) * 1.5}
            selectedItemOffsetYVh={getMenuItemWrapOffsetYVh(selectedIndex, selectedIndex)}
            measureKey={splashMeasureKey}
            layoutMode={viewportProfile.layoutMode}
          />
        </div>
      </div>

      <div ref={menuLeftRef} className="menu-left" data-menu-left>
        <div className="menu-splash-wrap">
          <div
            ref={menuScrollViewportRef}
            className="menu-scroll-viewport"
            data-menu-scroll-viewport
          >
            <div
              className="menu-scroll-spacer"
              aria-hidden="true"
            />
          </div>
          <div
            ref={menuScrollOverlayRef}
            className="menu-scroll-overlay"
            data-menu-scroll-overlay
          >
            <div
              ref={menuStackRef}
              className={`menu-stack${viewportProfile.layoutMode === 'compact' ? ' menu-stack-compact' : ''}`}
            >
              {MENU_ITEMS.map((item, i) => {
                const spacing = getResponsiveMenuItemSpacing(item, viewportProfile.layoutMode);
                return (
                  <div
                    key={item.id}
                    data-menu-item-target={item.id}
                    data-menu-item-wrap
                    ref={(el) => { itemWrapRefs.current[i] = el; }}
                    style={{
                      marginBottom: spacing.marginBottom,
                      marginTop: spacing.marginTop,
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
                      layoutMode={viewportProfile.layoutMode}
                      onMouseEnter={handleMenuItemMouseEnter}
                    />
                  </div>
                );
              })}
            </div>
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
        <MenuIndex index={MENU_ITEMS[displayIndex].index} layoutMode={viewportProfile.layoutMode} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath,
            pointerEvents: 'none',
          }}
        >
          <MenuIndex
            index={MENU_ITEMS[displayIndex].index}
            textColor={COLORS.accentRed}
            layoutMode={viewportProfile.layoutMode}
          />
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
        <StatsPanel layoutMode={viewportProfile.layoutMode} />
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
         layoutMode={viewportProfile.layoutMode}
          touchMode={viewportProfile.shouldUseTouchNav}
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

      {shouldRenderPageShell && (
        <div
          data-page-shell
          data-page-id={activePage ?? undefined}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 11,
            opacity: pageVisible ? 1 : 0,
            isolation: 'isolate',
            pointerEvents: appState === 'page-active' ? 'auto' : 'none',
          }}
      >
          {activePageContent}
        </div>
      )}
    </div>
    </>
  );
}

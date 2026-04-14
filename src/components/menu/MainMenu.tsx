import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import {
  prefersReducedMotion,
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
import { rafThrottle } from '../../lib/rafThrottle';
import type { PageNavigationDirection, PageNavigationHandler } from '../../lib/pageNavigation';
import { SOUND_EFFECT_SOURCES, type PlaySoundEffect, type SoundEffectId } from '../../lib/soundEffects';
import AboutPage from '../pages/AboutPage';
import SkillsPage from '../pages/SkillsPage';
import ExperiencePage from '../pages/ExperiencePage';
import ContactPage from '../pages/ContactPage';
import MemorandumPage from '../pages/MemorandumPage';
import SystemPage from '../pages/SystemPage';
import type { MemorandumData } from '../../lib/memorandum';

type AppState = 'preloading' | 'entry' | 'idle' | 'entering-page' | 'page-active' | 'exiting-page';
type PageId = 'about' | 'skills' | 'experience' | 'contact' | 'memorandum' | 'system' | null;
type CursorStyle = 'default' | 'metaphor';

interface PageTransitionOptions {
  fromPopState?: boolean;
  playSound?: boolean;
}

interface MainMenuProps {
  memorandumData: MemorandumData;
}

const VALID_PAGE_IDS = new Set(['about', 'skills', 'experience', 'contact', 'memorandum', 'system']);
const MENU_SELECTED_OFFSET_VH = 1;
const MENU_BELOW_SELECTED_OFFSET_VH = 2;
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleWindow = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getHashValue() {
  return window.location.hash.replace(/^#/, '');
}

function getPageIdFromHash(hash: string): PageId {
  if (!hash) return null;
  const [pageId] = hash.split('/');
  return VALID_PAGE_IDS.has(pageId) ? (pageId as PageId) : null;
}

function clearPageHash() {
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
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

export default function MainMenu({ memorandumData }: MainMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('preloading');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
  const [unsupported, setUnsupported] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [activePage, setActivePage] = useState<PageId>(null);
  const [hintsPage, setHintsPage] = useState<PageId>(null);
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>('metaphor');
  const [bgInverted, setBgInverted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [splashMeasureKey, setSplashMeasureKey] = useState(0);
  const [hintsMode, setHintsMode] = useState<'menu' | 'page'>('menu');
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hintVariant, setHintVariant] = useState<'memorandum-detail' | undefined>(undefined);
  const [readMemorandumEntryIds, setReadMemorandumEntryIds] = useState<string[]>([]);
  const [currentLocationHash, setCurrentLocationHash] = useState(() =>
    typeof window === 'undefined' ? '' : getHashValue()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const menuIndexRef = useRef<HTMLDivElement>(null);
  const menuStackRef = useRef<HTMLDivElement>(null);
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const indexAnimTlRef = useRef<gsap.core.Timeline | null>(null);
  const pageTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevSelectedIndexRef = useRef(0);
  const selectedIndexRef = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollAt = useRef(0);
  const lastKeyNavAt = useRef(0);
  const initialHashChecked = useRef(false);
  const appStateRef = useRef<AppState>('preloading');
  const activePageRef = useRef<PageId>(null);
  const pendingLocationPageRef = useRef<string | null>(null);
  const soundRefs = useRef<Record<SoundEffectId, HTMLAudioElement | null>>({
    switch: null,
    enter: null,
    exit: null,
    toggle: null,
  });
  const soundWarmupStartedRef = useRef(false);
  const soundWarmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundWarmupIdleCallbackRef = useRef<number | null>(null);
  const enterPageRef = useRef<(pageId: string, options?: PageTransitionOptions) => void>(() => {});
  const exitPageRef = useRef<(options?: PageTransitionOptions) => void>(() => {});
  const pageNavigationRef = useRef<PageNavigationHandler | null>(null);
  const [inputMode, setInputMode] = useState<'keyboard' | 'mouse'>('mouse');
  const deferredImageWarmupStartedRef = useRef(false);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

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
    if (appState === 'idle' && Date.now() - lastKeyNavAt.current > 100) {
      setInputMode('mouse');
      selectMenuIndex(index);
    }
  }, [appState, selectMenuIndex]);

  useEffect(() => {
    const manifest = createAssetPreloadManifest(memorandumData);
    const preloadController = new AbortController();
    let cancelled = false;

    Promise.all([
      preloadImages(manifest.blockingImageSrcs, {
        concurrency: 4,
        signal: preloadController.signal,
      }),
      document.fonts.load('400 1em Cinzel'),
      document.fonts.load('700 1em Cinzel'),
      document.fonts.load('900 1em Cinzel'),
    ]).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => setAppState('entry')));
    });

    return () => {
      cancelled = true;
      preloadController.abort();
    };
  }, [memorandumData]);

  useEffect(() => {
    if (appState === 'preloading' || deferredImageWarmupStartedRef.current) return;

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

  // Initialized to true; corrected from OS preference on mount.
  // Safe to initialize this way since the menu is behind the loading screen.
  useEffect(() => {
    const stored = localStorage.getItem('animationsEnabled');
    setAnimationsEnabled(stored !== null ? stored === 'true' : !prefersReducedMotion());
    const storedCursor = localStorage.getItem('cursorStyle') as CursorStyle | null;
    if (storedCursor === 'default' || storedCursor === 'metaphor') setCursorStyle(storedCursor);
    setBgInverted(localStorage.getItem('bgInverted') === 'true');
    setSoundEnabled(localStorage.getItem('soundEnabled') !== 'false');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('cursor-metaphor', cursorStyle === 'metaphor');
  }, [cursorStyle]);

  useEffect(() => {
    document.body.classList.toggle('bg-inverted', bgInverted);
  }, [bgInverted]);

  // Set initial GSAP positions before the first paint of the menu.
  // If a valid hash is present on load, skip the entry animation and go straight to the page.
  useLayoutEffect(() => {
    if (appState !== 'entry' || !containerRef.current) return;

    const hashValue = getHashValue();
    const hashPageId = getPageIdFromHash(hashValue);
    if (hashPageId) {
      initialHashChecked.current = true;
      const container = containerRef.current;
      // Put menu elements in the same hidden state as after createPageEnterTimeline,
      // so createMenuReEntryTimeline works correctly if the user navigates back.
      gsap.set(container.querySelectorAll('[data-char]'), { x: 0, y: 0, opacity: 0 });
      gsap.set(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
      gsap.set(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0 });
      gsap.set(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
      const itemIndex = MENU_ITEMS.findIndex(item => item.id === hashPageId);
      if (itemIndex !== -1) selectMenuIndex(itemIndex, { playSound: false });
      setActivePage(hashPageId);
      setHintsPage(hashPageId);
      setHintsMode('page');
      setAppState('page-active');
      return;
    }

    if (!animationsEnabled) {
      setAppState('idle');
      setSubtitleVisible(true);
      return;
    }
    setEntryInitialStates(containerRef.current);
  }, [appState, animationsEnabled, selectMenuIndex]);

  // Start entry animation after initial states are applied.
  // activePage check guards against running when direct hash entry already switched state.
  useEffect(() => {
    if (appState !== 'entry' || !containerRef.current || !animationsEnabled || activePage) return;

    entryTlRef.current = createEntryTimeline(containerRef.current, () => setAppState('idle'), () => setSubtitleVisible(true));

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
    const onMove = () => {
      if (Date.now() - lastKeyNavAt.current < 600) return;
      setInputMode('mouse');
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

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
        enterPageRef.current(MENU_ITEMS[selectedIndexRef.current].id, { playSound: true });
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
      pageTlRef.current?.kill();
    };
  }, []);

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
      if (activePage === 'memorandum' && currentLocationHash && !currentLocationHash.startsWith('memorandum/')) {
        return;
      }

      const desiredHash = activePage === 'memorandum'
        ? (currentLocationHash && currentLocationHash.startsWith('memorandum/')
            ? currentLocationHash
            : `memorandum/${memorandumData.defaultColumnId}`)
        : activePage;
      const nextHash = `#${desiredHash}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(window.history.state, '', nextHash);
      }
      return;
    }

    if (appState === 'exiting-page' && window.location.hash) {
      if (pendingLocationPageRef.current) return;
      clearPageHash();
      return;
    }

    if (appState === 'idle' && !activePage && window.location.hash) {
      if (pendingLocationPageRef.current === getHashValue()) return;
      clearPageHash();
    }
  }, [appState, activePage, currentLocationHash]);

  // Auto-enter a page on first load if a valid hash is present
  useEffect(() => {
    if (appState !== 'idle' || initialHashChecked.current) return;
    initialHashChecked.current = true;
    const id = getPageIdFromHash(getHashValue());
    if (!id) return;
    const itemIndex = MENU_ITEMS.findIndex(item => item.id === id);
    if (itemIndex !== -1) selectMenuIndex(itemIndex, { playSound: false });
    // Small delay so the index animation can settle before entering
    const t = setTimeout(() => enterPage(id), 80);
    return () => clearTimeout(t);
  // enterPage is stable across renders (defined in component body without useCallback,
  // but all its dependencies are captured via closure at call time - safe to omit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, enterPage, selectMenuIndex]);

  // Keep the URL hash in sync with browser back/forward
  useEffect(() => {
    const syncPageWithLocation = () => {
      const hashValue = getHashValue();
      const nextPage = getPageIdFromHash(hashValue) as Exclude<PageId, null> | null;

      setCurrentLocationHash(hashValue);

      pendingLocationPageRef.current = hashValue || nextPage;

      if (nextPage) {
        const itemIndex = MENU_ITEMS.findIndex(item => item.id === nextPage);
        if (itemIndex !== -1) selectMenuIndex(itemIndex, { playSound: false });

        if (appStateRef.current === 'idle' && activePageRef.current !== nextPage) {
          enterPageRef.current(nextPage, { fromPopState: true });
          return;
        }

        if (appStateRef.current === 'page-active' && activePageRef.current !== nextPage) {
          if (activePageRef.current === 'memorandum') return;
          exitPageRef.current({ fromPopState: true });
        }
      } else {
        if (activePageRef.current && appStateRef.current === 'page-active') {
          if (activePageRef.current === 'memorandum') return;
          exitPageRef.current({ fromPopState: true });
        }
      }
    };

    window.addEventListener('popstate', syncPageWithLocation);
    window.addEventListener('hashchange', syncPageWithLocation);
    return () => {
      window.removeEventListener('popstate', syncPageWithLocation);
      window.removeEventListener('hashchange', syncPageWithLocation);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectMenuIndex]);

  useEffect(() => {
    const pendingPage = pendingLocationPageRef.current;
    if (appState !== 'idle' || activePage || !pendingPage) return;
    if (getHashValue() !== pendingPage) return;

    const pageId = getPageIdFromHash(pendingPage);
    if (!pageId) return;
    enterPage(pageId, { fromPopState: true });
  }, [appState, activePage, enterPage]);

  useEffect(() => {
    if (appState === 'page-active' && activePage && getPageIdFromHash(pendingLocationPageRef.current ?? '') === activePage) {
      pendingLocationPageRef.current = null;
      return;
    }

    if (appState === 'idle' && !activePage && !window.location.hash) {
      pendingLocationPageRef.current = null;
    }
  }, [appState, activePage]);

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
  const pageVisible = appState === 'page-active' || appState === 'exiting-page';

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

  const handleMemorandumLocationChange = useCallback((nextHash: string) => {
    setCurrentLocationHash(nextHash);
    if (window.location.hash !== `#${nextHash}`) {
      window.history.replaceState(window.history.state, '', `#${nextHash}`);
    }
  }, []);

  function enterPage(pageId: string, options: PageTransitionOptions = {}) {
    const { fromPopState = false, playSound = false } = options;
    if (!VALID_PAGE_IDS.has(pageId) || activePage || appState !== 'idle') return;
    if (playSound) playSoundEffect('enter');

    const nextHash = pageId === 'memorandum'
      ? `memorandum/${memorandumData.defaultColumnId}`
      : pageId;
    const resolvedHash = fromPopState ? getHashValue() || nextHash : nextHash;

    if (!fromPopState) history.pushState(null, '', `#${nextHash}`);
    setCurrentLocationHash(resolvedHash);
    pageTlRef.current?.kill();

    if (!animationsEnabled) {
      setSubtitleVisible(false);
      setActivePage(pageId as PageId);
      setHintsPage(pageId as PageId);
      setHintsMode('page');
      setAppState('page-active');
      return;
    }

    // Don't mount the page yet - let the exit animation play first.
    // onMountPage fires mid-timeline so the page appears after ~0.28s.
    setHintsPage(pageId as PageId);
    setAppState('entering-page');
    pageTlRef.current = createPageEnterTimeline(
      containerRef.current!,
      () => { pageTlRef.current = null; setAppState('page-active'); },
      () => setHintsMode('page'),
      () => setActivePage(pageId as PageId),
      () => setSubtitleVisible(false),
    );
  }

  function exitPage(options: PageTransitionOptions = {}) {
    const { fromPopState = false, playSound = false } = options;
    if (!activePage || appState !== 'page-active') return;
    if (playSound) playSoundEffect('exit');
    const shouldPreserveLocationHash = fromPopState || Boolean(pendingLocationPageRef.current);

    if (!fromPopState) clearPageHash();
    pageTlRef.current?.kill();

    if (!animationsEnabled) {
      // Snap menu elements back - may have GSAP inline styles from page enter animation or hash entry.
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
      setActivePage(null);
      setHintsPage(null);
      setAppState('idle');
      if (!shouldPreserveLocationHash) {
        setCurrentLocationHash('');
      }
      setSplashMeasureKey(k => k + 1);
      return;
    }

    // Increment before createMenuReEntryTimeline so the batched re-render fires its RAF
    // after gsap.set(menuLeft, { x: 0 }) has already run inside that function.
    setSubtitleVisible(false);
    setAppState('exiting-page');
    setSplashMeasureKey(k => k + 1);
    pageTlRef.current = createMenuReEntryTimeline(
      containerRef.current!,
      () => {
        pageTlRef.current = null;
        setActivePage(null);
        setHintsPage(null);
        setAppState('idle');
        if (!shouldPreserveLocationHash) {
          setCurrentLocationHash('');
        }
      },
      () => setSubtitleVisible(true),
      () => setHintsMode('menu'),
    );
  }

  useEffect(() => {
    enterPageRef.current = enterPage;
    exitPageRef.current = exitPage;
  }, [enterPage, exitPage]);

  if (appState === 'preloading') return <LoadingScreen />;
  if (unsupported) return <UnsupportedScreen />;

  const cursorActive = cursorStyle === 'metaphor' && inputMode !== 'keyboard';

  return (
    <>
    <CustomCursor visible={cursorActive} />
    <div
      ref={containerRef}
      className={`menu-root${inputMode === 'keyboard' ? ' keyboard-mode' : ''}`}
      onClick={(e) => {
        if (appState !== 'idle') return;
        if ((e.target as Element).closest('[data-control-hints-fixed]')) return;
        enterPage(MENU_ITEMS[selectedIndex].id, { playSound: true });
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
              enterPage(MENU_ITEMS[selectedIndex].id, { playSound: true });
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
            pointerEvents: appState === 'page-active' ? 'auto' : 'none',
          }}
        >
          {activePage === 'about' && (
            <AboutPage
              isActive={appState === 'page-active'}
              animationsEnabled={animationsEnabled}
              registerNavigation={setPageNavigation}
              playSoundEffect={playSoundEffect}
            />
          )}
          {activePage === 'skills' && (
            <SkillsPage
              isActive={appState === 'page-active'}
              animationsEnabled={animationsEnabled}
              registerNavigation={setPageNavigation}
            />
          )}
          {activePage === 'experience' && (
            <ExperiencePage
              isActive={appState === 'page-active'}
              animationsEnabled={animationsEnabled}
              registerNavigation={setPageNavigation}
            />
          )}
          {activePage === 'contact' && (
            <ContactPage
              isActive={appState === 'page-active'}
              animationsEnabled={animationsEnabled}
              pageState={appState === 'entering-page' ? 'entering-page' : appState === 'exiting-page' ? 'exiting-page' : 'page-active'}
              registerNavigation={setPageNavigation}
              playSoundEffect={playSoundEffect}
            />
          )}
          {activePage === 'memorandum' && (
            <MemorandumPage
              memorandumData={memorandumData}
              isActive={appState === 'page-active'}
              animationsEnabled={animationsEnabled}
              pageState={appState === 'entering-page' ? 'entering-page' : appState === 'exiting-page' ? 'exiting-page' : 'page-active'}
              registerNavigation={setPageNavigation}
              requestPageExit={exitPage}
              readEntryIds={readMemorandumEntryIds}
              onEntryRead={handleMemorandumEntryRead}
              locationHash={currentLocationHash}
              onLocationChange={handleMemorandumLocationChange}
              playSoundEffect={playSoundEffect}
            />
          )}
          {activePage === 'system' && (
            <SystemPage
              isActive={appState === 'page-active'}
              pageState={appState === 'entering-page' ? 'entering-page' : appState === 'exiting-page' ? 'exiting-page' : 'page-active'}
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
            />
          )}
        </div>
      )}
    </div>
    </>
  );
}

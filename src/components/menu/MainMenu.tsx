import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import {
  prefersReducedMotion,
  setEntryInitialStates,
  createEntryTimeline,
  createSectionEnterTimeline,
  createMenuReEntryTimeline,
} from '../../lib/animations';
import BackgroundLayers from '../background/BackgroundLayers';
import CharacterPortrait from '../background/CharacterPortrait';
import GeometricOverlays from '../background/GeometricOverlays';
import MenuItem from './MenuItem';
import MenuIndex from './MenuIndex';
import MenuItemBackground from './MenuItemBackground';
import StatsPanel from './StatsPanel';
import ControlHints from '../shared/ControlHints';
import LoadingScreen from '../shared/LoadingScreen';
import UnsupportedScreen from '../shared/UnsupportedScreen';
import CustomCursor from '../shared/CustomCursor';
import AboutSection from '../sections/AboutSection';
import SkillsSection from '../sections/SkillsSection';
import ExperienceSection from '../sections/ExperienceSection';
import ContactSection from '../sections/ContactSection';
import MemorandumSection from '../sections/MemorandumSection';
import SystemSection from '../sections/SystemSection';

type AppState = 'preloading' | 'entry' | 'idle' | 'entering-section' | 'section-active' | 'exiting-section';
type SectionId = 'about' | 'skills' | 'experience' | 'contact' | 'memorandum' | 'system' | null;
type CursorStyle = 'default' | 'metaphor';

const VALID_SECTION_IDS = new Set(['about', 'skills', 'experience', 'contact', 'memorandum', 'system']);

function clearSectionHash() {
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
}

export default function MainMenu() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('preloading');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
  const [unsupported, setUnsupported] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>(null);
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>('metaphor');
  const [bgInverted, setBgInverted] = useState(false);
  const [splashMeasureKey, setSplashMeasureKey] = useState(0);
  const [hintsMode, setHintsMode] = useState<'menu' | 'section'>('menu');

  const containerRef = useRef<HTMLDivElement>(null);
  const menuIndexRef = useRef<HTMLDivElement>(null);
  const menuStackRef = useRef<HTMLDivElement>(null);
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const indexAnimTlRef = useRef<gsap.core.Timeline | null>(null);
  const sectionTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevSelectedIndexRef = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollAt = useRef(0);
  const lastKeyNavAt = useRef(0);
  const initialHashChecked = useRef(false);
  const keyHoldDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppState>('preloading');
  const activeSectionRef = useRef<SectionId>(null);
  const enterSectionRef = useRef<(sectionId: string, fromPopState?: boolean) => void>(() => {});
  const exitSectionRef = useRef<(fromPopState?: boolean) => void>(() => {});
  const [inputMode, setInputMode] = useState<'keyboard' | 'mouse'>('mouse');

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const load = (src: string) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    };

    Promise.all([
      load('/assets/dog.png'),
      document.fonts.load('400 1em Cinzel'),
      document.fonts.load('700 1em Cinzel'),
      document.fonts.load('900 1em Cinzel'),
    ]).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => setAppState('entry')));
    });
  }, []);

  // Initialized to true; corrected from OS preference on mount.
  // Safe to initialize this way since the menu is behind the loading screen.
  useEffect(() => {
    const stored = localStorage.getItem('animationsEnabled');
    setAnimationsEnabled(stored !== null ? stored === 'true' : !prefersReducedMotion());
    const storedCursor = localStorage.getItem('cursorStyle') as CursorStyle | null;
    if (storedCursor === 'default' || storedCursor === 'metaphor') setCursorStyle(storedCursor);
    setBgInverted(localStorage.getItem('bgInverted') === 'true');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('cursor-metaphor', cursorStyle === 'metaphor');
  }, [cursorStyle]);

  useEffect(() => {
    document.body.classList.toggle('bg-inverted', bgInverted);
  }, [bgInverted]);

  // Set initial GSAP positions before the first paint of the menu.
  // If a valid hash is present on load, skip the entry animation and go straight to the section.
  useLayoutEffect(() => {
    if (appState !== 'entry' || !containerRef.current) return;

    const hashId = window.location.hash.slice(1);
    if (VALID_SECTION_IDS.has(hashId)) {
      initialHashChecked.current = true;
      const container = containerRef.current;
      // Put menu elements in the same hidden state as after createSectionEnterTimeline,
      // so createMenuReEntryTimeline works correctly if the user navigates back.
      gsap.set(container.querySelectorAll('[data-char]'), { x: 0, y: 0, opacity: 0 });
      gsap.set(container.querySelector('[data-menu-index]'), { y: '1.5vh', opacity: 0 });
      gsap.set(container.querySelector('[data-paint-splash-wrap]'), { opacity: 0 });
      gsap.set(container.querySelector('[data-stats-hints]'), { y: '1.5vh', opacity: 0 });
      const itemIndex = MENU_ITEMS.findIndex(item => item.id === hashId);
      if (itemIndex !== -1) setSelectedIndex(itemIndex);
      setActiveSection(hashId as SectionId);
      setHintsMode('section');
      setAppState('section-active');
      return;
    }

    if (!animationsEnabled) {
      setAppState('idle');
      setSubtitleVisible(true);
      return;
    }
    setEntryInitialStates(containerRef.current);
  }, [appState, animationsEnabled]);

  // Start entry animation after initial states are applied.
  // activeSection check guards against running when direct hash entry already switched state.
  useEffect(() => {
    if (appState !== 'entry' || !containerRef.current || !animationsEnabled || activeSection) return;

    entryTlRef.current = createEntryTimeline(containerRef.current, () => setAppState('idle'), () => setSubtitleVisible(true));

    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, [appState, animationsEnabled, activeSection]);

  // Smooth scroll + index fade when selectedIndex changes
  useEffect(() => {
    const prevIdx = prevSelectedIndexRef.current;
    prevSelectedIndexRef.current = selectedIndex;
    const changed = prevIdx !== selectedIndex && appState === 'idle' && animationsEnabled;
    const newY = `${(2.5 - selectedIndex) * 1.5}vh`;

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
      MENU_ITEMS.forEach((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const chars = Array.from(el.querySelectorAll('[data-char]')) as HTMLElement[];
        chars.forEach((char, j) => {
          const expanding = j === 0 || Math.random() < 0.1;
          const mag = expanding
            ? 0.08 + Math.random() * 0.12
            : 0.08 + Math.random() * 0.2;
          const scaleY = expanding ? 1 + mag : 1 - mag;
          const scaleX = expanding ? 1 + mag * 0.4 : 1 - mag * 0.5;
          gsap.timeline({ delay: j * 0.008 + Math.random() * 0.025 })
            .to(char, { scaleX, scaleY, duration: 0.06, ease: 'power2.in' })
            .to(char, { scaleX: 1, scaleY: 1, duration: 0.12, ease: 'power2.out' });
        });
      });
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
      if (appState !== 'idle') return;
      const now = Date.now();
      // TODO: Make sure trackpad scrolls are handled properly
      // if (now - lastScrollAt.current < 100) return;
      lastScrollAt.current = now;
      lastKeyNavAt.current = now;
      setInputMode('keyboard');
      if (e.deltaY > 0) {
        setSelectedIndex(prev => Math.min(prev + 1, MENU_ITEMS.length - 1));
      } else if (e.deltaY < 0) {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('wheel', onWheel);
    return () => window.removeEventListener('wheel', onWheel);
  }, [appState]);

  // Keyboard navigation - all input blocked during non-idle states
  useEffect(() => {
    const clearHold = () => {
      if (keyHoldDelay.current) { clearTimeout(keyHoldDelay.current); keyHoldDelay.current = null; }
      if (keyHoldInterval.current) { clearInterval(keyHoldInterval.current); keyHoldInterval.current = null; }
    };

    const applyKey = (key: string) => {
      lastKeyNavAt.current = Date.now();
      if (key === 'w' || key === 'W' || key === 'ArrowUp') {
        setSelectedIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (key === 's' || key === 'S' || key === 'ArrowDown') {
        setSelectedIndex(prev => (prev + 1) % MENU_ITEMS.length);
      } else if (key === 'a' || key === 'A' || key === 'ArrowLeft') {
        setSelectedIndex(0);
      } else if (key === 'd' || key === 'D' || key === 'ArrowRight') {
        setSelectedIndex(MENU_ITEMS.length - 1);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (appState === 'section-active') {
        if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          exitSection();
        }
        if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
          handleAnimationsToggle();
        }
        return;
      }

      if (appState !== 'idle') return;

      if (e.key === 'f' || e.key === 'F') {
        if (e.repeat) return;
        handleAnimationsToggle();
        return;
      }

      const isNav = ['w','W','s','S','a','A','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
      const isEnter = e.key === 'Enter' || e.key === ' ';
      if (isEnter) {
        e.preventDefault();
        enterSection(MENU_ITEMS[selectedIndex].id);
        return;
      }
      if (!isNav) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();

      // Ignore browser-generated repeat events - we manage our own hold timing
      if (e.repeat) return;

      setInputMode('keyboard');
      applyKey(e.key);

      // After initial press, wait before starting fast repeat
      clearHold();
      const heldKey = e.key;
      keyHoldDelay.current = setTimeout(() => {
        keyHoldInterval.current = setInterval(() => applyKey(heldKey), 100);
      }, 300);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const isNav = ['w','W','s','S','a','A','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
      if (isNav) clearHold();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHold);
    window.addEventListener('contextmenu', clearHold);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHold);
      window.removeEventListener('contextmenu', clearHold);
      clearHold();
    };
  }, [activeSection, animationsEnabled, appState, selectedIndex]);

  useEffect(() => {
    return () => {
      sectionTlRef.current?.kill();
    };
  }, []);

  // When animations are off, snap hints visible whenever the app reaches a stable state.
  // With animations on, the timelines handle their own hint fade-ins directly.
  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    if (appState === 'section-active' || appState === 'idle') {
      const el = containerRef.current.querySelector('[data-control-hints-fixed]');
      if (el) gsap.set(el, { opacity: 1 });
    }
    if (appState === 'idle') setSubtitleVisible(true);
  }, [appState, animationsEnabled]);

  useEffect(() => {
    const check = () => {
      const ratio = window.innerWidth / window.innerHeight;
      setUnsupported(ratio < 1.3 || ratio > 2.3);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (appState === 'section-active' && activeSection) {
      const nextHash = `#${activeSection}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(window.history.state, '', nextHash);
      }
      return;
    }

    if (appState === 'exiting-section' && window.location.hash) {
      clearSectionHash();
      return;
    }

    if (appState === 'idle' && !activeSection && window.location.hash) {
      clearSectionHash();
    }
  }, [appState, activeSection]);

  // Auto-enter a section on first load if a valid hash is present
  useEffect(() => {
    if (appState !== 'idle' || initialHashChecked.current) return;
    initialHashChecked.current = true;
    const id = window.location.hash.slice(1);
    if (!VALID_SECTION_IDS.has(id)) return;
    const itemIndex = MENU_ITEMS.findIndex(item => item.id === id);
    if (itemIndex !== -1) setSelectedIndex(itemIndex);
    // Small delay so the index animation can settle before entering
    const t = setTimeout(() => enterSection(id), 80);
    return () => clearTimeout(t);
  // enterSection is stable across renders (defined in component body without useCallback,
  // but all its dependencies are captured via closure at call time - safe to omit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // Keep the URL hash in sync with browser back/forward
  useEffect(() => {
    const syncSectionWithLocation = () => {
      const id = window.location.hash.slice(1);

      if (VALID_SECTION_IDS.has(id)) {
        const itemIndex = MENU_ITEMS.findIndex(item => item.id === id);
        if (itemIndex !== -1) setSelectedIndex(itemIndex);
        if (appStateRef.current === 'idle' && activeSectionRef.current !== id) {
          enterSectionRef.current(id, true);
        }
      } else {
        if (activeSectionRef.current && appStateRef.current === 'section-active') {
          exitSectionRef.current(true);
        }
      }
    };

    window.addEventListener('popstate', syncSectionWithLocation);
    window.addEventListener('hashchange', syncSectionWithLocation);
    return () => {
      window.removeEventListener('popstate', syncSectionWithLocation);
      window.removeEventListener('hashchange', syncSectionWithLocation);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the red/white split on the menu index aligned with the diagonal line
  const menuRendered = appState !== 'preloading';
  useEffect(() => {
    if (!menuRendered || !menuIndexRef.current) return;

    const update = () => {
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
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(menuIndexRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [menuRendered]);

  const activeItem = MENU_ITEMS[selectedIndex];
  const sectionVisible = appState === 'section-active' || appState === 'exiting-section';

  const handleCursorChange = (style: CursorStyle) => {
    setCursorStyle(style);
    localStorage.setItem('cursorStyle', style);
  };

  const handleBgInvertedChange = (inverted: boolean) => {
    setBgInverted(inverted);
    localStorage.setItem('bgInverted', String(inverted));
  };

  const handleAnimationsToggle = () => {
    setAnimationsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('animationsEnabled', String(next));
      return next;
    });
  };

  const enterSection = (sectionId: string, fromPopState = false) => {
    if (!VALID_SECTION_IDS.has(sectionId) || activeSection || appState !== 'idle') return;

    if (!fromPopState) history.pushState(null, '', `#${sectionId}`);
    sectionTlRef.current?.kill();

    if (!animationsEnabled) {
      setSubtitleVisible(false);
      setActiveSection(sectionId as SectionId);
      setHintsMode('section');
      setAppState('section-active');
      return;
    }

    // Don't mount the section yet - let the exit animation play first.
    // onMountSection fires mid-timeline so the section appears after ~0.28s.
    setAppState('entering-section');
    sectionTlRef.current = createSectionEnterTimeline(
      containerRef.current!,
      () => { sectionTlRef.current = null; setAppState('section-active'); },
      () => setHintsMode('section'),
      () => setActiveSection(sectionId as SectionId),
      () => setSubtitleVisible(false),
    );
  };

  const exitSection = (fromPopState = false) => {
    if (!activeSection || appState !== 'section-active') return;

    if (!fromPopState) clearSectionHash();
    sectionTlRef.current?.kill();

    if (!animationsEnabled) {
      // Snap menu elements back - may have GSAP inline styles from section enter animation or hash entry.
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
      setActiveSection(null);
      setAppState('idle');
      setSplashMeasureKey(k => k + 1);
      return;
    }

    // Increment before createMenuReEntryTimeline so the batched re-render fires its RAF
    // after gsap.set(menuLeft, { x: 0 }) has already run inside that function.
    setSubtitleVisible(false);
    setAppState('exiting-section');
    setSplashMeasureKey(k => k + 1);
    sectionTlRef.current = createMenuReEntryTimeline(
      containerRef.current!,
      () => {
        sectionTlRef.current = null;
        setActiveSection(null);
        setAppState('idle');
      },
      () => setSubtitleVisible(true),
      () => setHintsMode('menu'),
    );
  };

  useEffect(() => {
    enterSectionRef.current = enterSection;
    exitSectionRef.current = exitSection;
  }, [enterSection, exitSection]);

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
        enterSection(MENU_ITEMS[selectedIndex].id);
      }}
    >
      <BackgroundLayers />
      <div
        data-portrait-wrap
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <CharacterPortrait animationsEnabled={animationsEnabled} />
      </div>
      <GeometricOverlays animationsEnabled={animationsEnabled} />

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
          measureKey={splashMeasureKey}
        />
      </div>

      <div ref={menuLeftRef} className="menu-left" data-menu-left>
        <div className="menu-splash-wrap">
          <div ref={menuStackRef} className="menu-stack">
            {MENU_ITEMS.map((item, i) => {
              const sel = i === selectedIndex;
              const norm = (v?: string) => (!v || v === '0') ? '0px' : v;
              return (
                <div
                  key={item.id}
                  data-menu-item-wrap
                  style={{
                    marginBottom: sel ? `calc(${norm(item.marginBottom)} + 1vh)` : item.marginBottom,
                    marginTop: sel ? `calc(${norm(item.marginTop)} + 1vh)` : item.marginTop,
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
                    onMouseEnter={() => { if (appState === 'idle' && Date.now() - lastKeyNavAt.current > 100) { setInputMode('mouse'); setSelectedIndex(i); } }}
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

      {/* Control hints - above section shell, always visible */}
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
          onConfirm={() => enterSection(MENU_ITEMS[selectedIndex].id)}
          onBack={exitSection}
          onAnimationsToggle={handleAnimationsToggle}
        />
      </div>

      {activeSection && (
        <div
          data-section-shell
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 11,
            opacity: sectionVisible ? 1 : 0,
            pointerEvents: appState === 'section-active' ? 'auto' : 'none',
          }}
        >
          {activeSection === 'about' && (
            <AboutSection isActive={appState === 'section-active'} animationsEnabled={animationsEnabled} />
          )}
          {activeSection === 'skills' && (
            <SkillsSection isActive={appState === 'section-active'} animationsEnabled={animationsEnabled} />
          )}
          {activeSection === 'experience' && (
            <ExperienceSection isActive={appState === 'section-active'} animationsEnabled={animationsEnabled} />
          )}
          {activeSection === 'contact' && (
            <ContactSection isActive={appState === 'section-active'} />
          )}
          {activeSection === 'memorandum' && (
            <MemorandumSection isActive={appState === 'section-active'} />
          )}
          {activeSection === 'system' && (
            <SystemSection
              isActive={appState === 'section-active'}
              cursorStyle={cursorStyle}
              onCursorChange={handleCursorChange}
              bgInverted={bgInverted}
              onBgInvertedChange={handleBgInvertedChange}
              animationsEnabled={animationsEnabled}
              onAnimationsToggle={handleAnimationsToggle}
            />
          )}
        </div>
      )}
    </div>
    </>
  );
}

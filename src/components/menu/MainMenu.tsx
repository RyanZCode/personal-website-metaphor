import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import { prefersReducedMotion, setEntryInitialStates, createEntryTimeline } from '../../lib/animations';
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

type AppState = 'preloading' | 'entry' | 'idle';

export default function MainMenu() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('preloading');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
  const [unsupported, setUnsupported] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuIndexRef = useRef<HTMLDivElement>(null);
  const menuStackRef = useRef<HTMLDivElement>(null);
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const indexAnimTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevSelectedIndexRef = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollAt = useRef(0);
  const lastKeyNavAt = useRef(0);
  const keyHoldDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [inputMode, setInputMode] = useState<'keyboard' | 'mouse'>('mouse');

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
  }, []);

  // Set initial GSAP positions before the first paint of the menu
  useLayoutEffect(() => {
    if (appState !== 'entry' || !containerRef.current) return;
    if (!animationsEnabled) {
      setAppState('idle');
      setSubtitleVisible(true);
      return;
    }
    setEntryInitialStates(containerRef.current);
  }, [appState, animationsEnabled]);

  // Start entry animation after initial states are applied
  useEffect(() => {
    if (appState !== 'entry' || !containerRef.current || !animationsEnabled) return;

    entryTlRef.current = createEntryTimeline(containerRef.current, () => setAppState('idle'), () => setSubtitleVisible(true));

    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, [appState, animationsEnabled]);

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


  // Scroll wheel navigation - no wraparound, cooldown to handle trackpad micro-events
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (appState !== 'idle') return;
      const now = Date.now();
      // TODO: Make sure trackpad scrolls are handled properly
      // if (now - lastScrollAt.current < 100) return;
      lastScrollAt.current = now;
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
      if (appState !== 'idle') return;

      if (e.key === 'f' || e.key === 'F') {
        if (e.repeat) return;
        setAnimationsEnabled(prev => {
          const next = !prev;
          localStorage.setItem('animationsEnabled', String(next));
          return next;
        });
        return;
      }

      const isNav = ['w','W','s','S','a','A','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
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
  }, [appState]);

  useEffect(() => {
    const check = () => {
      const ratio = window.innerWidth / window.innerHeight;
      setUnsupported(ratio < 1.3 || ratio > 2.3);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  if (appState === 'preloading') return <LoadingScreen />;
  if (unsupported) return <UnsupportedScreen />;

  return (
    <div ref={containerRef} className={`menu-root${inputMode === 'keyboard' ? ' keyboard-mode' : ''}`}>
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
        />
      </div>

      <div ref={menuLeftRef} className="menu-left">
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
          bottom: '2vh',
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <StatsPanel />
        <ControlHints animationsEnabled={animationsEnabled} />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { MENU_ITEMS } from '../../lib/menuConfig';
import { COLORS } from '../../lib/constants';
import { prefersReducedMotion } from '../../lib/animations';
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

export default function MainMenu() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Initialized to true; corrected from OS preference on mount.
  // Safe to initialize this way since the menu is behind the loading screen.
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [clipPath, setClipPath] = useState('polygon(2% 100%, 99% 0%, 100% 0%, 100% 100%)');
  const [unsupported, setUnsupported] = useState(false);
  const menuIndexRef = useRef<HTMLDivElement>(null);

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
      requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
    });
  }, []);

  // Read persisted preference on mount; fall back to OS reduced-motion setting
  useEffect(() => {
    const stored = localStorage.getItem('animationsEnabled');
    setAnimationsEnabled(stored !== null ? stored === 'true' : !prefersReducedMotion());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        setAnimationsEnabled(prev => {
          const next = !prev;
          localStorage.setItem('animationsEnabled', String(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const check = () => {
      const ratio = window.innerWidth / window.innerHeight;
      // 16:9 = 1.778; allow roughly ±25% on either side
      setUnsupported(ratio < 1.3 || ratio > 2.3);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keep the red/white split on the menu index aligned with the diagonal line
  useEffect(() => {
    if (!loaded) return;

    const update = () => {
      const el = menuIndexRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Diagonal: (0.6*vw, vh) -> (vw, 0.1*vh)
      // y(x) = vh * (2.35 - 2.25 * x / vw)
      // x(y) = vw * (2.35 - y / vh) / 2.25
      const lineY = (x: number) => vh * (2.35 - 2.25 * x / vw);
      const lineX = (y: number) => (vw * (2.35 - y / vh)) / 2.25;

      const hits: Array<{ x: number; y: number }> = [];

      const yL = lineY(rect.left);
      if (yL >= rect.top && yL <= rect.bottom) hits.push({ x: rect.left, y: yL });

      const yR = lineY(rect.right);
      if (yR >= rect.top && yR <= rect.bottom) hits.push({ x: rect.right, y: yR });

      const xT = lineX(rect.top);
      if (xT >= rect.left && xT <= rect.right) hits.push({ x: xT, y: rect.top });

      const xB = lineX(rect.bottom);
      if (xB >= rect.left && xB <= rect.right) hits.push({ x: xB, y: rect.bottom });

      if (hits.length < 2) return;

      const toLocal = ({ x, y }: { x: number; y: number }) => ({
        xp: ((x - rect.left) / rect.width * 100).toFixed(1),
        yp: ((y - rect.top) / rect.height * 100).toFixed(1),
      });

      // Sort so p1 is the lower intersection (higher y value)
      const [p1, p2] = hits[0].y > hits[1].y ? [hits[0], hits[1]] : [hits[1], hits[0]];
      const lp1 = toLocal(p1);
      const lp2 = toLocal(p2);

      setClipPath(`polygon(${lp1.xp}% ${lp1.yp}%, ${lp2.xp}% ${lp2.yp}%, 100% 0%, 100% 100%)`);
    };

    const ro = new ResizeObserver(update);
    ro.observe(menuIndexRef.current!);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [loaded]);

  const activeItem = MENU_ITEMS[selectedIndex];

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Nudge the stack so the selected item drifts toward center (midpoint of 0-5 is 2.5)
  const menuScrollOffset = (2.5 - selectedIndex) * 1.5;

  if (!loaded) return <LoadingScreen />;

  if (unsupported) return <UnsupportedScreen />;

  return (
    <div className="menu-root">
      <BackgroundLayers />
      <CharacterPortrait animationsEnabled={animationsEnabled} />
      <GeometricOverlays animationsEnabled={animationsEnabled} />

      <MenuItemBackground
        itemRefs={itemRefs}
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
      />

      <div className="menu-left" style={{ transform: `translateY(${menuScrollOffset.toFixed(2)}vh)` }}>
        <div className="menu-splash-wrap">
          <div className="menu-stack">
            {MENU_ITEMS.map((item, i) => (
              <MenuItem
                key={item.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                item={item}
                index={i}
                distance={Math.abs(i - selectedIndex)}
                subtitle={i === selectedIndex ? item.subtitle : undefined}
                onMouseEnter={() => setSelectedIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        ref={menuIndexRef}
        style={{
          position: 'absolute',
          top: '6vh',
          right: '-2vw',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <MenuIndex index={activeItem.index} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath,
            pointerEvents: 'none',
          }}
        >
          <MenuIndex index={activeItem.index} textColor={COLORS.accentRed} />
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '2vh',
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
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

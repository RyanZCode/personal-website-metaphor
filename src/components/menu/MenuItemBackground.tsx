import type { LayoutMode } from '../../lib/deviceProfile';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ForwardedRef,
  type RefObject,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { getMenuItemScaleFactor, getMenuSplashScale } from '../../lib/menuLayout';
import { ITEM_SCALES } from '../../lib/constants';
import AboutTriangles from './splashEffects/AboutTriangles';
import SkillsBands    from './splashEffects/SkillsBands';
import ExperienceRipples  from './splashEffects/ExperienceRipples';
import ContactRings   from './splashEffects/ContactRings';
import MemorandumTrapezoids from './splashEffects/MemorandumTrapezoids';
import SystemGlitch   from './splashEffects/SystemGlitch';
import { rafThrottle } from '../../lib/rafThrottle';
import { createMenuSplashSelectionTimeline } from '../../lib/animations';

export interface MenuSplashHandle {
  measureNow: () => void;
  moveToSelection: (animate: boolean, onComplete?: () => void) => void;
  pauseAmbient: () => void;
  resumeAmbient: () => void;
  resetAmbient: () => void;
}

interface MenuItemBackgroundProps {
  itemRefs: RefObject<(HTMLDivElement | null)[]>;
  menuStackRef: RefObject<HTMLDivElement | null>;
  menuScrollViewportRef?: RefObject<HTMLDivElement | null>;
  selectedIndex: number;
  selectionAnimationsEnabled: boolean;
  ambientAnimationsEnabled: boolean;
  accentH: number;
  accentS: string;
  accentL: string;
  splashHeightVh: number;
  splashWidthVh: number;
  splashOffsetY: number;
  splashTipXPct: number;
  splashTaperYPct: number;
  menuScrollYVh: number;
  selectedItemOffsetYVh: number;
  measureKey: number;
  layoutMode?: LayoutMode;
}

interface SplashGeometry {
  centerY: number;
  width: number;
  height: number;
  pivotX: number;
  rotate: number;
  rotateY: number;
}

const SPLASH_LEFT_VH = -17.78;
const EFFECT_COMPONENTS = [
  AboutTriangles,
  SkillsBands,
  ExperienceRipples,
  ContactRings,
  MemorandumTrapezoids,
  SystemGlitch,
] as const;

function MenuItemBackground({
  itemRefs,
  menuStackRef,
  menuScrollViewportRef,
  selectedIndex,
  selectionAnimationsEnabled,
  ambientAnimationsEnabled,
  accentH,
  accentS,
  accentL,
  splashHeightVh,
  splashWidthVh,
  splashOffsetY,
  splashTipXPct,
  splashTaperYPct,
  menuScrollYVh,
  selectedItemOffsetYVh,
  measureKey,
  layoutMode = 'desktop',
}: MenuItemBackgroundProps, ref: ForwardedRef<MenuSplashHandle>) {
  const [ready, setReady] = useState(false);
  const splashScale = getMenuSplashScale(layoutMode);
  const itemScale = getMenuItemScaleFactor(layoutMode);
  const splashLeftVh = SPLASH_LEFT_VH * splashScale;

  // Layer refs
  const splashRef       = useRef<HTMLDivElement>(null);
  const surfaceRef      = useRef<HTMLDivElement>(null);
  const backRef         = useRef<HTMLDivElement>(null); // back bloom layer
  const frontRef        = useRef<HTMLDivElement>(null); // main solid layer
  const effectsWrapRef  = useRef<HTMLDivElement>(null); // mirrors frontRef scaleX so clipPath tracks the right edge
  const effectsInnerRef = useRef<HTMLDivElement>(null); // counter-scales to keep effect content positions stable
  const ambientAnimationsRef = useRef<gsap.core.Animation[]>([]);
  const selectionTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const baseSizeRef = useRef<{ width: number; height: number } | null>(null);
  const readyRef = useRef(false);

  const measureGeometry = useCallback((): SplashGeometry | null => {
    const el = itemRefs.current[selectedIndex];
    if (!el) return null;
    const anchor = el.querySelector('[data-menu-anchor]') as HTMLElement | null;
    const label = el.querySelector('[data-menu-label]') as HTMLElement | null;
    const wrap = el.closest('[data-menu-item-wrap]') as HTMLElement | null;
    const menuStack = menuStackRef.current;
    const verticalTarget = layoutMode === 'compact'
      ? menuStack?.closest('[data-menu-scroll-overlay]') as HTMLElement | null
      : menuStack?.closest('[data-menu-left]') as HTMLElement | null;
    if (!anchor || !label || !wrap || !verticalTarget) return null;

    const vh = window.innerHeight / 100;
    const splashH = splashHeightVh * splashScale * vh;
    const splashW = splashWidthVh * splashScale * vh;
    const anchorRect = anchor.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const currentWrapY = Number(gsap.getProperty(wrap, 'y')) || 0;
    const currentMenuY = Number(gsap.getProperty(verticalTarget, 'y')) || 0;
    const targetWrapY = selectedItemOffsetYVh * vh;
    const targetMenuY = menuScrollYVh * vh;
    const pendingY = targetWrapY - currentWrapY + targetMenuY - currentMenuY;
    const leftEdgeScreen = anchorRect.left;
    const labelCenterY = labelRect.top + labelRect.height / 2 + pendingY;

    const elementLeftPx = splashLeftVh * vh;
    const pivotX = leftEdgeScreen - elementLeftPx;

    return {
      centerY: labelCenterY + splashOffsetY * itemScale * vh,
      width: splashW,
      height: splashH,
      pivotX,
      rotate: ITEM_SCALES[Math.min(selectedIndex, ITEM_SCALES.length - 1)].rotate,
      rotateY: ITEM_SCALES[Math.min(selectedIndex, ITEM_SCALES.length - 1)].rotateY,
    };
  }, [itemRefs, itemScale, layoutMode, menuScrollYVh, menuStackRef, selectedIndex, selectedItemOffsetYVh, splashHeightVh, splashLeftVh, splashOffsetY, splashScale, splashWidthVh]);

  const applyGeometry = useCallback((
    geometry: SplashGeometry,
    animate: boolean,
    onComplete?: () => void,
  ) => {
    const splash = splashRef.current;
    const surface = surfaceRef.current;
    if (!splash || !surface) return;

    selectionTimelineRef.current?.kill();
    selectionTimelineRef.current = null;

    const baseSize = baseSizeRef.current;
    if (!animate || !selectionAnimationsEnabled || !baseSize) {
      baseSizeRef.current = { width: geometry.width, height: geometry.height };
      gsap.set(splash, {
        width: geometry.width,
        height: geometry.height,
        y: geometry.centerY - geometry.height / 2,
        rotation: geometry.rotate,
        rotationY: geometry.rotateY,
        transformPerspective: '20vh',
        transformOrigin: `${geometry.pivotX}px center`,
        opacity: 1,
      });
      gsap.set(surface, { scaleX: 1, scaleY: 1, transformOrigin: 'left center' });
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
      onComplete?.();
      return;
    }

    selectionTimelineRef.current = createMenuSplashSelectionTimeline(
      splash,
      surface,
      {
        y: geometry.centerY - baseSize.height / 2,
        rotation: geometry.rotate,
        rotationY: geometry.rotateY,
        pivotX: geometry.pivotX,
        scaleX: geometry.width / baseSize.width,
        scaleY: geometry.height / baseSize.height,
      },
      () => {
        selectionTimelineRef.current = null;
        baseSizeRef.current = { width: geometry.width, height: geometry.height };
        gsap.set(splash, {
          width: geometry.width,
          height: geometry.height,
          y: geometry.centerY - geometry.height / 2,
        });
        gsap.set(surface, { scaleX: 1, scaleY: 1 });
        onComplete?.();
      },
    );
  }, [selectionAnimationsEnabled]);

  const measureNow = useCallback(() => {
    const geometry = measureGeometry();
    if (geometry) applyGeometry(geometry, false);
  }, [applyGeometry, measureGeometry]);

  const moveToSelection = useCallback((animate: boolean, onComplete?: () => void) => {
    const geometry = measureGeometry();
    if (!geometry) {
      onComplete?.();
      return;
    }
    applyGeometry(geometry, animate, onComplete);
  }, [applyGeometry, measureGeometry]);
  const measureNowRef = useRef(measureNow);
  measureNowRef.current = measureNow;

  useImperativeHandle(ref, () => ({
    measureNow,
    moveToSelection,
    pauseAmbient: () => {
      ambientAnimationsRef.current.forEach((animation) => animation.pause());
    },
    resumeAmbient: () => {
      if (!ambientAnimationsEnabled) return;
      ambientAnimationsRef.current.forEach((animation) => animation.resume());
    },
    resetAmbient: () => {
      ambientAnimationsRef.current.forEach((animation) => {
        animation.restart();
        if (!ambientAnimationsEnabled) animation.pause();
      });
    },
  }), [ambientAnimationsEnabled, measureNow, moveToSelection]);

  useLayoutEffect(() => {
    if (!readyRef.current) measureNowRef.current();
  }, []);

  useEffect(() => {
    const compute = rafThrottle(() => measureNowRef.current());

    const scrollViewport = menuScrollViewportRef?.current;
    void document.fonts.ready.then(compute);

    window.addEventListener('resize', compute);
    scrollViewport?.addEventListener('scroll', compute, { passive: true });
    return () => {
      compute.cancel();
      window.removeEventListener('resize', compute);
      scrollViewport?.removeEventListener('scroll', compute);
    };
  }, [menuScrollViewportRef]);

  useEffect(() => {
    if (readyRef.current) measureNowRef.current();
  }, [layoutMode, measureKey]);

  useEffect(() => () => {
    selectionTimelineRef.current?.kill();
    selectionTimelineRef.current = null;
  }, []);

  useGSAP(() => {
    if (!backRef.current || !frontRef.current || !effectsWrapRef.current || !effectsInnerRef.current) return;
    if (!ambientAnimationsEnabled) return;

    ambientAnimationsRef.current.forEach((animation) => animation.kill());
    ambientAnimationsRef.current = [];

    // --- Back layer: slow bloom ---
    const backTween = gsap.to(backRef.current, {
      opacity: 0.1, scale: 1.12,
      duration: 2, ease: 'sine.inOut', repeat: -1, yoyo: true,
      transformOrigin: 'left center',
    });

    // --- Front layer + effects wrapper: same scaleX timeline so the clip boundary tracks.
    //     effectsInnerRef gets the inverse scaleX each step, keeping content positions stable
    //     Composed scaleX on content = (1/s) * s = 1.0 throughout the animation. ---
    const tl = gsap.timeline({ repeat: -1 });

    tl.to([frontRef.current, effectsWrapRef.current], {
        scaleX: 1.1, scaleY: 1.02,
        duration: 1.2, ease: 'power2.out', transformOrigin: 'left center',
      })
      .to(frontRef.current, { opacity: 0.9, duration: 1.2, ease: 'power2.out' }, '<')
      .to(effectsInnerRef.current, {
        scaleX: 1 / 1.1, scaleY: 1 / 1.02,
        duration: 1.2, ease: 'power2.out', transformOrigin: 'left center',
      }, '<')

      .to([frontRef.current, effectsWrapRef.current], {
        scaleX: 0.96, scaleY: 0.99,
        duration: 2, ease: 'sine.inOut', transformOrigin: 'left center',
      })
      .to(frontRef.current, { opacity: 1, duration: 2, ease: 'sine.inOut' }, '<')
      .to(effectsInnerRef.current, {
        scaleX: 1 / 0.96, scaleY: 1 / 0.99,
        duration: 2, ease: 'sine.inOut', transformOrigin: 'left center',
      }, '<')

      .to([frontRef.current, effectsWrapRef.current], {
        scaleX: 1.0, scaleY: 1.0,
        duration: 1.8, ease: 'power1.inOut', transformOrigin: 'left center',
      })
      .to(effectsInnerRef.current, {
        scaleX: 1.0, scaleY: 1.0,
        duration: 1.8, ease: 'power1.inOut', transformOrigin: 'left center',
      }, '<');

    ambientAnimationsRef.current = [backTween, tl];

    return () => {
      backTween.kill();
      tl.kill();
      ambientAnimationsRef.current = [];
    };

  }, { dependencies: [ready, ambientAnimationsEnabled], revertOnUpdate: true });

  const color = `hsl(${accentH}, ${accentS}, ${accentL})`;
  const clipPath = `polygon(0% 0%, ${splashTipXPct - 2}% ${splashTaperYPct}%, ${splashTipXPct}% 50%, ${splashTipXPct - 2}% ${100 - splashTaperYPct}%, 0% 100%)`;

  return (
    <div
      ref={splashRef}
      data-paint-splash
      data-splash-ambient-active={ambientAnimationsEnabled ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${splashLeftVh}vh`,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 4,
        pointerEvents: 'none',
        opacity: ready ? 1 : 0,
      }}
    >
      <div ref={surfaceRef} style={{ position: 'absolute', inset: 0, transformOrigin: 'left center' }}>
        <div
          ref={backRef}
          style={{ position: 'absolute', inset: 0, background: color, clipPath, opacity: 0.4 }}
        />

        <div
          ref={frontRef}
          style={{ position: 'absolute', inset: 0, background: color, clipPath }}
        />

      {/* effectsWrapRef mirrors frontRef's scaleX so the clipPath right edge tracks correctly.
          effectsInnerRef counter-scales (1/scaleX) to keep effect content positions stable */}
        <div
          ref={effectsWrapRef}
          style={{ position: 'absolute', inset: 0, clipPath, pointerEvents: 'none', transformOrigin: 'left center' }}
        >
          <div ref={effectsInnerRef} style={{ position: 'absolute', inset: 0, transformOrigin: 'left center' }}>
            {(() => {
              const EffectComponent = EFFECT_COMPONENTS[selectedIndex];
              if (!EffectComponent) return null;
              return (
                <EffectComponent
                  key={selectedIndex}
                  isActive={true}
                  animationsEnabled={ambientAnimationsEnabled}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default forwardRef<MenuSplashHandle, MenuItemBackgroundProps>(MenuItemBackground);

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
import {
  getMenuItemScaleFactor,
  getMenuSplashScale,
} from '../../lib/menuLayout';
import AboutTriangles from './splashEffects/AboutTriangles';
import SkillsBands    from './splashEffects/SkillsBands';
import ExperienceRipples  from './splashEffects/ExperienceRipples';
import ContactRings   from './splashEffects/ContactRings';
import MemorandumTrapezoids from './splashEffects/MemorandumTrapezoids';
import SystemGlitch   from './splashEffects/SystemGlitch';
import { rafThrottle } from '../../lib/rafThrottle';

export interface MenuSplashHandle {
  measureNow: () => void;
  moveToSelection: () => void;
  pauseAmbient: () => void;
  resumeAmbient: () => void;
  resetAmbient: () => void;
}

interface MenuItemBackgroundProps {
  itemRefs: RefObject<(HTMLDivElement | null)[]>;
  menuStackRef: RefObject<HTMLDivElement | null>;
  menuScrollViewportRef?: RefObject<HTMLDivElement | null>;
  selectedIndex: number;
  ambientAnimationsEnabled: boolean;
  accentH: number;
  accentS: string;
  accentL: string;
  splashHeightVh: number;
  splashTipExtensionVh: number;
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
  left: number;
  width: number;
  height: number;
  pivotX: number;
  rotation: number;
  scaleX: number;
}

const SPLASH_LEFT_OVERSCAN_VH = 2;
const SPLASH_TIP_LENGTH_PCT = 1;
const EFFECT_COMPONENTS = [
  AboutTriangles,
  SkillsBands,
  ExperienceRipples,
  ContactRings,
  MemorandumTrapezoids,
  SystemGlitch,
] as const;

function getRenderedTranslateY(element: HTMLElement) {
  const transform = window.getComputedStyle(element).transform;
  if (transform === 'none') return 0;

  const values = transform.slice(transform.indexOf('(') + 1, -1).split(',').map(Number);
  return transform.startsWith('matrix3d') ? values[13] ?? 0 : values[5] ?? 0;
}

function MenuItemBackground({
  itemRefs,
  menuStackRef,
  menuScrollViewportRef,
  selectedIndex,
  ambientAnimationsEnabled,
  accentH,
  accentS,
  accentL,
  splashHeightVh,
  splashTipExtensionVh,
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

  // Layer refs
  const splashRef       = useRef<HTMLDivElement>(null);
  const backRef         = useRef<HTMLDivElement>(null); // back bloom layer
  const frontRef        = useRef<HTMLDivElement>(null); // main solid layer
  const effectsWrapRef  = useRef<HTMLDivElement>(null); // mirrors frontRef scaleX so clipPath tracks the right edge
  const effectsInnerRef = useRef<HTMLDivElement>(null); // counter-scales to keep effect content positions stable
  const ambientAnimationsRef = useRef<gsap.core.Animation[]>([]);
  const readyRef = useRef(false);

  const measureGeometry = useCallback((): SplashGeometry | null => {
    const el = itemRefs.current[selectedIndex];
    if (!el) return null;
    const anchor = el.querySelector('[data-menu-anchor]') as HTMLElement | null;
    const trajectoryEnd = el.querySelector('[data-menu-trajectory-end]') as HTMLElement | null;
    const label = el.querySelector('[data-menu-label]') as HTMLElement | null;
    const wrap = el.closest('[data-menu-item-wrap]') as HTMLElement | null;
    const menuStack = menuStackRef.current;
    const verticalTarget = layoutMode === 'compact'
      ? menuStack?.closest('[data-menu-scroll-overlay]') as HTMLElement | null
      : menuStack?.closest('[data-menu-left]') as HTMLElement | null;
    if (!anchor || !trajectoryEnd || !label || !wrap || !verticalTarget) return null;

    const vh = window.innerHeight / 100;
    const splashH = splashHeightVh * splashScale * vh;
    const anchorRect = anchor.getBoundingClientRect();
    const trajectoryEndRect = trajectoryEnd.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const currentWrapY = getRenderedTranslateY(wrap);
    const currentMenuY = getRenderedTranslateY(verticalTarget);
    const targetWrapY = selectedItemOffsetYVh * vh;
    const targetMenuY = menuScrollYVh * vh;
    const pendingY = targetWrapY - currentWrapY + targetMenuY - currentMenuY;
    const trajectoryStartX = anchorRect.left + anchorRect.width / 2;
    const trajectoryStartY = anchorRect.top + anchorRect.height / 2;
    const trajectoryEndX = trajectoryEndRect.left + trajectoryEndRect.width / 2;
    const trajectoryEndY = trajectoryEndRect.top + trajectoryEndRect.height / 2;
    const trajectoryX = trajectoryEndX - trajectoryStartX;
    const trajectoryY = trajectoryEndY - trajectoryStartY;
    const trajectoryLength = Math.hypot(trajectoryX, trajectoryY);
    const rotation = Math.atan2(trajectoryY, trajectoryX);
    const scaleX = trajectoryLength / el.offsetWidth;
    const leftEdgeScreen = trajectoryStartX;
    const labelCenterY = labelRect.top + labelRect.height / 2 + pendingY;

    const projectedHorizontalScale = Math.max(Math.cos(rotation) * scaleX, 0.01);
    const rotatedVerticalReach = Math.abs(Math.sin(rotation)) * splashH / 2;
    const leftOverscan = SPLASH_LEFT_OVERSCAN_VH * vh;
    const pivotX = (leftEdgeScreen + leftOverscan + rotatedVerticalReach) / projectedHorizontalScale;
    const elementLeftPx = leftEdgeScreen - pivotX;
    const labelEndX = label.offsetLeft + label.offsetWidth;
    const tipExtension = splashTipExtensionVh * splashScale * vh;
    const splashW = (pivotX + labelEndX + tipExtension) / (splashTipXPct / 100);

    return {
      centerY: labelCenterY + splashOffsetY * itemScale * vh,
      left: elementLeftPx,
      width: splashW,
      height: splashH,
      pivotX,
      rotation: rotation * 180 / Math.PI,
      scaleX,
    };
  }, [itemRefs, itemScale, layoutMode, menuScrollYVh, menuStackRef, selectedIndex, selectedItemOffsetYVh, splashHeightVh, splashOffsetY, splashScale, splashTipExtensionVh, splashTipXPct]);

  const applyGeometry = useCallback((geometry: SplashGeometry) => {
    const splash = splashRef.current;
    if (!splash) return;

    splash.style.left = `${geometry.left}px`;
    splash.style.width = `${geometry.width}px`;
    splash.style.height = `${geometry.height}px`;
    splash.style.transform = `translateY(${geometry.centerY - geometry.height / 2}px) rotate(${geometry.rotation}deg) scaleX(${geometry.scaleX})`;
    splash.style.transformOrigin = `${geometry.pivotX}px center`;
    splash.style.opacity = '1';
    splash.style.removeProperty('will-change');
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
  }, []);

  const measureNow = useCallback(() => {
    const geometry = measureGeometry();
    if (geometry) applyGeometry(geometry);
  }, [applyGeometry, measureGeometry]);

  const moveToSelection = useCallback(() => {
    const geometry = measureGeometry();
    if (geometry) applyGeometry(geometry);
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

  useGSAP(() => {
    if (!backRef.current || !frontRef.current || !effectsWrapRef.current || !effectsInnerRef.current) return;
    if (!ambientAnimationsEnabled) return;

    ambientAnimationsRef.current.forEach((animation) => animation.kill());
    ambientAnimationsRef.current = [];

    // --- Back layer: slow bloom ---
    const backTween = gsap.to(backRef.current, {
      opacity: 0.1, scale: 1.06,
      duration: 2, ease: 'sine.inOut', repeat: -1, yoyo: true,
      transformOrigin: 'left center',
    });

    // --- Front layer + effects wrapper: same scaleX timeline so the clip boundary tracks.
    //     effectsInnerRef gets the inverse scaleX each step, keeping content positions stable
    //     Composed scaleX on content = (1/s) * s = 1.0 throughout the animation. ---
    const tl = gsap.timeline({ repeat: -1 });

    tl.to([frontRef.current, effectsWrapRef.current], {
        scaleX: 1.045, scaleY: 1.015,
        duration: 1.2, ease: 'power2.out', transformOrigin: 'left center',
      })
      .to(frontRef.current, { opacity: 0.9, duration: 1.2, ease: 'power2.out' }, '<')
      .to(effectsInnerRef.current, {
        scaleX: 1 / 1.045, scaleY: 1 / 1.015,
        duration: 1.2, ease: 'power2.out', transformOrigin: 'left center',
      }, '<')

      .to([frontRef.current, effectsWrapRef.current], {
        scaleX: 0.985, scaleY: 0.995,
        duration: 2, ease: 'sine.inOut', transformOrigin: 'left center',
      })
      .to(frontRef.current, { opacity: 1, duration: 2, ease: 'sine.inOut' }, '<')
      .to(effectsInnerRef.current, {
        scaleX: 1 / 0.985, scaleY: 1 / 0.995,
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
  const taperStartXPct = splashTipXPct - SPLASH_TIP_LENGTH_PCT;
  const clipPath = `polygon(0% 0%, ${taperStartXPct}% ${splashTaperYPct}%, ${splashTipXPct}% 50%, ${taperStartXPct}% ${100 - splashTaperYPct}%, 0% 100%)`;

  return (
    <div
      ref={splashRef}
      data-paint-splash
      data-splash-ambient-active={ambientAnimationsEnabled ? 'true' : 'false'}
      data-splash-tip-length={SPLASH_TIP_LENGTH_PCT}
      data-splash-taper-inset={splashTaperYPct}
      data-splash-tip-extension={splashTipExtensionVh}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 4,
        pointerEvents: 'none',
        opacity: ready ? 1 : 0,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center' }}>
        <div
          ref={backRef}
          style={{ position: 'absolute', inset: 0, background: color, clipPath, opacity: 0.4 }}
        />

        <div
          ref={frontRef}
          data-paint-splash-front
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

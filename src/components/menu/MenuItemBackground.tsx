import type { LayoutMode } from '../../lib/deviceProfile';
import { useEffect, useRef, useState } from 'react';
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

interface MenuItemBackgroundProps {
  itemRefs: React.RefObject<(HTMLDivElement | null)[]>;
  menuStackRef: React.RefObject<HTMLDivElement | null>;
  menuScrollViewportRef?: React.RefObject<HTMLDivElement | null>;
  selectedIndex: number;
  animationsEnabled: boolean;
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

interface SplashPos {
  top: number;
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

export default function MenuItemBackground({
  itemRefs,
  menuStackRef,
  menuScrollViewportRef,
  selectedIndex,
  animationsEnabled,
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
}: MenuItemBackgroundProps) {
  const [pos, setPos] = useState<SplashPos | null>(null);
  const splashScale = getMenuSplashScale(layoutMode);
  const itemScale = getMenuItemScaleFactor(layoutMode);
  const splashLeftVh = SPLASH_LEFT_VH * splashScale;

  // Layer refs
  const backRef         = useRef<HTMLDivElement>(null); // back bloom layer
  const frontRef        = useRef<HTMLDivElement>(null); // main solid layer
  const effectsWrapRef  = useRef<HTMLDivElement>(null); // mirrors frontRef scaleX so clipPath tracks the right edge
  const effectsInnerRef = useRef<HTMLDivElement>(null); // counter-scales to keep effect content positions stable

  useEffect(() => {
    const compute = rafThrottle(() => {
      const el = itemRefs.current[selectedIndex];
      if (!el) return;
      const anchor = el.querySelector('[data-menu-anchor]') as HTMLElement | null;
      const label = el.querySelector('[data-menu-label]') as HTMLElement | null;
      if (!anchor || !label) return;

      const vh = window.innerHeight / 100;
      const splashH = splashHeightVh * splashScale * vh;
      const anchorRect = anchor.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const leftEdgeScreen = anchorRect.left;
      const labelCenterY = labelRect.top + labelRect.height / 2;

      const elementLeftPx = splashLeftVh * vh;
      const pivotX = leftEdgeScreen - elementLeftPx;

      const nextPos = {
        top: labelCenterY - splashH / 2 + splashOffsetY * itemScale * vh,
        height: splashH,
        pivotX,
        rotate: ITEM_SCALES[Math.min(selectedIndex, ITEM_SCALES.length - 1)].rotate,
        rotateY: ITEM_SCALES[Math.min(selectedIndex, ITEM_SCALES.length - 1)].rotateY,
      };

      setPos((current) => {
        if (
          current &&
          Math.abs(current.top - nextPos.top) < 0.5 &&
          Math.abs(current.height - nextPos.height) < 0.5 &&
          Math.abs(current.pivotX - nextPos.pivotX) < 0.5 &&
          current.rotate === nextPos.rotate &&
          current.rotateY === nextPos.rotateY
        ) {
          return current;
        }

        return nextPos;
      });
    });

    // Menu items and their parent stack tween for ~200ms on selection changes.
    // Re-sample through that settle window so the splash locks to the final text
    // position instead of capturing an in-between animation frame.
    let settleRafId: number | null = null;
    const rafId = requestAnimationFrame((startTime) => {
      const tick = (now: number) => {
        compute();
        if (now - startTime < 260) {
          settleRafId = requestAnimationFrame(tick);
        } else {
          settleRafId = null;
          compute();
        }
      };

      tick(startTime);
    });

    // Re-measure whenever the selected item's size changes (e.g. font swap settling)
    const el = itemRefs.current[selectedIndex];
    const ro = el ? new ResizeObserver(compute) : null;
    if (el && ro) ro.observe(el);
    const label = el?.querySelector('[data-menu-label]') as HTMLElement | null;
    if (label && ro) ro.observe(label);

    const scrollViewport = menuScrollViewportRef?.current;

    window.addEventListener('resize', compute);
    scrollViewport?.addEventListener('scroll', compute, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      if (settleRafId !== null) {
        cancelAnimationFrame(settleRafId);
      }
      compute.cancel();
      ro?.disconnect();
      window.removeEventListener('resize', compute);
      scrollViewport?.removeEventListener('scroll', compute);
    };
  }, [selectedIndex, splashHeightVh, splashWidthVh, splashOffsetY, splashTipXPct, splashTaperYPct, menuScrollYVh, selectedItemOffsetYVh, measureKey, splashLeftVh, splashScale, itemScale, menuScrollViewportRef]);

  useGSAP(() => {
    if (!backRef.current || !frontRef.current || !effectsWrapRef.current || !effectsInnerRef.current) return;
    if (!animationsEnabled) return;

    // --- Back layer: slow bloom ---
    gsap.to(backRef.current, {
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

  // pos !== null (not pos itself) - the pulsing animation doesn't use position values,
  // so revertOnUpdate shouldn't fire on every re-measure, only when readiness changes.
  }, { dependencies: [pos !== null, animationsEnabled], revertOnUpdate: true });

  const ready = pos !== null;

  const color = `hsl(${accentH}, ${accentS}, ${accentL})`;
  const clipPath = `polygon(0% 0%, ${splashTipXPct - 2}% ${splashTaperYPct}%, ${splashTipXPct}% 50%, ${splashTipXPct - 2}% ${100 - splashTaperYPct}%, 0% 100%)`;

  return (
    <div
      data-paint-splash
      style={{
        position: 'absolute',
        left: `${splashLeftVh}vh`,
        top: pos?.top ?? 0,
        width: `${splashWidthVh * splashScale}vh`,
        height: pos?.height ?? 0,
        transform: `rotate(${pos?.rotate ?? 0}deg) perspective(20vh) rotateY(${pos?.rotateY ?? 0}deg)`,
        transformOrigin: `${pos?.pivotX ?? 0}px center`,
        zIndex: 4,
        pointerEvents: 'none',
        opacity: ready ? 1 : 0,
      }}
    >
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
          {EFFECT_COMPONENTS.map((EffectComponent, index) => (
            <EffectComponent
              key={index}
              isActive={selectedIndex === index}
              animationsEnabled={animationsEnabled}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

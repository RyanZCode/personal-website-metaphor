import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ITEM_SCALES, ARC_CURVE_X } from '../../lib/constants';
import AboutTriangles from './splashEffects/AboutTriangles';
import SkillsBands    from './splashEffects/SkillsBands';
import ExperienceRipples  from './splashEffects/ExperienceRipples';
import ContactRings   from './splashEffects/ContactRings';
import MemorandumTrapezoids from './splashEffects/MemorandumTrapezoids';
import SystemGlitch   from './splashEffects/SystemGlitch';

interface MenuItemBackgroundProps {
  itemRefs: React.RefObject<(HTMLDivElement | null)[]>;
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
}

interface SplashPos {
  top: number;
  height: number;
  pivotX: number;
  rotate: number;
  rotateY: number;
}

const SPLASH_LEFT_VH = -17.78;

export default function MenuItemBackground({ itemRefs, selectedIndex, animationsEnabled, accentH, accentS, accentL, splashHeightVh, splashWidthVh, splashOffsetY, splashTipXPct, splashTaperYPct }: MenuItemBackgroundProps) {
  const [pos, setPos] = useState<SplashPos | null>(null);

  // Layer refs
  const backRef         = useRef<HTMLDivElement>(null); // back bloom layer
  const frontRef        = useRef<HTMLDivElement>(null); // main solid layer
  const effectsWrapRef  = useRef<HTMLDivElement>(null); // mirrors frontRef scaleX so clipPath tracks the right edge
  const effectsInnerRef = useRef<HTMLDivElement>(null); // counter-scales to keep effect content positions stable

  useEffect(() => {
    const compute = () => {
      const el = itemRefs.current[selectedIndex];
      if (!el) return;
      const offsetParent = el.offsetParent as HTMLElement | null;
      if (!offsetParent) return;

      const scale = ITEM_SCALES[Math.min(selectedIndex, ITEM_SCALES.length - 1)];
      const arcX = ARC_CURVE_X[Math.min(selectedIndex, ARC_CURVE_X.length - 1)];
      const vh = window.innerHeight / 100;
      const splashH = splashHeightVh * vh;

      const parentRect = offsetParent.getBoundingClientRect();
      const pivotY = parentRect.top + el.offsetTop + el.offsetHeight / 2;

      const T_px = (arcX * 16 / 9) * vh;
      const leftEdgeScreen = parentRect.left + el.offsetLeft + T_px;

      const rotateRad = scale.rotate * Math.PI / 180;
      const textCenterY = pivotY + (el.offsetWidth / 2) * Math.sin(rotateRad);

      const elementLeftPx = SPLASH_LEFT_VH * vh;
      const elementWidthPx = splashWidthVh * vh;

      const pivotX = leftEdgeScreen - elementLeftPx;

      const elementCenterX = elementLeftPx + elementWidthPx / 2;
      const splashVerticalShift = (elementCenterX - leftEdgeScreen) * Math.sin(rotateRad);

      setPos({
        top: textCenterY - splashH / 2 - splashVerticalShift + splashOffsetY * vh,
        height: splashH,
        pivotX,
        rotate: scale.rotate,
        rotateY: scale.rotateY,
      });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [selectedIndex, splashHeightVh, splashWidthVh, splashOffsetY, splashTipXPct, splashTaperYPct]);

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

  }, { dependencies: [pos, animationsEnabled], revertOnUpdate: true });

  const ready = pos !== null;

  const color = `hsl(${accentH}, ${accentS}, ${accentL})`;
  const clipPath = `polygon(0% 0%, ${splashTipXPct - 2}% ${splashTaperYPct}%, ${splashTipXPct}% 50%, ${splashTipXPct - 2}% ${100 - splashTaperYPct}%, 0% 100%)`;

  return (
    <div
      data-paint-splash
      style={{
        position: 'absolute',
        left: `${SPLASH_LEFT_VH}vh`,
        top: pos?.top ?? 0,
        width: `${splashWidthVh}vh`,
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
          <AboutTriangles isActive={selectedIndex === 0} animationsEnabled={animationsEnabled} />
          <SkillsBands isActive={selectedIndex === 1} animationsEnabled={animationsEnabled} />
          <ExperienceRipples isActive={selectedIndex === 2} animationsEnabled={animationsEnabled} />
          <ContactRings isActive={selectedIndex === 3} animationsEnabled={animationsEnabled} />
          <MemorandumTrapezoids isActive={selectedIndex === 4} animationsEnabled={animationsEnabled} />
          <SystemGlitch isActive={selectedIndex === 5} animationsEnabled={animationsEnabled} />
        </div>
      </div>

    </div>
  );
}

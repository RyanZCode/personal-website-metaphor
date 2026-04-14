import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createMemorandumTrapezoidTimelines, type MemorandumTrapData } from '../../../lib/animations';

interface Props {
  isActive: boolean;
  animationsEnabled: boolean;
}

const TRAPEZOIDS: MemorandumTrapData[] = [
  { left: '8%', width: 'clamp(8rem, 12vw, 13rem)', height: 'clamp(3.4rem, 4.9vw, 5.4rem)', rotation: -10, driftVw: 1.8, duration: 8.2, delay: 0, opacity: 0.34 },
  { left: '26%', width: 'clamp(6.8rem, 10vw, 11rem)', height: 'clamp(2.8rem, 4.2vw, 4.7rem)', rotation: 14, driftVw: -1.4, duration: 7.4, delay: 0.9, opacity: 0.28 },
  { left: '47%', width: 'clamp(9rem, 13vw, 14rem)', height: 'clamp(3.6rem, 5.2vw, 5.8rem)', rotation: -18, driftVw: 1.1, duration: 9.1, delay: 1.8, opacity: 0.4 },
  { left: '76%', width: 'clamp(5.8rem, 8.5vw, 9rem)', height: 'clamp(2.4rem, 3.5vw, 4rem)', rotation: 9, driftVw: -1.1, duration: 6.8, delay: 0.4, opacity: 0.24 },
  { left: '16%', width: 'clamp(10rem, 14vw, 15rem)', height: 'clamp(4rem, 5.8vw, 6.3rem)', rotation: 20, driftVw: -2, duration: 10.4, delay: 2.3, opacity: 0.3 },
  { left: '61%', width: 'clamp(7.4rem, 10.8vw, 12rem)', height: 'clamp(3rem, 4.4vw, 4.9rem)', rotation: -6, driftVw: 1.6, duration: 7.8, delay: 3.2, opacity: 0.36 },
  { left: '36%', width: 'clamp(6.2rem, 9vw, 10rem)', height: 'clamp(2.6rem, 3.8vw, 4.2rem)', rotation: 12, driftVw: 0.9, duration: 6.2, delay: 4.1, opacity: 0.22 },
  { left: '12%', width: 'clamp(6.4rem, 9.4vw, 10.6rem)', height: 'clamp(2.7rem, 3.9vw, 4.4rem)', rotation: -14, driftVw: 1.3, duration: 6.9, delay: 1.1, opacity: 0.26 },
  { left: '22%', width: 'clamp(8.8rem, 12.8vw, 13.8rem)', height: 'clamp(3.5rem, 5vw, 5.6rem)', rotation: 16, driftVw: -1.7, duration: 8.7, delay: 2.8, opacity: 0.32 },
  { left: '41%', width: 'clamp(7rem, 10.2vw, 11.4rem)', height: 'clamp(2.9rem, 4.1vw, 4.6rem)', rotation: -8, driftVw: 1.5, duration: 7.1, delay: 0.6, opacity: 0.27 },
  { left: '55%', width: 'clamp(9.4rem, 13.6vw, 14.8rem)', height: 'clamp(3.8rem, 5.4vw, 6rem)', rotation: 11, driftVw: -1.2, duration: 9.6, delay: 3.7, opacity: 0.33 },
  { left: '69%', width: 'clamp(6.6rem, 9.6vw, 10.8rem)', height: 'clamp(2.8rem, 4vw, 4.4rem)', rotation: -20, driftVw: 1, duration: 6.5, delay: 4.6, opacity: 0.23 },
  { left: '84%', width: 'clamp(8.2rem, 11.8vw, 12.8rem)', height: 'clamp(3.3rem, 4.7vw, 5.2rem)', rotation: 13, driftVw: -0.9, duration: 8, delay: 1.9, opacity: 0.29 },
];

const TRAPEZOID_CLIP_PATH = 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)';

export default function MemorandumTrapezoids({ isActive, animationsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timelinesRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    timelinesRef.current = createMemorandumTrapezoidTimelines(trapRefs.current, TRAPEZOIDS);
  }, { scope: containerRef });

  useEffect(() => {
    const shouldRun = isActive && animationsEnabled;
    const willChange = shouldRun ? 'transform, opacity' : 'auto';

    trapRefs.current.forEach((trap) => {
      if (!trap) return;
      trap.style.willChange = willChange;
    });

    timelinesRef.current.forEach((timeline) => {
      if (shouldRun) {
        timeline.resume();
        return;
      }

      timeline.pause();
    });

    if (containerRef.current) {
      gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    }
  }, [animationsEnabled, isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {TRAPEZOIDS.map((trap, index) => (
        <div
          key={`${trap.left}-${index}`}
          ref={(node) => {
            trapRefs.current[index] = node;
          }}
          style={{
            position: 'absolute',
            left: trap.left,
            bottom: '-14vh',
            width: trap.width,
            height: trap.height,
            background: index % 3 === 0 ? 'rgba(255, 247, 204, 0.8)' : 'rgba(233, 244, 255, 0.56)',
            border: '1px solid rgba(255, 255, 255, 0.42)',
            boxShadow: '0 0 30px rgba(255, 245, 187, 0.2)',
            clipPath: TRAPEZOID_CLIP_PATH,
          }}
        />
      ))}
    </div>
  );
}

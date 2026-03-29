import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createSystemGlitchTimelines } from '../../../lib/animations';

interface Props { isActive: boolean; animationsEnabled: boolean; }

const NUM_BARS = 7;

export default function SystemGlitch({ isActive, animationsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanRef  = useRef<HTMLDivElement>(null);
  const barRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    const vh = window.innerHeight / 100;
    const getH = () => containerRef.current?.offsetHeight ?? 600;
    tlsRef.current = createSystemGlitchTimelines(barRefs.current, scanRef.current, getH, vh);
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    const running = isActive && animationsEnabled;
    const wc = running ? 'transform, opacity' : 'auto';
    barRefs.current.forEach(el => { if (el) el.style.willChange = wc; });
    if (scanRef.current) scanRef.current.style.willChange = wc;
    if (running) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive, animationsEnabled]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0 }}>
      {/* Glitch bars - white only, no color tinting.
          Height is 2vh (base for scaleY); initial top/size set by factory via y+scaleY transforms. */}
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div
          key={i}
          ref={el => { barRefs.current[i] = el; }}
          style={{
            position: 'absolute', left: 0,
            top: 0,
            width: '100%', height: '2vh',
            background: 'rgba(255,255,255,0.92)',
            opacity: 0,
          }}
        />
      ))}
      {/* Scanline - white sweep */}
      <div
        ref={scanRef}
        style={{
          position: 'absolute', left: 0, top: '-10%',
          width: '100%', height: '10%',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.13), transparent)',
        }}
      />
    </div>
  );
}

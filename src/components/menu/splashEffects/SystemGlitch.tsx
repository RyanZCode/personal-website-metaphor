import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

const NUM_BARS = 7;

export default function SystemGlitch({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanRef  = useRef<HTMLDivElement>(null);
  const barRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = [];

    barRefs.current.forEach((bar, i) => {
      if (!bar) return;
      let cycle = 0;
      const tl = gsap.timeline({
        repeat: -1,
        delay: i * 0.38,
        paused: true,
        onRepeat() {
          cycle++;
          const pct = 8 + ((i * 23 + cycle * 37) % 76);
          const heightVh = 0.25 + ((i + cycle * 2) % 5) * 0.25;
          gsap.set(bar, { top: `${pct}%`, height: `${heightVh}vh` });
        },
      });
      tl.to(bar, { opacity: 0.75, duration: 0.04 })
        .to(bar, { opacity: 0.08, duration: 0.09 })
        .to(bar, { opacity: 0.6,  duration: 0.04 })
        .to(bar, { opacity: 0.15, duration: 0.05 })
        .to(bar, { opacity: 0,    duration: 0.06 })
        .to(bar, { duration: 1.8 + i * 0.28 });

      tl.seek(Math.random() * tl.duration());
      tlsRef.current.push(tl);
    });

    if (scanRef.current) {
      const scanTween = gsap.to(scanRef.current, {
        y: '1100%', duration: 2.8, ease: 'none', repeat: -1, paused: true,
      });
      scanTween.seek(Math.random() * scanTween.duration());
      tlsRef.current.push(scanTween);
    }
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    if (isActive) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0 }}>
      {/* Glitch bars - white only, no color tinting */}
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div
          key={i}
          ref={el => { barRefs.current[i] = el; }}
          style={{
            position: 'absolute', left: 0,
            top: `${10 + i * 11}%`,
            width: '100%', height: '0.5vh',
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

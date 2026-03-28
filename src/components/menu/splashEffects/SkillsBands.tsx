import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

// [widthVh, delayS] - irregular delays so bands arrive at varied intervals
const BANDS: Array<[number, number]> = [
  [5,  0    ],
  [9,  0.72 ],
  [4,  1.55 ],
  [11, 2.40 ],
  [6,  0.33 ],
  [8,  1.18 ],
  [4,  3.05 ],
  [10, 0.91 ],
  [5,  1.82 ],
  [7,  2.68 ],
  [11, 0.48 ],
  [4,  1.37 ],
  [6,  2.15 ],
  [8,  3.50 ],
  [5,  0.60 ],
];

// Short trail: long transparent lead-in, dim mid, capped at low opacity at leading edge
const BAND_GRADIENT = 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.12) 78%, rgba(255,255,255,0.18) 100%)';

export default function SkillsBands({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = [];
    const vh = window.innerHeight / 100;
    const cW = containerRef.current?.offsetWidth ?? 250 * vh;
    // startX = 0: band's CSS left edge at the clip left boundary, partially visible from the start
    // This ensures expo.in's slow phase plays while the band is on screen (not wasted off-screen)
    const startX = 0;
    const endX   = cW * 0.65;

    bandRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { x: startX, rotation: -38, transformOrigin: 'center center', opacity: 0 });
      const tl = gsap.timeline({ repeat: -1, delay: BANDS[i][1], paused: true });
      tl.to(el, { opacity: 1, duration: 0.4, ease: 'power1.in' })
        .to(el, { x: endX, duration: 3.6, ease: 'expo.in' }, 0)
        .set(el, { x: startX, opacity: 0 })
        .to(el, { duration: 0.2 });

      tl.seek(Math.random() * tl.duration());
      tlsRef.current.push(tl);
    });
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    if (isActive) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0 }}>
      {BANDS.map(([w], i) => (
        <div
          key={i}
          ref={el => { bandRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            left: 0, top: '-15%',
            width: `${w + 12}vh`,
            height: '150%',
            background: BAND_GRADIENT,
          }}
        />
      ))}
    </div>
  );
}

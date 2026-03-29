import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createSkillsBandsTimelines } from '../../../lib/animations';

interface Props { isActive: boolean; animationsEnabled: boolean; }

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

export default function SkillsBands({ isActive, animationsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    const cW = containerRef.current?.offsetWidth ?? (window.innerHeight / 100) * 250;
    tlsRef.current = createSkillsBandsTimelines(bandRefs.current, BANDS, cW);
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    const running = isActive && animationsEnabled;
    const wc = running ? 'transform, opacity' : 'auto';
    bandRefs.current.forEach(el => { if (el) el.style.willChange = wc; });
    if (running) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive, animationsEnabled]);

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

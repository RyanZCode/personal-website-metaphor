import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createContactRingsTimelines } from '../../../lib/animations';

interface Props { isActive: boolean; animationsEnabled: boolean; }

const TRAIL_TEXTURES = {
  soft: '/assets/contact-effects/ring-trail-soft.webp',
  medium: '/assets/contact-effects/ring-trail-medium.webp',
  wide: '/assets/contact-effects/ring-trail-wide.webp',
} as const;

// [sizeVh, startXVh, startYVh, endXVh, endYVh, delayS, opacity]
const RINGS: Array<[number, number, number, number, number, number, number]> = [
  // Horizontal sweeps
  [160, -230,  -8,  40,  -4,  0,    0.65],
  [155,  108, -18, -80,  -8,  0.8,  0.6 ],
  // Diagonal: top-left to bottom-right
  [140, -160, -90,  60,  18,  0.6,  0.55],
  // Diagonal: top-right to bottom-left
  [130,  130, -80, -50,  15,  1.3,  0.5 ],
  // Diagonal: bottom-left to top-right
  [150, -100, 100,  50, -15,  1.8,  0.5 ],
  // Nearly vertical: top to bottom
  [160,   10,-160,  20,  12,  0.4,  0.52],
  // Nearly vertical: bottom to top
  [145,  -20, 160,  30, -12,  1.0,  0.48],
  // Shallow diagonal: bottom-right to top-left
  [148,  140,  60, -60, -10,  2.3,  0.53],
  // Horizontal sweep, offset y
  [152, -220,  14,  45,   8,  1.5,  0.58],
  // Steep diagonal: top-right to bottom-left
  [138,   90, -120, -30,  30,  3.0,  0.5 ],
];

function getTrailTexture(size: number) {
  if (size <= 140) return TRAIL_TEXTURES.soft;
  if (size <= 152) return TRAIL_TEXTURES.medium;
  return TRAIL_TEXTURES.wide;
}

function getTrailScale(size: number) {
  if (size <= 140) return 1.02;
  if (size <= 152) return 1.05;
  return 1.08;
}

export default function ContactRings({ isActive, animationsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    const vh = window.innerHeight / 100;
    tlsRef.current = createContactRingsTimelines(ringRefs.current, RINGS, vh);
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    const running = isActive && animationsEnabled;
    const wc = running ? 'transform, opacity' : 'auto';
    ringRefs.current.forEach(el => { if (el) el.style.willChange = wc; });
    if (running) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive, animationsEnabled]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
      {RINGS.map(([size, sx, sy, ex, ey], i) => {
        const R = size / 2;
        const angle = Math.atan2(ey - sy, ex - sx);
        const tx = -Math.cos(angle);
        const ty = -Math.sin(angle);
        const trailTexture = getTrailTexture(size);
        const trailScale = getTrailScale(size);

        return (
          <div
            key={i}
            ref={el => { ringRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: `${size}vh`, height: `${size}vh`,
              marginLeft: `${-R}vh`,
              marginTop:  `${-R}vh`,
            }}
          >
            <div style={{
              position: 'absolute',
              inset: '-2.4vh',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.58)',
              maskImage: `url(${trailTexture})`,
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              maskSize: 'contain',
              WebkitMaskImage: `url(${trailTexture})`,
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              WebkitMaskSize: 'contain',
              opacity: 0.95,
              transform: `translate(${tx * 0.9}vh, ${ty * 0.9}vh) scale(${trailScale})`,
            }} />
            {/* Main ring */}
            <div style={{
              position: 'absolute',
              width: '100%', height: '100%',
              borderRadius: '50%',
              border: '0.6vh solid rgba(255,255,255,0.75)',
            }} />
          </div>
        );
      })}
    </div>
  );
}

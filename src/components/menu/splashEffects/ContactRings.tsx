import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

// [sizeVh, startXVh, startYVh, endXVh, endYVh, delayS, opacity]
const RINGS: Array<[number, number, number, number, number, number, number]> = [
  // Horizontal sweeps
  [160, -230,  -8,  40,  -4,  0,    0.65],
  [155,  108, -18, -80,  -8,  0.8,  0.6 ],
  // Diagonal: top-left → bottom-right
  [140, -160, -90,  60,  18,  0.6,  0.55],
  // Diagonal: top-right → bottom-left
  [130,  130, -80, -50,  15,  1.3,  0.5 ],
  // Diagonal: bottom-left → top-right
  [150, -100, 100,  50, -15,  1.8,  0.5 ],
  // Nearly vertical: top → bottom
  [160,   10,-160,  20,  12,  0.4,  0.52],
  // Nearly vertical: bottom → top
  [145,  -20, 160,  30, -12,  1.0,  0.48],
  // Shallow diagonal: bottom-right → top-left
  [148,  140,  60, -60, -10,  2.3,  0.53],
  // Horizontal sweep, offset y
  [152, -220,  14,  45,   8,  1.5,  0.58],
  // Steep diagonal: top-right → bottom-left
  [138,   90, -120, -30,  30,  3.0,  0.5 ],
];

export default function ContactRings({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = [];
    const vh = window.innerHeight / 100;

    ringRefs.current.forEach((el, i) => {
      if (!el) return;
      const [, sx, sy, ex, ey, delay, opacity] = RINGS[i];
      const pxSX = sx * vh, pxSY = sy * vh, pxEX = ex * vh, pxEY = ey * vh;

      gsap.set(el, { x: pxSX, y: pxSY, opacity: 0 });
      const tl = gsap.timeline({ repeat: -1, delay, paused: true });
      tl.to(el, { opacity, duration: 0.8, ease: 'power2.out' })
        .to(el, { x: pxEX, y: pxEY, duration: 6.0, ease: 'power1.inOut' }, 0)
        .to(el, { opacity: 0, duration: 1.0, ease: 'power1.in' }, '-=1.0')
        .set(el, { x: pxSX, y: pxSY })
        .to(el, { duration: 5.0 });

      tl.seek(((i + Math.random()) / RINGS.length) * tl.duration());
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
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
      {RINGS.map(([size, sx, sy, ex, ey], i) => {
        const R = size / 2;
        const angle = Math.atan2(ey - sy, ex - sx);
        const tx = -Math.cos(angle);
        const ty = -Math.sin(angle);

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
            {/* Trail: border widened to 2.5vh so blur(1vh) has enough painted area to stay visible.
                Size compensated (+1.9vh each axis, -0.95vh offset) so center radius stays
                identical to the main ring's 0.6vh border */}
            <div style={{
              position: 'absolute',
              width: 'calc(100% + 1.9vh)',
              height: 'calc(100% + 1.9vh)',
              left: '-0.95vh',
              top: '-0.95vh',
              borderRadius: '50%',
              border: '2.5vh solid rgba(255,255,255,0.45)',
              filter: 'blur(1vh)',
              transform: `translate(${tx * 0.9}vh, ${ty * 0.9}vh)`,
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

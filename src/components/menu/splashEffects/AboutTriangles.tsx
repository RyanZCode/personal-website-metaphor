import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

const CLIPS = [
  'polygon(50% 0%, 0% 100%, 100% 100%)',
  'polygon(50% 0%, 43% 100%, 57% 100%)',
  'polygon(18% 0%, 0% 100%, 100% 100%)',
  'polygon(82% 0%, 0% 100%, 100% 100%)',
  'polygon(50% 0%, 5% 100%, 95% 100%)',
  'polygon(50% 0%, 0% 75%, 100% 100%)',
  'polygon(50% 0%, 33% 100%, 67% 100%)',
  'polygon(30% 0%, 0% 100%, 72% 100%)',
];

// [leftVh, top%, widthVh, heightVh, maxOpacity, delayS, durationS, clipIdx]
// Negative leftVh = starts outside the left edge; enters the clip polygon as it moves right
const TRIS: Array<[number, string, number, number, number, number, number, number]> = [
  [-28, '15%', 26, 19, 0.11, 0,    2.2, 0],
  [-15, '42%', 18, 28, 0.22, 0.18, 1.6, 1],
  [-22, '76%', 30, 22, 0.14, 0.36, 3.0, 2],
  [-8,  '8%',  22, 14, 0.28, 0.54, 1.4, 3],
  [-18, '60%', 28, 16, 0.10, 0.72, 2.6, 4],
  [-30, '30%', 18, 26, 0.21, 0.90, 1.8, 5],
  [-12, '85%', 22, 15, 0.16, 1.08, 2.4, 6],
  [-25, '50%', 28, 21, 0.12, 1.26, 3.2, 7],
  [-8,  '22%', 16, 22, 0.26, 1.44, 1.5, 0],
  [-20, '68%', 24, 18, 0.19, 0.09, 2.0, 1],
  [-35, '5%',  20, 14, 0.29, 0.27, 2.8, 2],
  [-10, '46%', 32, 18, 0.10, 0.63, 1.7, 3],
  [-28, '90%', 18, 24, 0.20, 0.81, 3.1, 4],
  [-15, '33%', 23, 16, 0.15, 0.99, 2.3, 5],
  [-22, '55%', 20, 28, 0.23, 1.17, 1.9, 6],
  [-5,  '78%', 25, 18, 0.13, 1.35, 2.7, 7],
  // Large slow triangles
  [-42, '10%', 48, 34, 0.07, 0.3,  5.5, 2],
  [-38, '50%', 44, 30, 0.05, 0.8,  4.8, 4],
  [-45, '28%', 52, 36, 0.06, 1.2,  6.2, 0],
  [-40, '50%', 46, 32, 0.05, 0.5,  5.0, 3],
  [-50, '0%', 60, 44, 0.12, 0.6,  7.5, 1],
  [-48, '20%', 55, 38, 0.14, 1.4,  6.8, 5],
  [-44,  '8%', 50, 42, 0.10, 0.2,  8.2, 7],
  [-52, '22%', 58, 40, 0.11, 1.0,  7.0, 3],
];

const TRAVEL_VH = 240;

export default function AboutTriangles({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = [];
    const vh = window.innerHeight / 100;
    const travelPx = TRAVEL_VH * vh;

    triRefs.current.forEach((el, i) => {
      if (!el) return;
      const [,,,, maxOpacity, delay, duration] = TRIS[i];

      gsap.set(el, { opacity: 0, x: 0, rotation: -45, transformOrigin: 'center center' });
      const tl = gsap.timeline({ repeat: -1, delay, paused: true });

      tl.to(el, { x: travelPx, duration, ease: 'none' })
        .to(el, { opacity: maxOpacity, duration: 0.35, ease: 'power2.out' }, 0)
        .to(el, { opacity: 0, duration: 0.5, ease: 'power1.in' }, duration - 0.5)
        .set(el, { x: 0 });

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
    // No overflow:hidden - elements start to the left of the container (negative left);
    // the parent's clipPath handles visual clipping once they cross into the paint splash polygon
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
      {TRIS.map(([leftVh, top, w, h,,,,clipIdx], i) => (
        <div
          key={i}
          ref={el => { triRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            left: `${leftVh}vh`,
            top,
            width: `${w}vh`, height: `${h}vh`,
            background: 'rgba(255,255,255,0.9)',
            clipPath: CLIPS[clipIdx],
          }}
        />
      ))}
    </div>
  );
}

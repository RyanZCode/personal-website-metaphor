import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

const TRAPS = [
  { left: '15%', top: '20%', w: '18vh', h: '10vh', rot: 0,   dir: 1,  color: 'rgba(255,255,255,0.28)' },
  { left: '50%', top: '10%', w: '14vh', h:  '8vh', rot: 25,  dir: -1, color: 'rgba(0,0,0,0.35)'       },
  { left: '25%', top: '55%', w: '20vh', h: '11vh', rot: -15, dir: 1,  color: 'rgba(255,255,255,0.22)' },
  { left: '60%', top: '45%', w: '12vh', h:  '7vh', rot: 40,  dir: -1, color: 'rgba(0,0,0,0.3)'        },
  { left: '10%', top: '65%', w: '16vh', h:  '9vh', rot: -30, dir: 1,  color: 'rgba(255,255,255,0.2)'  },
  { left: '65%', top: '70%', w: '13vh', h:  '8vh', rot: 10,  dir: -1, color: 'rgba(0,0,0,0.28)'       },
  { left: '40%', top: '30%', w: '15vh', h:  '9vh', rot: -20, dir: 1,  color: 'rgba(255,255,255,0.18)' },
  { left: '75%', top: '25%', w: '11vh', h:  '7vh', rot: 50,  dir: -1, color: 'rgba(0,0,0,0.32)'       },
  { left: '32%', top: '48%', w:  '9vh', h:  '5vh', rot: 35,  dir: -1, color: 'rgba(255,255,255,0.24)' },
  { left: '58%', top: '15%', w:  '8vh', h:  '5vh', rot: -45, dir: 1,  color: 'rgba(0,0,0,0.26)'       },
];

const TRAP_CLIP = 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)';

interface Particle { x: number; y: number; vx: number; vy: number; r: number; el: HTMLDivElement | null; }

export default function MemorandumTrapezoids({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);
  const isActiveRef = useRef(isActive);

  // Rotation only - GSAP rotation is composed with physics x/y below without conflict
  useGSAP(() => {
    tlsRef.current = [];
    const W = containerRef.current?.offsetWidth  ?? 0;
    const H = containerRef.current?.offsetHeight ?? 0;

    trapRefs.current.forEach((el, i) => {
      if (!el) return;
      const t = TRAPS[i];
      const cx = (parseFloat(t.left) / 100) * W;
      const cy = (parseFloat(t.top)  / 100) * H;
      gsap.set(el, { xPercent: -50, yPercent: -50, x: cx, y: cy, rotation: t.rot });
      const tween = gsap.to(el, { rotation: t.rot + 360 * t.dir, duration: 13 + i * 1.4, ease: 'none', repeat: -1, paused: true });
      tween.seek(Math.random() * tween.duration());
      tlsRef.current.push(tween);
    });
  }, { scope: containerRef });

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    if (isActive) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive]);

  // Physics simulation - tracks element CENTERS in px; applies via GSAP x/y which
  // composes with the rotation from useGSAP without conflict
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: Particle[] = [];
    let initialized = false;

    const tick = (_time: number, deltaTime: number) => {
      if (!isActiveRef.current) return;

      if (!initialized) {
        const W = container.offsetWidth;
        const H = container.offsetHeight;
        if (W === 0 || H === 0) return;

        const vh = window.innerHeight / 100;
        TRAPS.forEach((t, i) => {
          const w = parseFloat(t.w) * vh;
          const h = parseFloat(t.h) * vh;
          const cx = (parseFloat(t.left) / 100) * W;
          const cy = (parseFloat(t.top)  / 100) * H;
          const r = Math.sqrt(w * w + h * h) * 0.5;
          const angle = (i * 137.508 + 22) * Math.PI / 180;
          const speed = 22 + i * 2.8;
          particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, el: trapRefs.current[i] });
        });
        initialized = true;
        return;
      }

      const W = container.offsetWidth;
      const H = container.offsetHeight;
      const dt = Math.min(deltaTime, 50) / 1000;

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Bounce: keep CENTER at least p.r from each edge
        if (p.x < p.r)     { p.vx =  Math.abs(p.vx); p.x = p.r; }
        if (p.x > W - p.r) { p.vx = -Math.abs(p.vx); p.x = W - p.r; }
        if (p.y < p.r)     { p.vy =  Math.abs(p.vy); p.y = p.r; }
        if (p.y > H - p.r) { p.vy = -Math.abs(p.vy); p.y = H - p.r; }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const minDist = a.r + b.r;
          if (distSq < minDist * minDist && distSq > 0.001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist, ny = dy / dist;
            const relV = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (relV > 0) {
              a.vx -= relV * nx; a.vy -= relV * ny;
              b.vx += relV * nx; b.vy += relV * ny;
            }
            const push = (minDist - dist) * 0.5;
            a.x -= nx * push; a.y -= ny * push;
            b.x += nx * push; b.y += ny * push;
          }
        }
      }

      // Clamp after collision resolution - collision push can exceed wall bounds before next tick
      for (const p of particles) {
        p.x = Math.max(p.r, Math.min(W - p.r, p.x));
        p.y = Math.max(p.r, Math.min(H - p.r, p.y));
      }

      // x/y compose with xPercent/yPercent and rotation set by useGSAP - no conflict
      for (const p of particles) {
        if (p.el) gsap.set(p.el, { x: p.x, y: p.y });
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0 }}>
      {TRAPS.map((t, i) => (
        <div
          key={i}
          ref={el => { trapRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: t.w, height: t.h,
            background: t.color,
            clipPath: TRAP_CLIP,
          }}
        />
      ))}
    </div>
  );
}

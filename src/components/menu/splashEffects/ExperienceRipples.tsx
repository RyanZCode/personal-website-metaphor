import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props { isActive: boolean; }

const SLOTS = [
  // Outward (expanding) - more of these
  { left: '21%', top: '31%', delay: 0,   inward: false },
  { left: '76%', top: '66%', delay: 1.8, inward: false },
  { left: '11%', top: '52%', delay: 3.4, inward: false },
  { left: '60%', top: '76%', delay: 5.1, inward: false },
  { left: '81%', top: '40%', delay: 0.9, inward: false },
  { left: '36%', top: '71%', delay: 2.7, inward: false },
  { left: '47%', top: '13%', delay: 6.3, inward: false },
  { left: '71%', top: '14%', delay: 4.2, inward: false },
  { left: '18%', top: '82%', delay: 7.0, inward: false },
  // Inward (contracting) - fewer, longer pause so they show up less often
  { left: '54%', top: '57%', delay: 2.1, inward: true  },
  { left: '67%', top: '26%', delay: 5.8, inward: true  },
  { left: '40%', top: '43%', delay: 8.5, inward: true  },
];

export default function ExperienceRipples({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = [];

    SLOTS.forEach((slot, i) => {
      const dot  = dotRefs.current[i];
      const ring = ringRefs.current[i];
      if (!dot || !ring) return;

      const tl = gsap.timeline({ repeat: -1, delay: slot.delay, paused: true });

      if (slot.inward) {
        gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 4.5, opacity: 0 });
        gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 10,  opacity: 0 });

        tl.to(ring, { scale: 0, duration: 1.8, ease: 'power1.in' })
          .to(ring, { opacity: 0.35, duration: 0.4, ease: 'power1.out' }, 0)
          .to(ring, { opacity: 0,   duration: 0.6, ease: 'power1.in'  }, 1.2)
          .to(dot,  { scale: 0, duration: 1.6, ease: 'power1.in' }, 0.1)
          .to(dot,  { opacity: 0.35, duration: 0.3, ease: 'power1.out' }, 0.1)
          .to(dot,  { opacity: 0,    duration: 0.5, ease: 'power1.in'  }, 1.1)
          .to(dot,  { duration: 4.0 }); // long pause - inward fires much less often
      } else {
        gsap.set(dot,  { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
        gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

        // Expand directly from scale 0 - no intermediate scale:1 step, so no spawn-wait stutter
        tl.to(ring, { scale: 10,  duration: 2.4, ease: 'power1.out' })
          .to(ring, { opacity: 0.32, duration: 0.3, ease: 'power2.out' }, 0)
          .to(ring, { opacity: 0,   duration: 0.7, ease: 'power1.in'  }, 1.7)
          .to(dot,  { scale: 5,  duration: 2.2, ease: 'power1.out' }, 0)
          .to(dot,  { opacity: 0.38, duration: 0.25, ease: 'power2.out' }, 0)
          .to(dot,  { opacity: 0,    duration: 0.6,  ease: 'power1.in'  }, 1.6)
          .to(dot,  { duration: 2.5 }); // pause before next cycle
      }

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
      {SLOTS.map((slot, i) => (
        <div key={i}>
          <div
            ref={el => { dotRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              left: slot.left, top: slot.top,
              width: '6vh', height: '6vh',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
            }}
          />
          <div
            ref={el => { ringRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              left: slot.left, top: slot.top,
              width: '5vh', height: '5vh',
              borderRadius: '50%',
              border: '0.2vh solid rgba(255,255,255,0.85)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

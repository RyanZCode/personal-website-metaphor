import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createExperienceRipplesTimelines, type RippleSlot } from '../../../lib/animations';

interface Props { isActive: boolean; animationsEnabled: boolean; }

const SLOTS: RippleSlot[] = [
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

export default function ExperienceRipples({ isActive, animationsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlsRef = useRef<gsap.core.Animation[]>([]);

  useGSAP(() => {
    tlsRef.current = createExperienceRipplesTimelines(dotRefs.current, ringRefs.current, SLOTS);
  }, { scope: containerRef });

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { autoAlpha: isActive ? 1 : 0 });
    const running = isActive && animationsEnabled;
    const wc = running ? 'transform, opacity' : 'auto';
    dotRefs.current.forEach(el => { if (el) el.style.willChange = wc; });
    ringRefs.current.forEach(el => { if (el) el.style.willChange = wc; });
    if (running) tlsRef.current.forEach(t => t.resume());
    else tlsRef.current.forEach(t => t.pause());
  }, [isActive, animationsEnabled]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0 }}>
      {SLOTS.map((slot, i) => (
        <div key={i}>
          <div
            ref={el => { dotRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              left: slot.left, top: slot.top,
              width: '300px', height: '300px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
            }}
          />
          <div
            ref={el => { ringRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              left: slot.left, top: slot.top,
              width: '500px', height: '500px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.85)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

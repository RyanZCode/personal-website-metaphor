import { useEffect, useRef } from 'react';

// Hotspot offset within the cursor image (where the tip is)
const HOTSPOT_X = 37;
const HOTSPOT_Y = 25;

interface CustomCursorProps {
  visible: boolean;
}

export default function CustomCursor({ visible }: CustomCursorProps) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!visible) return;

    const el = ref.current;
    if (!el) return;

    let positioned = false;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - HOTSPOT_X}px, ${e.clientY - HOTSPOT_Y}px)`;
      if (!positioned) {
        el.style.opacity = '1';
        positioned = true;
      }
    };

    const onLeave = () => { el.style.opacity = '0'; };
    const onEnter = () => { if (positioned) el.style.opacity = '1'; };

    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <img
      ref={ref}
      src="/assets/metaphor-cursor.png"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        userSelect: 'none',
        willChange: 'transform',
      }}
    />
  );
}

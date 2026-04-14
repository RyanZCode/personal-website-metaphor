import { useEffect, useRef } from 'react';
import { rafThrottle } from '../../lib/rafThrottle';

// Hotspot offset within the cursor image (where the tip is)
const HOTSPOT_X = 37;
const HOTSPOT_Y = 25;
const BASE_VIEWPORT_WIDTH = 2560;
const BASE_VIEWPORT_HEIGHT = 1440;

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
    let lastX = 0;
    let lastY = 0;
    let scale = Math.min(window.innerWidth / BASE_VIEWPORT_WIDTH, window.innerHeight / BASE_VIEWPORT_HEIGHT);

    const updateTransform = rafThrottle((x: number, y: number) => {
      el.style.transform = `translate(${x - HOTSPOT_X * scale}px, ${y - HOTSPOT_Y * scale}px) scale(${scale})`;
    });

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      updateTransform(lastX, lastY);
      if (!positioned) {
        el.style.opacity = '1';
        positioned = true;
      }
    };

    const onResize = () => {
      scale = Math.min(window.innerWidth / BASE_VIEWPORT_WIDTH, window.innerHeight / BASE_VIEWPORT_HEIGHT);
      if (positioned) {
        updateTransform(lastX, lastY);
      }
    };

    const onLeave = () => { el.style.opacity = '0'; };
    const onEnter = () => { if (positioned) el.style.opacity = '1'; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', onResize);
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      updateTransform.cancel();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
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
        transformOrigin: 'top left',
      }}
    />
  );
}

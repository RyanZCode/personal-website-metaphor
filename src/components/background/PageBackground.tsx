import { useEffect, useState } from 'react';
import { shouldRenderDecorativeTextures, useViewportProfile } from '../../lib/deviceProfile';

export default function PageBackground() {
  const [showTextures, setShowTextures] = useState(false);
  const viewportProfile = useViewportProfile();

  useEffect(() => {
    setShowTextures(shouldRenderDecorativeTextures());
  }, [viewportProfile.layoutMode, viewportProfile.isCoarsePointer]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: '#0a0608' }} />

      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-combined)' }} />

      {showTextures ? (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: viewportProfile.layoutMode === 'tablet' ? 0.035 : 0.05,
          }}
          aria-hidden="true"
        >
          <filter id="page-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#page-grain)" />
        </svg>
      ) : null}
    </div>
  );
}

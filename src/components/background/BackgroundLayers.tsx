import { useEffect, useState } from 'react';
import { shouldRenderDecorativeTextures, useViewportProfile } from '../../lib/deviceProfile';

export default function BackgroundLayers() {
  const [showTextures, setShowTextures] = useState(false);
  const viewportProfile = useViewportProfile();

  useEffect(() => {
    setShowTextures(shouldRenderDecorativeTextures());
  }, [viewportProfile.layoutMode, viewportProfile.isCoarsePointer]);

  return (
    <div
      data-bg-layers
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-combined)' }} />

      {showTextures ? (
        <>
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: viewportProfile.layoutMode === 'tablet' ? 0.1 : 0.14,
              mixBlendMode: 'multiply',
            }}
            aria-hidden="true"
          >
            <defs>
              <filter id="dark-patches">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.032 0.024"
                  numOctaves="3"
                  seed="7"
                />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0.10
                          0 0 0 0 0.38
                          0 0 0 0 0.36
                          0 0 0 2.0 -1.1"
                />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#dark-patches)" />
          </svg>

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
            <filter id="bg-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#bg-grain)" />
          </svg>
        </>
      ) : null}
    </div>
  );
}

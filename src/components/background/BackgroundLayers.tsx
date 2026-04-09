export default function BackgroundLayers() {
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

      {/* dark patches - multiply only darkens, so transparent areas are no-ops */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.14,
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
            {/* light output = subtle darkening when multiplied against the teal */}
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

      {/* fine grain */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}
        aria-hidden="true"
      >
        <filter id="bg-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-grain)" />
      </svg>
    </div>
  );
}

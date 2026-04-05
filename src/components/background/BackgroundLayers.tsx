import { COLORS } from '../../lib/constants';

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
      {/* teal radial - pure CSS to avoid SVG filter edge artifacts */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(ellipse 110% 90% at 36% 52%, ${COLORS.bgTealBright} 0%, ${COLORS.bgTealMid} 22%, ${COLORS.bgTealDeep} 45%, ${COLORS.bgVoid} 70%)`,
        }}
      />

      {/* crimson glow from bottom-right */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(ellipse 95% 150% at 105% 90%, ${COLORS.bgCrimson} 0%, ${COLORS.bgCrimsonFade} 45%, transparent 82%)`,
        }}
      />

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

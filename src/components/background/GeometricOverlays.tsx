export default function GeometricOverlays() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            left: 'calc(57% - 38vw)',
            top: 'calc(50% - 38vw)',
            width: '76vw',
            height: '76vw',
            borderRadius: '50%',
            border: '1px solid rgba(240, 232, 236, 0.5)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 'calc(57% - 24vw)',
            top: 'calc(50% - 24vw)',
            width: '48vw',
            height: '48vw',
            borderRadius: '50%',
            border: '1px solid rgba(240, 232, 236, 0.5)',
          }}
        />

        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="h-line-fade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(240, 232, 236, 0)" />
              <stop offset="100%" stopColor="rgba(240, 232, 236, 0.75)" />
            </linearGradient>
          </defs>
          <line
            x1="60%" y1="100%"
            x2="100%" y2="10%"
            stroke="rgba(240, 232, 236, 0.75)"
            strokeWidth="1.5"
          />
          <rect x="70%" y="57%" width="30%" height="1.5" fill="url(#h-line-fade)" />
        </svg>
      </div>

      {/* Separate sibling at z-index 11 so this line renders above the menu index (z-index 10) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 11,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="v-line-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(240, 232, 236, 0.75)" />
            <stop offset="70%" stopColor="rgba(240, 232, 236, 0.75)" />
            <stop offset="100%" stopColor="rgba(240, 232, 236, 0)" />
          </linearGradient>
        </defs>
        <rect x="95.2%" y="0" width="1.5" height="70%" fill="url(#v-line-fade)" />
      </svg>
    </>
  );
}

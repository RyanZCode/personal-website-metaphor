import { COLORS } from '../../lib/constants';

interface Props { animationsEnabled: boolean; }

export default function BackgroundLines({ animationsEnabled }: Props) {
  // transform-box: fill-box + transform-origin: center makes each circle rotate
  // around its own center regardless of viewport size, no pixel math needed.
  // The existing "spin" keyframe (global.css) handles clockwise; spin-ccw handles counter.
  const playState = animationsEnabled ? 'running' : 'paused';
  const spinCw  = `spin 60s linear infinite ${playState}`;
  const spinCcw = `spin-ccw 40s linear infinite ${playState}`;

  const circleBase: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
  };

  return (
    <>
      <div
        data-geometric-overlays
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="h-line-fade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.textPrimaryGhost} />
              <stop offset="100%" stopColor={COLORS.textPrimaryDim} />
            </linearGradient>
          </defs>

          {/* pathLength=360 lets us express dasharray in degrees.
              dasharray="84 6": four 84-degree arcs separated by 6-degree gaps.
              dashoffset=87 (arc 84 + half-gap 3) centers the first gap at East (0 deg),
              putting all four gaps exactly at the cardinal directions. */}
          <circle
            cx="57%" cy="50%"
            r="38vw"
            fill="none"
            stroke={COLORS.textPrimaryFade}
            strokeWidth="3"
            pathLength="360"
            strokeDasharray="84 6"
            strokeDashoffset="87"
            style={{ ...circleBase, animation: spinCw }}
          />
          <circle
            cx="57%" cy="50%"
            r="24vw"
            fill="none"
            stroke={COLORS.textPrimaryFade}
            strokeWidth="3"
            pathLength="360"
            strokeDasharray="84 6"
            strokeDashoffset="87"
            style={{ ...circleBase, animation: spinCcw }}
          />

          <line
            x1="60%" y1="100%"
            x2="100%" y2="10%"
            stroke={COLORS.textPrimaryDim}
            strokeWidth="1"
          />
          <rect x="70%" y="57%" width="30%" height="3" fill="url(#h-line-fade)" />
        </svg>
      </div>

      {/* Separate sibling at z-index 11 so this line renders above the menu index (z-index 10) */}
      <svg
        data-geometric-overlays
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
            <stop offset="0%" stopColor={COLORS.textPrimaryDim} />
            <stop offset="70%" stopColor={COLORS.textPrimaryDim} />
            <stop offset="100%" stopColor={COLORS.textPrimaryGhost} />
          </linearGradient>
        </defs>
        <rect x="95.2%" y="0" width="3" height="70%" fill="url(#v-line-fade)" />
      </svg>
    </>
  );
}

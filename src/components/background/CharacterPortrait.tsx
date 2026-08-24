import type { LayoutMode } from '../../lib/deviceProfile';
import { COLORS } from '../../lib/constants';

interface Props {
  animationsEnabled: boolean;
  layoutMode?: LayoutMode;
}

export default function CharacterPortrait({ animationsEnabled, layoutMode = 'desktop' }: Props) {
  const bobAnim  = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  const isTablet = layoutMode === 'tablet';
  const isCompact = layoutMode === 'compact';
  return (
    <div
      style={{
        animation: bobAnim,
        position: 'absolute',
        left: isCompact ? '0%' : isTablet ? '40%' : '28%',
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 1,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        opacity: isCompact ? 0.26 : isTablet ? 0.72 : 1,
        WebkitMaskImage:
          isCompact
            ? 'linear-gradient(to right, transparent 0%, black 10%, black 78%, transparent 100%), linear-gradient(to top, transparent 0%, black 12%)'
            : 'linear-gradient(to right, transparent 0%, black 20%), linear-gradient(to top, transparent 0%, black 8%)',
        maskImage:
          isCompact
            ? 'linear-gradient(to right, transparent 0%, black 10%, black 78%, transparent 100%), linear-gradient(to top, transparent 0%, black 12%)'
            : 'linear-gradient(to right, transparent 0%, black 20%), linear-gradient(to top, transparent 0%, black 8%)',
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
      }}
    >
      {/* purple gradient behind the portrait */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse ${isCompact ? '60% 55%' : '45% 50%'} at 50% 50%, ${COLORS.portraitGlow} 0%, transparent 100%)`,
          animation: glowAnim,
        }}
      />

      <img
        src="/assets/coby-main.webp"
        alt="Coby sitting pretty"
        data-portrait
        draggable={false}
        style={{
          height: isCompact ? '86%' : isTablet ? '94%' : '105%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          transform: isCompact ? 'translateX(4vw)' : 'none',
          position: 'relative',
          zIndex: 1,
          maxWidth: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
    </div>
  );
}

import { COLORS } from '../../lib/constants';

interface Props { animationsEnabled: boolean; }

export default function CharacterPortrait({ animationsEnabled }: Props) {
  const bobAnim  = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  return (
    <div
      style={{
        animation: bobAnim,
        position: 'absolute',
        left: '28%',
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 1,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 20%), ' +
          'linear-gradient(to top, transparent 0%, black 8%)',
        maskImage:
          'linear-gradient(to right, transparent 0%, black 20%), ' +
          'linear-gradient(to top, transparent 0%, black 8%)',
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
      }}
    >
      {/* purple gradient behind the portrait */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 45% 50% at 50% 50%, ${COLORS.portraitGlow} 0%, transparent 100%)`,
          animation: glowAnim,
        }}
      />

      <img
        src="/assets/coby-main.webp"
        alt="Coby sitting pretty"
        data-portrait
        draggable={false}
        style={{
          height: '105%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'bottom center',
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

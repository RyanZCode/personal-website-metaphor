import type { LayoutMode } from '../../lib/deviceProfile';
import { COLORS } from '../../lib/constants';

// Inside the "0" div in MenuIndex, which has writingMode: vertical-rl + rotate(180deg).
// left: 25% ends up visually toward the right side of the "0" after the flip
export default function CommandLabel({ layoutMode = 'desktop' }: { layoutMode?: LayoutMode }) {
  if (layoutMode === 'compact') {
    return null;
  }

  return (
    <span
      data-command-label
      style={{
        position: 'absolute',
        left: '25%',
        top: '55%',
        transform: 'translateY(-50%)',
        fontFamily: '"Cinzel", serif',
        fontSize: layoutMode === 'tablet' ? '1rem' : '1.25vw',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: COLORS.textPrimary,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      Command
    </span>
  );
}

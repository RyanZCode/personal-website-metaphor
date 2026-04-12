import { COLORS } from '../../lib/constants';

export default function StatsPanel() {
  return (
    <div
      data-stats-panel
      style={{
        // Extends ~4rem past the right viewport edge - viewport clips it naturally
        marginRight: '-4rem',
        background: COLORS.chipBg,
        // Trapezoid: left side angled, right side straight (disappears off screen)
        clipPath: 'polygon(3rem 0%, 100% 0%, 100% 100%, 0% 100%)',
        padding: '0.8rem 7rem 0.5rem 5rem',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '0 1rem',
        marginBottom: '0.35rem',
      }}>
        <span style={{
          gridColumn: 1, gridRow: 1,
          fontFamily: '"Cinzel", serif',
          fontSize: 'var(--font-fluid-lg)',
          lineHeight: 1,
          transform: 'scaleY(0.85)',
          transformOrigin: 'top left',
          letterSpacing: '-0.05em',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: COLORS.chipTextSub,
        }}>
          Name
        </span>
        <span style={{
          gridColumn: 1, gridRow: 2,
          fontSize: 'var(--font-fluid-xl)',
          color: COLORS.chipTextSub,
          lineHeight: 1,
          textAlign: 'center',
          alignSelf: 'center',
        }}>
          ✒
        </span>
        <span style={{
          gridColumn: 2, gridRow: 2,
          alignSelf: 'center',
          fontFamily: '"Cinzel", serif',
          fontSize: 'var(--font-fluid-2xl)',
          fontWeight: 900,
          letterSpacing: '0.1em',
          color: COLORS.chipTextStrong,
        }}>
          Ryan Zhou
        </span>
      </div>

      <span style={{
        fontFamily: 'Cambria, "Times New Roman", serif',
        fontSize: 'var(--font-fluid-sm)',
        letterSpacing: '0.08em',
        color: COLORS.chipTextFaint,
        display: 'block',
        textAlign: 'center',
      }}>
        Design inspired by Metaphor: ReFantazio
      </span>
    </div>
  );
}

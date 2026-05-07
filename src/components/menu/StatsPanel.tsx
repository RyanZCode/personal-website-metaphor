import type { LayoutMode } from '../../lib/deviceProfile';
import { COLORS } from '../../lib/constants';

export default function StatsPanel({ layoutMode = 'desktop' }: { layoutMode?: LayoutMode }) {
  if (layoutMode === 'compact') {
    return null;
  }

  return (
    <div
      data-stats-panel
      style={{
        // Extends ~4rem past the right viewport edge - viewport clips it naturally
        marginRight: layoutMode === 'tablet' ? '-2.5rem' : '-4rem',
        background: COLORS.chipBg,
        // Trapezoid: left side angled, right side straight (disappears off screen)
        clipPath: 'polygon(5.5rem 0%, 100% 0%, 100% 100%, 0% 100%)',
        padding: layoutMode === 'tablet' ? '0.9rem 5rem 0.7rem 7rem' : '1.1rem 8rem 0.8rem 9rem',
        transform: layoutMode === 'tablet' ? 'scale(0.9)' : 'none',
        transformOrigin: 'right bottom',
      }}
    >
      {/* Name gets its own prominent row */}
      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: 'var(--font-fluid-xs)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: COLORS.chipTextSub,
          marginBottom: '0.1rem',
        }}>
          Name
        </div>
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: 'var(--font-fluid-2xl)',
          fontWeight: 900,
          letterSpacing: '0.08em',
          color: COLORS.chipTextStrong,
          lineHeight: 1.1,
        }}>
          Ryan Zhou
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: `linear-gradient(to right, ${COLORS.chipTextSub}44, transparent)`,
        marginBottom: '0.55rem',
      }} />

      {/* Remaining stats - single grid so label column auto-sizes to widest entry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '1rem', rowGap: '0.3rem', alignItems: 'baseline' }}>
        {([
          { label: 'Location',  value: 'Toronto, ON' },
          { label: 'Archetype', value: 'Software Developer' },
          { label: 'School',    value: 'University of Waterloo' },
          { label: 'Year',      value: 'III' },
        ] as const).flatMap(({ label, value }) => [
          <span key={`${label}-l`} style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 'var(--font-fluid-xs)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLORS.chipTextSub,
            whiteSpace: 'nowrap',
          }}>
            {label}
          </span>,
          <span key={`${label}-v`} style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 'var(--font-fluid-sm)',
            fontWeight: 900,
            letterSpacing: '0.04em',
            color: COLORS.chipTextStrong,
          }}>
            {value}
          </span>,
        ])}
      </div>
    </div>
  );
}

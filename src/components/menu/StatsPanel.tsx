export default function StatsPanel() {
  return (
    <div
      data-stats-panel
      style={{
        // Extends ~4rem past the right viewport edge - viewport clips it naturally
        marginRight: '-4rem',
        background: '#fff',
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
          fontSize: '1.2rem',
          lineHeight: 1,
          transform: 'scaleY(0.85)',
          transformOrigin: 'top left',
          letterSpacing: '-0.05em',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'rgba(0, 0, 0, 0.45)',
        }}>
          Name
        </span>
        <span style={{
          gridColumn: 1, gridRow: 2,
          fontSize: '1.6rem',
          color: 'rgba(0, 0, 0, 0.45)',
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
          fontSize: '2rem',
          fontWeight: 900,
          letterSpacing: '0.1em',
          color: 'rgba(0, 0, 0, 0.85)',
        }}>
          Ryan Zhou
        </span>
      </div>

      <span style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '0.8rem',
        letterSpacing: '0.08em',
        color: 'rgba(0, 0, 0, 0.35)',
        textTransform: 'uppercase',
        display: 'block',
      }}>
        Design inspired by Metaphor: ReFantazio
      </span>
    </div>
  );
}

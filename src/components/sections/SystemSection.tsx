import { COLORS } from '../../lib/constants';
import SectionBackground from '../background/SectionBackground';

interface SystemSectionProps {
  isActive: boolean;
  cursorStyle: 'default' | 'metaphor';
  onCursorChange: (style: 'default' | 'metaphor') => void;
  bgInverted: boolean;
  onBgInvertedChange: (inverted: boolean) => void;
  animationsEnabled: boolean;
  onAnimationsToggle: () => void;
}

const CURSOR_OPTIONS: Array<{ id: 'default' | 'metaphor'; label: string; description: string }> = [
  { id: 'default', label: 'Default', description: 'System cursor' },
  { id: 'metaphor', label: 'Metaphor', description: 'Custom game cursor' },
];

export default function SystemSection({ isActive, cursorStyle, onCursorChange, bgInverted, onBgInvertedChange, animationsEnabled, onAnimationsToggle }: SystemSectionProps) {
  return (
    <section
      aria-hidden={!isActive}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '8vh 7vw 6vh 8vw',
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
      }}
    >
      <SectionBackground />
      <div
        data-system-panel
        style={{
          position: 'relative',
          width: 'min(54vw, 58rem)',
          minHeight: '68vh',
          padding: '3.5rem 3.75rem 3rem',
          background: 'linear-gradient(140deg, rgba(9, 25, 22, 0.92), rgba(4, 7, 7, 0.86))',
          border: '1px solid rgba(240, 232, 236, 0.18)',
          boxShadow: '0 0 0 1px rgba(35, 175, 155, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
          clipPath: 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(35, 175, 155, 0.12), transparent 38%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '2.5rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                marginBottom: '1rem',
                padding: '0.3rem 0.8rem',
                backgroundColor: 'hsl(175, 55%, 45%)',
                color: COLORS.black,
                fontSize: 'var(--font-fluid-md)',
                fontWeight: 900,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Settings
            </div>
            <h2
              style={{
                fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.08em',
                textTransform: 'uppercase',
              }}
            >
              System
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                fontSize: 'var(--font-fluid-sm)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'hsl(175, 55%, 45%)',
                borderBottom: '1px solid rgba(35, 175, 155, 0.25)',
                paddingBottom: '0.5rem',
              }}
            >
              Cursor
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {CURSOR_OPTIONS.map((opt) => {
                const selected = cursorStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onCursorChange(opt.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: selected
                        ? 'rgba(35, 175, 155, 0.18)'
                        : 'rgba(240, 232, 236, 0.04)',
                      border: `1px solid ${selected ? 'hsl(175, 55%, 45%)' : 'rgba(240, 232, 236, 0.12)'}`,
                      color: selected ? 'hsl(175, 55%, 60%)' : 'var(--text-muted)',
                      fontSize: 'var(--font-fluid-md)',
                      fontWeight: selected ? 700 : 400,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: '"Cinzel", serif',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      alignItems: 'flex-start',
                      minWidth: '8rem',
                    }}
                  >
                    <span>{opt.label}</span>
                    <span
                      style={{
                        fontSize: 'var(--font-fluid-xs)',
                        fontWeight: 400,
                        letterSpacing: '0.05em',
                        opacity: 0.6,
                        textTransform: 'none',
                      }}
                    >
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                fontSize: 'var(--font-fluid-sm)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'hsl(175, 55%, 45%)',
                borderBottom: '1px solid rgba(35, 175, 155, 0.25)',
                paddingBottom: '0.5rem',
              }}
            >
              Background
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {([
                { id: false, label: 'Default', description: 'Blue left, red right' },
                { id: true,  label: 'Inverted', description: 'Red left, blue right' },
              ] as const).map((opt) => {
                const selected = bgInverted === opt.id;
                return (
                  <button
                    key={opt.label}
                    onClick={() => onBgInvertedChange(opt.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: selected ? 'rgba(35, 175, 155, 0.18)' : 'rgba(240, 232, 236, 0.04)',
                      border: `1px solid ${selected ? 'hsl(175, 55%, 45%)' : 'rgba(240, 232, 236, 0.12)'}`,
                      color: selected ? 'hsl(175, 55%, 60%)' : 'var(--text-muted)',
                      fontSize: 'var(--font-fluid-md)',
                      fontWeight: selected ? 700 : 400,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: '"Cinzel", serif',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      alignItems: 'flex-start',
                      minWidth: '8rem',
                    }}
                  >
                    <span>{opt.label}</span>
                    <span
                      style={{
                        fontSize: 'var(--font-fluid-xs)',
                        fontWeight: 400,
                        letterSpacing: '0.05em',
                        opacity: 0.6,
                        textTransform: 'none',
                      }}
                    >
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                fontSize: 'var(--font-fluid-sm)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'hsl(175, 55%, 45%)',
                borderBottom: '1px solid rgba(35, 175, 155, 0.25)',
                paddingBottom: '0.5rem',
              }}
            >
              Animations
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {([
                { id: true,  label: 'On',  description: 'Full motion effects' },
                { id: false, label: 'Off', description: 'Reduced motion' },
              ] as const).map((opt) => {
                const selected = animationsEnabled === opt.id;
                return (
                  <button
                    key={opt.label}
                    onClick={onAnimationsToggle}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: selected ? 'rgba(35, 175, 155, 0.18)' : 'rgba(240, 232, 236, 0.04)',
                      border: `1px solid ${selected ? 'hsl(175, 55%, 45%)' : 'rgba(240, 232, 236, 0.12)'}`,
                      color: selected ? 'hsl(175, 55%, 60%)' : 'var(--text-muted)',
                      fontSize: 'var(--font-fluid-md)',
                      fontWeight: selected ? 700 : 400,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: selected ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: '"Cinzel", serif',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      alignItems: 'flex-start',
                      minWidth: '8rem',
                    }}
                  >
                    <span>{opt.label}</span>
                    <span
                      style={{
                        fontSize: 'var(--font-fluid-xs)',
                        fontWeight: 400,
                        letterSpacing: '0.05em',
                        opacity: 0.6,
                        textTransform: 'none',
                      }}
                    >
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

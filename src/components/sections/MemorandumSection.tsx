import { COLORS } from '../../lib/constants';
import SectionBackground from '../background/SectionBackground';
import ScrollViewport from '../shared/ScrollViewport';

interface MemorandumSectionProps {
  isActive: boolean;
}

interface Entry {
  title: string;
  category: string;
}

const CATEGORIES = ['Tech', 'Gaming', 'Misc'];

const ENTRIES: Entry[] = [
  { title: 'Test1', category: 'Tech' },
  { title: 'Test2', category: 'Gaming' },
  { title: 'Test2', category: 'Misc' },
];

const TOTAL_PLANNED = 20;
const collectionPct = Math.round((ENTRIES.length / TOTAL_PLANNED) * 100);

const accent = 'hsl(120, 50%, 40%)';
const accentBright = 'hsl(120, 55%, 50%)';

export default function MemorandumSection({ isActive }: MemorandumSectionProps) {
  return (
    <section
      aria-hidden={!isActive}
      data-memorandum-section
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SectionBackground />
      {/* Header: title + prompt */}
      <div
        data-section-title
        style={{
          position: 'relative',
          padding: '4vh 7vw 0 8vw',
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-fluid-sm)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: COLORS.textPrimaryFade,
            marginBottom: '0.4rem',
          }}
        >
          Which entry?
        </div>
        <div
          style={{
            fontSize: 'clamp(3rem, 8vw, 9rem)',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            textTransform: 'uppercase',
            lineHeight: 0.9,
            color: COLORS.textPrimary,
            marginBottom: '1.5rem',
          }}
        >
          Memorandum
        </div>

        {/* Category tabs */}
        <div
          data-memorandum-tabs
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: `2px solid ${accent}44`,
          }}
        >
          {CATEGORIES.map((cat, i) => {
            const active = i === 0;
            return (
              <div
                key={cat}
                style={{
                  padding: '0.4rem 1.2rem',
                  fontSize: 'var(--font-fluid-sm)',
                  fontWeight: active ? 700 : 400,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: active ? COLORS.black : COLORS.textPrimaryFade,
                  background: active ? accent : 'transparent',
                  borderBottom: active ? `2px solid ${accentBright}` : '2px solid transparent',
                  marginBottom: '-2px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {cat}
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection counter */}
      <div
        style={{
          position: 'absolute',
          top: '4vh',
          right: '4vw',
          textAlign: 'right',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-fluid-xs)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: COLORS.textPrimaryFade,
            marginBottom: '0.1rem',
          }}
        >
          Collection
        </div>
        <div
          style={{
            fontSize: 'clamp(2rem, 5vw, 5rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: COLORS.textPrimary,
            lineHeight: 1,
          }}
        >
          {collectionPct}
          <span style={{ fontSize: '0.4em', opacity: 0.6 }}>%</span>
        </div>
      </div>

      {/* Body: list left, decorative panel right */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          marginTop: '1.5rem',
        }}
      >
        {/* Entry list */}
        <ScrollViewport
          style={{
            width: '48vw',
          }}
          viewportStyle={{
            padding: '0.5rem 0 4vh 8vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}
          thumbColor="rgba(188, 255, 206, 0.72)"
          thumbHoverColor="rgba(118, 255, 156, 0.98)"
        >
          {ENTRIES.map((entry, i) => {
            const active = i === 0;
            return (
              <div
                key={`${entry.title}-${i}`}
                data-memorandum-row
                style={{
                  position: 'relative',
                  padding: '0.7rem 1rem 0.7rem 0',
                  borderBottom: '1px solid rgba(240, 232, 236, 0.07)',
                  background: active ? `${accent}28` : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-8vw',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: `linear-gradient(90deg, ${accent}44, ${accent}18 60%, transparent)`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      fontSize: active ? 'var(--font-fluid-md)' : 'var(--font-fluid-sm)',
                      fontWeight: active ? 700 : 400,
                      color: active ? COLORS.textPrimary : COLORS.textPrimaryDim,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.title}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-fluid-2xs)',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: active ? accentBright : COLORS.textPrimaryFaint,
                      flexShrink: 0,
                      marginLeft: '1rem',
                    }}
                  >
                    {entry.category}
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollViewport>

        {/* Right decorative panel */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `1px solid ${accent}22`,
          }}
        >
          {/* Decorative large text blocks */}
          {['NOTES', 'RECORD', 'ARCHIVE', 'LOG'].map((word, i) => (
            <div
              key={word}
              style={{
                position: 'absolute',
                right: `${-2 + i * 3}vw`,
                top: `${8 + i * 22}%`,
                fontSize: 'clamp(3rem, 8vw, 9rem)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
                color: accent,
                opacity: 0.08 + i * 0.02,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {word}
            </div>
          ))}

          {/* Accent bar */}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '8%',
              width: '3px',
              height: '25%',
              background: accent,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '55%',
              left: '20%',
              width: '3px',
              height: '18%',
              background: accentBright,
              opacity: 0.3,
            }}
          />
        </div>
      </div>
    </section>
  );
}

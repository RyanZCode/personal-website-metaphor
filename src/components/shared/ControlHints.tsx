import { COLORS } from '../../lib/constants';

interface Props {
  animationsEnabled: boolean;
}

const HINTS = [
  { keys: 'W / S', label: 'Navigate' },
  { keys: 'Space', label: 'Confirm' },
  { keys: 'C',     label: 'Back' },
];

const chipStyle: React.CSSProperties = {
  background: COLORS.chipBg,
  clipPath: 'polygon(0.8rem 0%, 100% 0%, calc(100% - 0.8rem) 100%, 0% 100%)',
  padding: '0.45rem 1.8rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const keyStyle: React.CSSProperties = {
  fontFamily: '"Cinzel", serif',
  fontSize: '0.55rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: COLORS.chipTextKey,
  border: `1px solid ${COLORS.chipBorder}`,
  padding: '0.1rem 0.35rem',
  borderRadius: '2px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: '"Cinzel", serif',
  fontSize: '0.5rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: COLORS.chipText,
};

export default function ControlHints({ animationsEnabled }: Props) {
  return (
    <div data-control-hints style={{ display: 'flex', gap: '0.3rem' }}>
      {HINTS.map(({ keys, label }) => (
        <div key={keys} style={chipStyle}>
          <span style={keyStyle}>{keys}</span>
          <span style={labelStyle}>{label}</span>
        </div>
      ))}
      <div style={chipStyle}>
        <span style={keyStyle}>F</span>
        <span style={labelStyle}>Toggle Animations</span>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '0.45rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          position: 'relative',
          display: 'inline-block',
        }}>
          {/* hidden "Off" always reserves the max width */}
          <span style={{ visibility: 'hidden' }}>Off</span>
          <span style={{
            position: 'absolute',
            left: 0,
            color: animationsEnabled ? COLORS.chipTextOn : COLORS.chipTextOff,
          }}>
            {animationsEnabled ? 'On' : 'Off'}
          </span>
        </span>
      </div>
    </div>
  );
}

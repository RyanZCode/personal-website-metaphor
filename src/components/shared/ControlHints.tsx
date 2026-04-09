import { COLORS } from '../../lib/constants';

interface Props {
  animationsEnabled: boolean;
  mode: 'menu' | 'section';
  onConfirm?: () => void;
  onBack?: () => void;
  onAnimationsToggle?: () => void;
}

const baseChipStyle: React.CSSProperties = {
  background: COLORS.chipBg,
  clipPath: 'polygon(0.8rem 0%, 100% 0%, calc(100% - 0.8rem) 100%, 0% 100%)',
  padding: '0.45rem 1.8rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const keyStyle: React.CSSProperties = {
  fontFamily: '"Cinzel", serif',
  fontSize: 'var(--font-fluid-2xs)',
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
  fontSize: 'var(--font-fluid-2xs)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: COLORS.chipText,
};

function Chip({ keys, label, onClick }: { keys: string; label: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          ...baseChipStyle,
          border: 'none',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        <span style={keyStyle}>{keys}</span>
        <span style={labelStyle}>{label}</span>
      </button>
    );
  }
  return (
    <div style={baseChipStyle}>
      <span style={keyStyle}>{keys}</span>
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

export default function ControlHints({ animationsEnabled, mode, onConfirm, onBack, onAnimationsToggle }: Props) {
  return (
    <div data-control-hints style={{ display: 'flex', gap: '0.3rem' }}>
      {mode === 'menu' && <Chip keys="W / S" label="Navigate" />}

      {mode === 'menu' && (
        <Chip keys="Space" label="Confirm" onClick={onConfirm} />
      )}

      {mode === 'section' && (
        <Chip keys="C" label="Back" onClick={onBack} />
      )}

      <button
          onClick={onAnimationsToggle}
          style={{
            ...baseChipStyle,
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <span style={keyStyle}>F</span>
          <span style={labelStyle}>Toggle Animations</span>
          <span style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 'var(--font-fluid-2xs)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            position: 'relative',
            display: 'inline-block',
          }}>
            <span style={{ visibility: 'hidden' }}>Off</span>
            <span style={{
              position: 'absolute',
              left: 0,
              color: animationsEnabled ? COLORS.chipTextOn : COLORS.chipTextOff,
            }}>
              {animationsEnabled ? 'On' : 'Off'}
            </span>
          </span>
        </button>
    </div>
  );
}

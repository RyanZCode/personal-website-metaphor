import { COLORS } from '../../lib/constants';

interface Props {
  animationsEnabled: boolean;
  mode: 'menu' | 'page';
  activePage?: 'about' | 'skills' | 'experience' | 'contact' | 'memorandum' | 'system' | null;
  hintVariant?: 'memorandum-detail';
  showScrollHint?: boolean;
  onConfirm?: () => void;
  onBack?: () => void;
  onShortcutClick?: (key: string) => void;
  onAnimationsToggle?: () => void;
}

interface HintChip {
  id: string;
  keys: string;
  label: string;
  onClick?: () => void;
  hidden?: boolean;
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
  color: COLORS.textPrimary,
  background: 'rgba(0, 0, 0, 0.88)',
  border: '1px solid rgba(0, 0, 0, 0.88)',
  padding: '0.22rem 0.35rem',
  borderRadius: '3px',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'Cambria, "Times New Roman", serif',
  fontSize: 'var(--font-fluid-xs)',
  letterSpacing: '0.06em',
  color: COLORS.chipText,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
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

export default function ControlHints({ animationsEnabled, mode, activePage, hintVariant, showScrollHint = false, onConfirm, onBack, onShortcutClick, onAnimationsToggle }: Props) {
  const chips: HintChip[] = [];

  if (mode === 'menu') {
    chips.push(
      { id: 'menu-navigate', keys: 'W / S', label: 'Navigate' },
      { id: 'menu-confirm', keys: 'Space', label: 'Confirm', onClick: onConfirm },
    );
  }

  if (mode === 'page') {
    switch (activePage) {
      case 'about':
      case 'skills':
      case 'experience':
        chips.push({
          id: 'page-scroll',
          keys: 'W / S',
          label: 'Scroll',
          hidden: !showScrollHint,
        });
        break;
      case 'contact':
        chips.push(
          { id: 'page-select', keys: 'W / S', label: 'Select' },
          { id: 'page-confirm', keys: 'Space', label: 'Confirm', onClick: onConfirm },
        );
        break;
      case 'memorandum':
        if (hintVariant === 'memorandum-detail') {
          chips.push(
            {
              id: 'page-scroll',
              keys: 'W / S',
              label: 'Scroll',
              hidden: !showScrollHint,
            },
            { id: 'page-prev-page', keys: 'A', label: 'Back', onClick: () => onShortcutClick?.('a') },
            { id: 'page-next-page', keys: 'D', label: 'Next', onClick: () => onShortcutClick?.('d') },
            { id: 'page-prev-entry', keys: '1', label: 'Previous', onClick: () => onShortcutClick?.('1') },
            { id: 'page-next-entry', keys: '3', label: 'Next', onClick: () => onShortcutClick?.('3') },
          );
        } else {
          chips.push(
            { id: 'page-select', keys: 'W / S', label: 'Select' },
            { id: 'page-confirm', keys: 'Space', label: 'Confirm', onClick: onConfirm },
          );
        }
        break;
      case 'system':
        chips.push(
          { id: 'page-select', keys: 'W / S', label: 'Select' },
          { id: 'page-change', keys: 'A / D', label: 'Change' },
        );
        break;
      default:
        break;
    }

    chips.push({ id: 'page-back', keys: 'C', label: 'Back', onClick: onBack });
  }

  chips.push({ id: 'toggle-animations', keys: 'F', label: `Toggle Animations ${animationsEnabled ? 'On' : 'Off'}`, onClick: onAnimationsToggle });

  return (
    <div data-control-hints key={`${mode}-${activePage ?? 'menu'}`} style={{ display: 'flex', gap: '0.3rem' }}>
      {chips.map((chip) => (
        <div
          key={chip.id}
          style={{
            visibility: chip.hidden ? 'hidden' : 'visible',
            pointerEvents: chip.hidden ? 'none' : 'auto',
            opacity: chip.hidden ? 0 : 1,
            transform: chip.hidden ? 'translateX(0.35rem)' : 'translateX(0)',
            transition: chip.id === 'page-scroll'
              ? 'opacity 150ms ease, transform 150ms ease, visibility 150ms ease'
              : 'none',
          }}
        >
          {chip.id === 'toggle-animations' ? (
            <button
              onClick={chip.onClick}
              style={{
                ...baseChipStyle,
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <span style={keyStyle}>{chip.keys}</span>
              <span style={labelStyle}>Toggle Animations</span>
              <span style={{
                fontFamily: 'Cambria, "Times New Roman", serif',
                fontSize: 'var(--font-fluid-xs)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
              }}>
                <span style={{ visibility: 'hidden' }}>Off</span>
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: animationsEnabled ? COLORS.chipTextOn : COLORS.chipTextOff,
                }}>
                  {animationsEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
          ) : (
            <Chip keys={chip.keys} label={chip.label} onClick={chip.onClick} />
          )}
        </div>
      ))}
    </div>
  );
}

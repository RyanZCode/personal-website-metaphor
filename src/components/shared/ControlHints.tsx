import type { LayoutMode } from '../../lib/deviceProfile';
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
  layoutMode?: LayoutMode;
  touchMode?: boolean;
}

interface HintChip {
  id: string;
  keys: string;
  label: string;
  onClick?: () => void;
  hidden?: boolean;
  variant?: 'default' | 'back';
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

function Chip({
  keys,
  label,
  onClick,
  variant = 'default',
}: {
  keys: string;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'back';
}) {
  const isBackChip = variant === 'back';
  const sharedStyle: React.CSSProperties = {
    ...baseChipStyle,
    position: 'relative',
    overflow: 'hidden',
    border: isBackChip ? `1px solid ${COLORS.chipBorder}` : 'none',
    background: isBackChip
      ? 'linear-gradient(135deg, rgba(255, 247, 233, 1), rgba(255, 221, 170, 0.98))'
      : COLORS.chipBg,
    boxShadow: isBackChip
      ? '0 0 0 1px rgba(255, 240, 214, 0.55), 0 0.7rem 1.4rem rgba(0, 0, 0, 0.28)'
      : 'none',
    padding: isBackChip ? '0.62rem 2rem 0.62rem 1.7rem' : baseChipStyle.padding,
    gap: isBackChip ? '0.52rem' : baseChipStyle.gap,
    transform: isBackChip ? 'translateY(-0.08rem)' : 'none',
  };
  const icon = isBackChip ? (
    <span
      aria-hidden="true"
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: 'var(--font-fluid-xs)',
        fontWeight: 700,
        lineHeight: 1,
        color: COLORS.chipTextStrong,
        transform: 'translateY(-0.03rem)',
      }}
    >
      {'<'}
    </span>
  ) : null;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          ...sharedStyle,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        {icon}
        <span style={keyStyle}>{keys}</span>
        <span
          style={{
            ...labelStyle,
            color: isBackChip ? COLORS.chipTextStrong : labelStyle.color,
            fontWeight: isBackChip ? 700 : 400,
            letterSpacing: isBackChip ? '0.08em' : labelStyle.letterSpacing,
          }}
        >
          {label}
        </span>
      </button>
    );
  }
  return (
    <div style={sharedStyle}>
      {icon}
      <span style={keyStyle}>{keys}</span>
      <span
        style={{
          ...labelStyle,
          color: isBackChip ? COLORS.chipTextStrong : labelStyle.color,
          fontWeight: isBackChip ? 700 : 400,
          letterSpacing: isBackChip ? '0.08em' : labelStyle.letterSpacing,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function ControlHints({
  animationsEnabled,
  mode,
  activePage,
  hintVariant,
  showScrollHint = false,
  onConfirm,
  onBack,
  onShortcutClick,
  onAnimationsToggle,
  layoutMode = 'desktop',
  touchMode = false,
}: Props) {
  const chips: HintChip[] = [];
  const isCompactTouch = layoutMode === 'compact' && touchMode;
  const navigateKeys = touchMode ? 'Swipe' : 'W / S';
  const confirmKeys = touchMode ? 'Tap' : 'Space';
  const previousPageKeys = touchMode ? 'Tap' : 'A';
  const nextPageKeys = touchMode ? 'Tap' : 'D';
  const previousEntryKeys = touchMode ? 'Tap' : '1';
  const nextEntryKeys = touchMode ? 'Tap' : '3';

  const backLabel = activePage === 'memorandum' && hintVariant === 'memorandum-detail'
    ? 'Back to Memorandum'
    : mode === 'page'
      ? 'Back to Main Menu'
      : 'Back';
  const clickableBackKeys = touchMode ? 'Tap' : 'C / Click';

  if (mode === 'menu') {
    chips.push(
      { id: 'menu-navigate', keys: navigateKeys, label: 'Navigate' },
      { id: 'menu-confirm', keys: confirmKeys, label: 'Confirm', onClick: onConfirm },
    );
  }

  if (mode === 'page') {
    switch (activePage) {
      case 'about':
      case 'skills':
      case 'experience':
        chips.push({
          id: 'page-scroll',
          keys: navigateKeys,
          label: 'Scroll',
          hidden: !showScrollHint,
        });
        break;
      case 'contact':
        if (!isCompactTouch) {
          chips.push({ id: 'page-select', keys: navigateKeys, label: 'Select' });
        }
        chips.push({ id: 'page-confirm', keys: confirmKeys, label: 'Confirm', onClick: onConfirm });
        break;
      case 'memorandum':
        if (hintVariant === 'memorandum-detail') {
          if (touchMode) {
            chips.push(
              { id: 'page-prev-page', keys: previousPageKeys, label: 'Back', onClick: () => onShortcutClick?.('a') },
              { id: 'page-next-page', keys: nextPageKeys, label: 'Next', onClick: () => onShortcutClick?.('d') },
            );
          } else {
            chips.push(
              {
                id: 'page-scroll',
                keys: navigateKeys,
                label: 'Scroll',
                hidden: !showScrollHint,
              },
              { id: 'page-prev-page', keys: previousPageKeys, label: 'Back', onClick: () => onShortcutClick?.('a') },
              { id: 'page-next-page', keys: nextPageKeys, label: 'Next', onClick: () => onShortcutClick?.('d') },
              { id: 'page-prev-entry', keys: previousEntryKeys, label: 'Previous', onClick: () => onShortcutClick?.('1') },
              { id: 'page-next-entry', keys: nextEntryKeys, label: 'Next', onClick: () => onShortcutClick?.('3') },
            );
          }
        } else {
          if (!isCompactTouch) {
            chips.push({ id: 'page-select', keys: navigateKeys, label: 'Select' });
          }
          chips.push({ id: 'page-confirm', keys: confirmKeys, label: 'Confirm', onClick: onConfirm });
        }
        break;
      case 'system':
        if (!isCompactTouch) {
          chips.push(
            { id: 'page-select', keys: navigateKeys, label: 'Select' },
            { id: 'page-change', keys: touchMode ? 'Tap' : 'A / D', label: 'Change' },
          );
        }
        break;
      default:
        break;
    }

    chips.push({
      id: 'page-back',
      keys: clickableBackKeys,
      label: backLabel,
      onClick: onBack,
      variant: 'back',
    });
  }

  chips.push({ id: 'toggle-animations', keys: 'F', label: `Toggle Animations ${animationsEnabled ? 'On' : 'Off'}`, onClick: onAnimationsToggle });

  return (
    <div
      data-control-hints
      key={`${mode}-${activePage ?? 'menu'}`}
      style={{
        display: 'flex',
        gap: '0.3rem',
        flexWrap: layoutMode === 'compact' ? 'wrap' : 'nowrap',
        justifyContent: layoutMode === 'compact' ? 'flex-end' : 'flex-start',
        alignItems: layoutMode === 'compact' ? 'flex-end' : 'stretch',
        alignContent: layoutMode === 'compact' ? 'flex-end' : 'stretch',
        width: layoutMode === 'compact' ? 'calc(100vw - 4vw)' : undefined,
        maxWidth: layoutMode === 'compact' ? '100%' : undefined,
      }}
    >
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
            <Chip
              keys={chip.keys}
              label={chip.label}
              onClick={chip.onClick}
              variant={chip.variant}
            />
          )}
        </div>
      ))}
    </div>
  );
}

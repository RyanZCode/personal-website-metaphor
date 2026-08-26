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
  ariaLabel?: string;
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
  minHeight: '2.02rem',
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

function HintHoverOverlay() {
  return (
    <span
      data-hint-hover-overlay
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 1)',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

function Chip({
  keys,
  label,
  ariaLabel,
  onClick,
  variant = 'default',
}: {
  keys: string;
  label: string;
  ariaLabel?: string;
  onClick?: () => void;
  variant?: 'default' | 'back';
}) {
  const isBackChip = variant === 'back';
  const sharedStyle: React.CSSProperties = {
    ...baseChipStyle,
    position: 'relative',
    overflow: 'hidden',
    border: 'none',
    background: COLORS.chipBg,
    boxShadow: 'none',
    padding: isBackChip ? '0.45rem 1.8rem 0.45rem 1.55rem' : baseChipStyle.padding,
    gap: isBackChip ? '0.45rem' : baseChipStyle.gap,
    minHeight: isBackChip ? '2.55rem' : baseChipStyle.minHeight,
  };
  const icon = isBackChip && !keys ? (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        zIndex: 1,
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
        type="button"
        aria-label={ariaLabel}
        data-hint-chip
        data-hint-variant={variant}
        onClick={onClick}
        style={{
          ...sharedStyle,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        <HintHoverOverlay />
        {icon}
        {keys && <span style={{ ...keyStyle, position: 'relative', zIndex: 1 }}>{keys}</span>}
        <span
          style={{
            ...labelStyle,
            position: 'relative',
            zIndex: 1,
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
  const confirmKeys = touchMode ? '' : 'Space';
  const previousPageKeys = touchMode ? '' : 'A';
  const nextPageKeys = touchMode ? '' : 'D';
  const previousEntryKeys = touchMode ? '' : '1';
  const nextEntryKeys = touchMode ? '' : '3';

  const backLabel = activePage === 'memorandum' && hintVariant === 'memorandum-detail'
    ? 'Memorandum'
    : mode === 'page'
      ? 'Main Menu'
      : 'Back';
  const backAriaLabel = activePage === 'memorandum' && hintVariant === 'memorandum-detail'
    ? 'Back to Memorandum'
    : 'Back to Main Menu';
  const clickableBackKeys = touchMode ? '' : 'C / Esc';

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
            { id: 'page-change', keys: touchMode ? '' : 'A / D', label: 'Change' },
          );
        }
        break;
      default:
        break;
    }
  }

  if (!isCompactTouch) {
    chips.push({ id: 'toggle-animations', keys: 'F', label: `Toggle Animations ${animationsEnabled ? 'On' : 'Off'}`, onClick: onAnimationsToggle });
  }

  if (mode === 'page') {
    chips.push({
      id: 'page-back',
      keys: clickableBackKeys,
      label: backLabel,
      ariaLabel: backAriaLabel,
      onClick: onBack,
      variant: 'back',
    });
  }

  return (
    <div
      data-control-hints
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
              type="button"
              data-hint-chip
              onClick={chip.onClick}
              style={{
                ...baseChipStyle,
                position: 'relative',
                overflow: 'hidden',
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <HintHoverOverlay />
              <span style={{ ...keyStyle, position: 'relative', zIndex: 1 }}>{chip.keys}</span>
              <span style={{ ...labelStyle, position: 'relative', zIndex: 1 }}>Toggle Animations</span>
              <span style={{
                fontFamily: 'Cambria, "Times New Roman", serif',
                fontSize: 'var(--font-fluid-xs)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
                zIndex: 1,
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
              ariaLabel={chip.ariaLabel}
              onClick={chip.onClick}
              variant={chip.variant}
            />
          )}
        </div>
      ))}
    </div>
  );
}

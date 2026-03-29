import { forwardRef } from 'react';
import type { MenuItemConfig } from '../../lib/menuConfig';
import { ITEM_SCALES, ARC_CURVE_X, COLORS } from '../../lib/constants';

interface MenuItemProps {
  item: MenuItemConfig;
  index: number;
  distance: number;
  subtitle?: string;
  onMouseEnter?: () => void;
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ item, index, distance, subtitle, onMouseEnter }, ref) => {
    const isSelected = distance === 0;
    // Arc, rotation, and depth are fixed per item position - they don't shift when selection changes
    const scale = ITEM_SCALES[Math.min(index, ITEM_SCALES.length - 1)];
    const arcX = ARC_CURVE_X[Math.min(index, ARC_CURVE_X.length - 1)];
    // Scale factor drives size change so we can control growth direction via transformOrigin
    const sizeScale = isSelected
      ? parseFloat(item.selectedSize) / parseFloat(scale.fontSize)
      : 1;
    // '0' is unitless in CSS - calc(0 + 3vh) is invalid, needs calc(0px + 3vh)
    const norm = (v: string | undefined) => (!v || v === '0') ? '0px' : v;

    return (
      <div
        ref={ref}
        data-menu-item={item.id}
        onMouseEnter={onMouseEnter}
        style={{
          position: 'relative',
          fontSize: scale.fontSize,
          fontWeight: isSelected ? scale.selectedFontWeight : scale.fontWeight,
          opacity: isSelected ? 1 : scale.opacity,
          transform: `translateX(${(arcX * 16/9).toFixed(2)}vh) rotate(${scale.rotate}deg) perspective(20vh) rotateY(${scale.rotateY}deg)`,
          transformOrigin: 'left center',
          lineHeight: 1.0,
          // Selected item is black - sits on top of the coloured paint splash
          // Non-selected items are the usual light text on dark background
          color: isSelected ? COLORS.black : 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '-0.08em',
          cursor: isSelected ? 'default' : 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          marginBottom: isSelected ? `calc(${norm(item.marginBottom)} + 1vh)` : item.marginBottom,
          marginTop: isSelected ? `calc(${norm(item.marginTop)} + 1vh)` : item.marginTop,
          willChange: 'transform, opacity',
        }}
      >
        <span style={{
          display: 'inline-block',
          transform: `scaleX(${sizeScale}) scaleY(${sizeScale * 0.8})`,
          transformOrigin: isSelected ? 'right bottom' : 'left bottom',
        }}>
          {item.label}
        </span>

        {/* Subtitle: white text on black strip, overlapping the right edge of the selected item */}
        {isSelected && subtitle && (
          <span
            data-subtitle
            style={{
              position: 'absolute',
              bottom: '-0.4em',
              // Start at 50% of the item width so the subtitle overlaps slightly with the text
              left: '50%',
              backgroundColor: COLORS.black,
              color: COLORS.chipBg,
              fontSize: '0.25em',
              fontWeight: 700,
              fontVariant: 'small-caps',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              padding: '0.25em 0.6em 0.25em 0.4em',
              lineHeight: 1,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    );
  }
);

MenuItem.displayName = 'MenuItem';
export default MenuItem;

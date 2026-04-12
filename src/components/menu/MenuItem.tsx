import { forwardRef } from 'react';
import type { MenuItemConfig } from '../../lib/menuConfig';
import { ITEM_SCALES, ARC_CURVE_X, COLORS } from '../../lib/constants';

interface MenuItemProps {
  item: MenuItemConfig;
  index: number;
  isSelected: boolean;
  subtitle?: string;
  subtitleVisible: boolean;
  animationsEnabled: boolean;
  onMouseEnter?: () => void;
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ item, index, isSelected, subtitle, subtitleVisible, animationsEnabled, onMouseEnter }, ref) => {
    const scale = ITEM_SCALES[Math.min(index, ITEM_SCALES.length - 1)];
    const arcX = ARC_CURVE_X[Math.min(index, ARC_CURVE_X.length - 1)];
    const sizeScale = isSelected
      ? parseFloat(item.selectedSize) / parseFloat(scale.fontSize)
      : 1;

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
          color: isSelected ? COLORS.black : 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '-0.08em',
          cursor: 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          willChange: 'transform, opacity',
        }}
      >
        <span style={{
          display: 'inline-block',
          transform: `scaleX(${sizeScale}) scaleY(${sizeScale * 0.8})`,
          transformOrigin: isSelected ? 'right bottom' : 'left bottom',
        }}>
          {item.label.split('').map((char, i) => (
            <span key={i} data-char style={{ display: 'inline-block' }}>{char}</span>
          ))}
        </span>

        {subtitle && (
          <span
            data-subtitle
            style={{
              position: 'absolute',
              bottom: '-0.4em',
              left: '50%',
              background: `linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, ${COLORS.black} 9%, ${COLORS.black} 91%, rgba(0, 0, 0, 0) 100%)`,
              color: COLORS.chipBg,
              fontSize: '0.25em',
              fontWeight: 700,
              fontVariant: 'small-caps',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.32em 1.2em 0.32em 1em',
              lineHeight: 1,
              clipPath: 'polygon(1rem 0%, 100% 0%, calc(100% - 1rem) 100%, 0% 100%)',
              visibility: isSelected ? 'visible' : 'hidden',
              opacity: subtitleVisible ? 1 : 0,
              transition: animationsEnabled ? 'opacity 0.25s ease' : 'none',
              pointerEvents: 'none',
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

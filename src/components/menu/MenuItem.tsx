import type { LayoutMode } from '../../lib/deviceProfile';
import { forwardRef, memo } from 'react';
import { getMenuItemScaleFactor, getMenuItemTransform } from '../../lib/menuLayout';
import type { MenuItemConfig } from '../../lib/menuConfig';
import { ITEM_SCALES, COLORS } from '../../lib/constants';

interface MenuItemProps {
  item: MenuItemConfig;
  index: number;
  isSelected: boolean;
  subtitle?: string;
  subtitleVisible: boolean;
  animationsEnabled: boolean;
  layoutMode?: LayoutMode;
  onMouseEnter?: (index: number) => void;
}

function scaleVhValue(value: string, factor: number) {
  if (!value.endsWith('vh')) {
    return value;
  }

  return `${parseFloat(value) * factor}vh`;
}

function estimateLabelWidthEm(label: string) {
  return [...label].reduce((width, char) => {
    if ('MW'.includes(char)) return width + 1;
    if ('I'.includes(char)) return width + 0.42;
    if ('LTFE'.includes(char)) return width + 0.64;
    if ('OUNDC'.includes(char)) return width + 0.8;
    return width + 0.74;
  }, 0);
}

const MenuItem = memo(forwardRef<HTMLDivElement, MenuItemProps>(
  ({ item, index, isSelected, subtitle, subtitleVisible, animationsEnabled, layoutMode = 'desktop', onMouseEnter }, ref) => {
    const scale = ITEM_SCALES[Math.min(index, ITEM_SCALES.length - 1)];
    const sizeFactor = getMenuItemScaleFactor(layoutMode);
    const scaledFontSize = scaleVhValue(scale.fontSize, sizeFactor);
    const selectedScale = parseFloat(scaleVhValue(item.selectedSize, sizeFactor)) / parseFloat(scaledFontSize);
    const sizeScale = isSelected
      ? selectedScale
      : 1;
    const compactWidthCap = 118 / (estimateLabelWidthEm(item.label.toUpperCase()) * Math.max(1, selectedScale));
    const fontSize = layoutMode === 'compact'
      ? `min(${scaledFontSize}, ${compactWidthCap.toFixed(2)}vw)`
      : scaledFontSize;

    return (
      <div
        ref={ref}
        data-menu-item={item.id}
        onMouseEnter={() => onMouseEnter?.(index)}
        style={{
          position: 'relative',
          fontSize,
          fontWeight: isSelected ? scale.selectedFontWeight : scale.fontWeight,
          opacity: isSelected ? 1 : scale.opacity,
          transform: getMenuItemTransform(index, layoutMode),
          transformOrigin: 'left center',
          lineHeight: 1.0,
          color: isSelected ? COLORS.black : 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '-0.08em',
          cursor: 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
        >
        <span
          data-menu-anchor
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: '1px',
            height: '1px',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            opacity: 0,
          }}
        />
        <span
          data-menu-trajectory-end
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            width: '1px',
            height: '1px',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            opacity: 0,
          }}
        />
        <span
          data-menu-label
          style={{
          display: 'inline-block',
          transform: `scaleX(${sizeScale}) scaleY(${sizeScale * 0.8})`,
          transformOrigin: layoutMode === 'compact' ? 'left bottom' : isSelected ? 'right bottom' : 'left bottom',
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
));

MenuItem.displayName = 'MenuItem';
export default MenuItem;

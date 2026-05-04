import type { LayoutMode } from '../../lib/deviceProfile';
import CommandLabel from '../shared/CommandLabel';
import { COLORS } from '../../lib/constants';

interface MenuIndexProps {
  index: string;
  textColor?: string;
  layoutMode?: LayoutMode;
}

export default function MenuIndex({
  index,
  textColor = COLORS.textPrimaryDim,
  layoutMode = 'desktop',
}: MenuIndexProps) {
  const units = index[1];
  const tens = index[0];  // always 0
  const fontSize = layoutMode === 'compact'
    ? '33vw'
    : layoutMode === 'tablet'
      ? '23vw'
      : '26vw';
  const unitsHeight = layoutMode === 'compact' ? '14vw' : '10vw';
  const unitsMarginBottom = layoutMode === 'compact' ? '-5vw' : '-4vw';

  const charStyle = {
    fontFamily: '"Cinzel", serif',
    fontSize,
    fontWeight: 900,
    color: textColor,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    writingMode: 'vertical-rl' as const,
    textOrientation: 'mixed' as const,
    transform: 'rotate(180deg)',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        ...charStyle,
        position: 'relative',
        zIndex: 1,
        height: unitsHeight,
        marginBottom: unitsMarginBottom,
      }}>
        {units}
      </span>
      <div style={{ ...charStyle, position: 'relative' }}>
        {tens}
        <CommandLabel layoutMode={layoutMode} />
      </div>
    </div>
  );
}

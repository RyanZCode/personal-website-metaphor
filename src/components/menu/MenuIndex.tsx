import CommandLabel from '../shared/CommandLabel';
import { COLORS } from '../../lib/constants';

interface MenuIndexProps {
  index: string;
  textColor?: string;
}

export default function MenuIndex({ index, textColor = COLORS.textPrimaryDim }: MenuIndexProps) {
  const units = index[1];
  const tens = index[0];  // always 0

  const charStyle = {
    fontFamily: '"Cinzel", serif',
    fontSize: '26vw',
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
        height: '10vw',
        marginBottom: '-4vw',
      }}>
        {units}
      </span>
      <div style={{ ...charStyle, position: 'relative' }}>
        {tens}
        <CommandLabel />
      </div>
    </div>
  );
}

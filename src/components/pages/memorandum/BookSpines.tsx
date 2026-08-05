const MEMORANDUM_BOOK_SPINES = [
  {
    label: 'Record',
    left: 16,
    height: 10,
    fontFamily: '"Cinzel", "Palatino Linotype", "Book Antiqua", Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Archive',
    left: 8,
    height: 12,
    fontFamily: '"Baskerville Old Face", Baskerville, Garamond, Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Index',
    left: 23,
    height: 8,
    fontFamily: '"Book Antiqua", Palatino, "Palatino Linotype", serif',
    fontWeight: 700,
  },
  {
    label: 'Notes',
    left: 12,
    height: 11,
    fontFamily: 'Garamond, "Times New Roman", Times, serif',
    fontWeight: 600,
  },
  {
    label: 'Logbook',
    left: 19,
    height: 9,
    fontFamily: 'Cambria, Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Memoranda',
    left: 4,
    height: 13,
    fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    fontWeight: 700,
  },
  {
    label: 'Journal',
    left: 26,
    height: 7,
    fontFamily: 'Didot, "Bodoni MT", "Times New Roman", serif',
    fontWeight: 700,
  },
  {
    label: 'Chronicle',
    left: 10,
    height: 10,
    fontFamily: 'Constantia, Cambria, Georgia, serif',
    fontWeight: 700,
  },
] as const;

const MEMORANDUM_BOOK_SPINE_GAP = 0;
const MEMORANDUM_BOOK_SPINE_LAYOUT = MEMORANDUM_BOOK_SPINES.map((spine, index) => ({
  ...spine,
  index,
  top: MEMORANDUM_BOOK_SPINES
    .slice(0, index)
    .reduce((sum, entry) => sum + entry.height + MEMORANDUM_BOOK_SPINE_GAP, 0),
}));

interface BookSpinesProps {
  animation: string;
}

function BookSpine({
  index,
  label,
  left,
  top,
  height,
  fontFamily,
  fontWeight,
}: {
  index: number;
  label: string;
  left: number;
  top: number;
  height: number;
  fontFamily: string;
  fontWeight: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}%`,
        right: 0,
        top: `${top}%`,
        height: `${height}%`,
        background: 'linear-gradient(180deg, rgba(4, 7, 7, 0.94), rgba(0, 0, 0, 0.92))',
        boxShadow: 'inset 0 0 0 1px rgba(240, 232, 236, 0.32), 0 0.35rem 1rem rgba(0, 0, 0, 0.22)',
        borderRadius: '0.15rem 0 0 0.15rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            index % 2 === 0
              ? 'linear-gradient(90deg, rgba(255, 210, 90, 0.14), transparent 48%, rgba(255, 255, 255, 0.04))'
              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 46%, rgba(255, 210, 90, 0.18))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1rem 0 1.75rem',
          color: 'rgba(240, 232, 236, 0.7)',
          fontFamily,
          fontSize: 'clamp(0.9rem, 1.8vw, 1.7rem)',
          fontWeight,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'clip',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          top: '8%',
          bottom: '8%',
          left: '0.5rem',
          width: '2px',
          background: 'rgba(240, 232, 236, 0.38)',
        }}
      />
    </div>
  );
}

export default function BookSpines({ animation }: BookSpinesProps) {
  return (
    <div
      data-memorandum-book-spines
      style={{
        position: 'absolute',
        inset: '12rem 0.5rem 0.75rem 8%',
        zIndex: 1,
        animation,
      }}
    >
      {MEMORANDUM_BOOK_SPINE_LAYOUT.map((spine) => (
        <BookSpine
          key={spine.label}
          index={spine.index}
          label={spine.label}
          left={spine.left}
          top={spine.top}
          height={spine.height}
          fontFamily={spine.fontFamily}
          fontWeight={spine.fontWeight}
        />
      ))}
    </div>
  );
}

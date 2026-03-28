interface Hint {
  keys: string;
  label: string;
}

const HINTS: Hint[] = [
  { keys: 'W / S', label: 'Navigate' },
  { keys: 'Space', label: 'Confirm' },
  { keys: 'C', label: 'Back' },
];

export default function ControlHints() {
  return (
    <div data-control-hints style={{ display: 'flex', gap: '0.3rem' }}>
      {HINTS.map(({ keys, label }) => (
        <div
          key={keys}
          style={{
            background: '#fff',
            clipPath: 'polygon(0.8rem 0%, 100% 0%, calc(100% - 0.8rem) 100%, 0% 100%)',
            padding: '0.45rem 1.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            padding: '0.1rem 0.35rem',
            borderRadius: '2px',
          }}>
            {keys}
          </span>
          <span style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '0.5rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(0, 0, 0, 0.5)',
          }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

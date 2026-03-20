interface PreloaderProps {
  onComplete?: () => void;
}

export default function Preloader({ onComplete: _onComplete }: PreloaderProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0608',
        gap: '1rem',
      }}
    >
      <div className="spinner" />
      <p
        style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '0.6rem',
          letterSpacing: '0.3em',
          color: 'rgba(240, 232, 236, 0.3)',
          textTransform: 'uppercase',
        }}
      >
        Loading
      </p>
    </div>
  );
}

export default function UnsupportedScreen() {
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
        gap: '2rem',
      }}
    >
      <p
        style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '2rem',
          letterSpacing: '0.1em',
          color: 'rgba(240, 232, 236, 0.6)',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: 0,
        }}
      >
        This screen size is not supported yet
      </p>
      <img
        src="/assets/sad-dog.png"
        alt=""
        style={{
          width: 'auto',
          height: '40vh',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

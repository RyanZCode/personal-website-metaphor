import { COLORS } from '../../lib/constants';

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
        backgroundColor: COLORS.bgPrimary,
        gap: '2rem',
      }}
    >
      <p
        style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '2rem',
          letterSpacing: '0.1em',
          color: COLORS.textPrimaryMuted,
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

import { useState } from 'react';
import { COLORS } from '../../lib/constants';

export default function LoadingScreen() {
  const [imgFailed, setImgFailed] = useState(false);

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
      {imgFailed ? (
        <p
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '1.5rem',
            letterSpacing: '0.3em',
            color: COLORS.textPrimaryFaint,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Great things take time
        </p>
      ) : (
        <img
          src="/assets/take-your-time.png"
          alt=""
          draggable={false}
          onError={() => setImgFailed(true)}
          style={{
            height: '40vh',
            width: 'auto',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      )}
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
    </div>
  );
}

import { useState } from 'react';

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
        backgroundColor: '#0a0608',
        gap: '2rem',
      }}
    >
      {imgFailed ? (
        <p
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: '1.5rem',
            letterSpacing: '0.3em',
            color: 'rgba(240, 232, 236, 0.4)',
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
          onError={() => setImgFailed(true)}
          style={{
            height: '40vh',
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      )}
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
    </div>
  );
}

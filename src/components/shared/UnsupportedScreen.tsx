import { COLORS } from '../../lib/constants';

const PANEL_CLIP_PATH = 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)';

interface UnsupportedScreenProps {
  onDismiss: () => void;
}

export default function UnsupportedScreen({ onDismiss }: UnsupportedScreenProps) {
  return (
    <div
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 3rem)',
        backgroundColor: 'rgba(10, 6, 8, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsupported-screen-title"
        style={{
          position: 'relative',
          width: 'clamp(22rem, 72vw, 54rem)',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-3px',
            background: 'rgba(255, 255, 255, 0.5)',
            clipPath: PANEL_CLIP_PATH,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            clipPath: PANEL_CLIP_PATH,
            background:
              'linear-gradient(158deg, rgba(18, 8, 13, 0.97), rgba(50, 8, 20, 0.92) 54%, rgba(14, 50, 48, 0.94))',
            boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none',
          }}
        />
        <img
          src="/assets/sad-dog.webp"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 'clamp(0.75rem, 3vw, 2rem)',
            bottom: 'clamp(0.75rem, 2.5vw, 1.5rem)',
            width: 'clamp(8rem, 22vw, 16rem)',
            aspectRatio: '1',
            maxWidth: '38%',
            height: 'auto',
            objectFit: 'cover',
            borderRadius: '50%',
            opacity: 0.2,
            filter: 'saturate(0.75) contrast(1.08)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '46rem',
            zIndex: 1,
            padding: 'clamp(1.45rem, 3.2vw, 2.35rem) clamp(1.45rem, 4.2vw, 3.25rem)',
          }}
        >
          <p
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 'var(--font-fluid-xs)',
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: COLORS.textPrimaryFade,
              textTransform: 'uppercase',
              margin: '0 0 0.8rem',
            }}
          >
            Notice
          </p>
          <h2
            id="unsupported-screen-title"
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 'clamp(1.6rem, 4.2vw, 3.05rem)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '0.02em',
              color: COLORS.textPrimary,
              textTransform: 'uppercase',
              margin: 0,
              textShadow: '0.16rem 0.16rem 0 rgba(205, 35, 45, 0.72)',
            }}
          >
            Suboptimal Screen Size
          </h2>
          <p
            style={{
              maxWidth: '38rem',
              margin: '1rem 0 1.35rem',
              color: COLORS.textPrimaryDim,
              fontFamily: '"Cambria", serif',
              fontSize: 'var(--font-fluid-sm)',
              lineHeight: 1.55,
            }}
          >
            To get the full intended experience, a wider screen size is recommended.
            <br />
            The site will still function on smaller screens, but some layout issues may occur and certain visual details will be lost.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              minWidth: '7.5rem',
              padding: '0.72rem 1.15rem',
              border: '1px solid rgba(0, 0, 0, 0.36)',
              background: COLORS.chipBg,
              color: COLORS.chipTextStrong,
              fontFamily: '"Cinzel", serif',
              fontSize: '0.86rem',
              fontWeight: 900,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0.35rem 0.35rem 0 rgba(205, 35, 45, 0.78)',
            }}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import { createExperienceEntryTimeline, createExperienceExitTimeline } from '../../lib/animations';
import SectionBackground from '../background/SectionBackground';
import ExperienceRipples from '../menu/splashEffects/ExperienceRipples';

interface ExperienceSectionProps {
  isActive: boolean;
  animationsEnabled: boolean;
}

interface Job {
  company: string;
  role: string;
  period: string;
  type: string;
  logo?: string;
}

const JOBS: Job[] = [
  {
    company: 'Shopify',
    role: 'Intern Engineer (Infra)',
    period: 'May 2026 - Present',
    type: 'Internship',
    logo: '/assets/experience-logos/shopify-logo.jpg',
  },
  {
    company: 'Shopify',
    role: 'Intern Engineer (Full-Stack)',
    period: 'Sept 2025 - Dec 2025',
    type: 'Internship',
    logo: '/assets/experience-logos/shopify-logo.jpg',
  },
  {
    company: 'University Health Network',
    role: 'Web Developer',
    period: 'Jan 2025 - Apr 2025',
    type: 'Internship',
    logo: '/assets/experience-logos/uhn-logo.png',
  },
  {
    company: 'Dishon Limited',
    role: 'Developer',
    period: 'Aug 2024 - Nov 2025',
    type: 'Independent Contractor',
    logo: '/assets/experience-logos/dishon-logo.jpg',
  },
  {
    company: 'Dishon Limited',
    role: 'Data Analyst Intern',
    period: 'May 2024 - Aug 2024',
    type: 'Internship',
    logo: '/assets/experience-logos/dishon-logo.jpg',
  },
  {
    company: 'University of Waterloo',
    role: 'Bachelor of Computer Science (Co-op)',
    period: 'Sept 2023 - Present',
    type: 'Education',
    logo: '/assets/experience-logos/uwaterloo-logo.png',
  },
];

const accent = 'hsl(215, 72%, 42%)';

const LEFT_TOP      = 65;
const LEFT_BOT      = 35;
const RIGHT_BOT     = 73;
// Right border line starts at the right edge of the screen at 9/10ths up (y=10%)
const RIGHT_START_Y = 10;

// Portrait is 26vw wide starting at paddingLeft 6vw → right edge 32vw, gap 3vw, content at 35vw.
// The panel is a pentagon: top edge from LEFT_TOP% to 100%, then down the right edge to
// RIGHT_START_Y%, then the diagonal to RIGHT_BOT% at 100%, then back along the bottom.
// Width ~41vw at row positions, rows use 41vw to stay inside each boundary.
// paddingLeft inside each row is 0.5vw, accounted for in the margin calculation.
const ROW_PADDING_L_VW = 0.5;
const ROW_PADDING_R_VW = 2.75;
const LOGO_OVERHANG_REM = 0.7;

// Estimated top y-positions of each row as a fraction of screen height.
// Rows are centered in 80vh (100vh minus 10vh top/bottom padding), spanning ~27%–65%.
interface RowLayout {
  marginLeft: string;
  width: string;
  bottomBorderInsetLeft: string;
  bottomBorderInsetRight: string;
  contentInsetLeft: string;
}

function getLeftStripX(yPx: number, viewportWidth: number, viewportHeight: number): number {
  const progress = yPx / viewportHeight;
  return ((LEFT_TOP + (LEFT_BOT - LEFT_TOP) * progress) / 100) * viewportWidth;
}

function getRightStripX(yPx: number, viewportWidth: number, viewportHeight: number): number {
  const rightStartPx = (RIGHT_START_Y / 100) * viewportHeight;

  if (yPx <= rightStartPx) {
    return viewportWidth;
  }

  const progress = (yPx - rightStartPx) / (viewportHeight - rightStartPx);
  return viewportWidth + ((((RIGHT_BOT / 100) * viewportWidth) - viewportWidth) * progress);
}

// Dark strip right diagonal vector: (-27vw, 90vh). In pixels: angle from vertical = atan2(27W, 90H).
// Diagonal line equation in % coords: x_vw + 0.3*y_vh = 103.
//
// Goal: rotate(θ) so left edge is parallel to diagonal, TL corner sits on the diagonal,
// and the container covers the full screen height (no gaps above or below).
//
// Optimal center y: y_c_vh = 50 + W2*ar*sinθ  (eliminates both gaps simultaneously)
// From TL-on-diagonal constraint: x_c_vw = 88 + W2*cosθ
// → right_vw = 100 - x_c_vw - W2 = 12 - W2*(1 + cosθ)
// → bottom_vh = 50 - W2*ar*(1 + sinθ)
//
// Min W2 to cover full height: 50/(ar*cosθ). Add margin of 8.
function computeRippleLayout(): { angleDeg: number; rightVw: number; bottomVh: number; sideVw: number } {
  const rad = Math.atan2(27 * window.innerWidth, 90 * window.innerHeight);
  const ar  = window.innerWidth / window.innerHeight;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const W2  = Math.ceil(50 / (ar * cos)) + 8;
  return {
    angleDeg: rad * 180 / Math.PI,
    rightVw:  12 - W2 * (1 + cos),
    bottomVh: 50 - W2 * ar * (1 + sin),
    sideVw:   W2 * 2,
  };
}

export default function ExperienceSection({ isActive, animationsEnabled }: ExperienceSectionProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevIsActive = useRef(isActive);
  const bobAnim  = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  const contentRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 16:9 fallbacks (θ≈28°, ar≈1.778, W2≈40): updated after mount and on resize
  const [ripple, setRipple] = useState({ angleDeg: 28, rightVw: -63, bottomVh: -57, sideVw: 80 });
  const [rowLayouts, setRowLayouts] = useState<RowLayout[]>(
    () => JOBS.map(() => ({
      marginLeft: '0px',
      width: '35vw',
      bottomBorderInsetLeft: '0px',
      bottomBorderInsetRight: '0px',
      contentInsetLeft: '0px',
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current || !animationsEnabled) {
      return;
    }

    entryTlRef.current = createExperienceEntryTimeline(containerRef.current);
    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (animationsEnabled || !containerRef.current) {
      return;
    }

    const wipeLine = containerRef.current.querySelector('[data-experience-wipe]');
    if (!wipeLine) {
      return;
    }

    gsap.set(wipeLine, { autoAlpha: 0 });
  }, [animationsEnabled]);

  useEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (wasActive && !isActive && containerRef.current && animationsEnabled) {
      exitTlRef.current?.kill();
      exitTlRef.current = createExperienceExitTimeline(containerRef.current);
    }
  }, [isActive, animationsEnabled]);

  useEffect(() => {
    return () => {
      exitTlRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    const update = () => setRipple(computeRippleLayout());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const updateRowLayouts = () => {
      const content = contentRef.current;
      const panelGroup = containerRef.current?.querySelector('[data-experience-panel-group]') as HTMLElement | null;

      if (!content) {
        return;
      }

      const previousTransform = panelGroup?.style.transform ?? '';
      if (panelGroup) {
        panelGroup.style.transform = 'none';
      }

      const contentRect = content.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const rowPaddingLeftPx = (ROW_PADDING_L_VW / 100) * viewportWidth;
      const logoOverhangPx = LOGO_OVERHANG_REM * rootFontSize;
      const nextLayouts = JOBS.map((_, index) => {
        const row = rowRefs.current[index];

        if (!row) {
          return {
            marginLeft: '0px',
            width: '35vw',
            bottomBorderInsetLeft: '0px',
            bottomBorderInsetRight: '0px',
            contentInsetLeft: '0px',
          };
        }

        const rowRect = row.getBoundingClientRect();
        const rowTopY = rowRect.top;
        const rowBottomY = rowRect.bottom;
        const rowLeftBorderPx = Math.max(
          contentRect.left,
          getLeftStripX(rowTopY, viewportWidth, viewportHeight)
        );
        const rowRightBorderPx = Math.min(
          contentRect.right,
          getRightStripX(rowTopY, viewportWidth, viewportHeight)
        );
        const rowLeftPx = Math.max(
          rowLeftBorderPx,
          rowLeftBorderPx + logoOverhangPx - rowPaddingLeftPx
        );
        const bottomBorderLeftPx = Math.max(
          contentRect.left,
          getLeftStripX(rowBottomY, viewportWidth, viewportHeight)
        );
        const bottomBorderRightPx = Math.min(
          contentRect.right,
          getRightStripX(rowBottomY, viewportWidth, viewportHeight)
        );

        return {
          marginLeft: `${Math.max(0, rowLeftBorderPx - contentRect.left)}px`,
          width: `${Math.max(0, rowRightBorderPx - rowLeftBorderPx)}px`,
          bottomBorderInsetLeft: `${bottomBorderLeftPx - rowLeftBorderPx}px`,
          bottomBorderInsetRight: `${rowRightBorderPx - bottomBorderRightPx}px`,
          contentInsetLeft: `${Math.max(0, rowLeftPx - rowLeftBorderPx)}px`,
        };
      });

      setRowLayouts((currentLayouts) => {
        const hasChanged = nextLayouts.some((layout, index) => (
          layout.marginLeft !== currentLayouts[index]?.marginLeft ||
          layout.width !== currentLayouts[index]?.width ||
          layout.bottomBorderInsetLeft !== currentLayouts[index]?.bottomBorderInsetLeft ||
          layout.bottomBorderInsetRight !== currentLayouts[index]?.bottomBorderInsetRight ||
          layout.contentInsetLeft !== currentLayouts[index]?.contentInsetLeft
        ));

        return hasChanged ? nextLayouts : currentLayouts;
      });

      if (panelGroup) {
        panelGroup.style.transform = previousTransform;
      }
    };

    updateRowLayouts();

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateRowLayouts);

    if (resizeObserver) {
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }

      rowRefs.current.forEach((row) => {
        if (row) {
          resizeObserver.observe(row);
        }
      });
    }

    window.addEventListener('resize', updateRowLayouts);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateRowLayouts);
    };
  }, [isActive]);

  return (
    <section
      ref={containerRef}
      aria-hidden={!isActive}
      data-experience-section
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <SectionBackground />

      {/* Watermark - behind the dark panel */}
      <div
        data-experience-watermark
        data-section-title
        style={{
          position: 'absolute',
          bottom: '2vh',
          left: '-1vw',
          fontFamily: '"Cinzel", serif',
          fontWeight: 900,
          fontSize: '15.2vw',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'var(--text-primary)',
          opacity: 0.75,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Experience
      </div>

      <div
        data-experience-geo-lines
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% - 8.5vh)',
            left: 0,
            width: '50%',
            height: '3px',
            background: 'linear-gradient(to right, rgba(240,232,236,0.42) 0%, rgba(240,232,236,0.42) 78%, rgba(240,232,236,0) 100%)',
          }}
        />

        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="exp-panel-left-line" gradientUnits="userSpaceOnUse" x1="31%" y1="100%" x2="46%" y2="48%">
              <stop offset="0%" stopColor="#f0e8ec" stopOpacity="0.34" />
              <stop offset="72%" stopColor="#f0e8ec" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f0e8ec" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1="31%"
            y1="100%"
            x2="47%"
            y2="48%"
            stroke="url(#exp-panel-left-line)"
            strokeWidth="3"
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            left: '6vw',
            top: '13vh',
            width: 'clamp(25rem, 36vw, 46rem)',
            height: 'clamp(25rem, 36vw, 46rem)',
            borderRadius: '50%',
            border: '3px solid rgba(240,232,236,0.34)',
            clipPath: 'inset(0 0 52% 0)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        data-experience-portrait
        style={{
          position: 'absolute',
          top: '10vh',
          bottom: '10vh',
          left: '9vw',
          zIndex: 3,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            animation: bobAnim,
            position: 'relative',
            width: 'clamp(21rem, 30vw, 39rem)',
            height: 'clamp(21rem, 30vw, 39rem)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '280%',
              height: '280%',
              background: `radial-gradient(ellipse 40% 40% at 50% 50%, rgba(130, 50, 200, 0.75) 0%, transparent 65%)`,
              animation: glowAnim,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid rgba(240, 232, 236, 0.25)',
              boxShadow: `0 0 0 1px ${accent}4d, 0 0 4rem rgba(0,0,0,0.6)`,
            }}
          >
            <img
              src="/assets/dog-3.jpg"
              alt="Dog"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                transform: 'scale(2.5)',
                transformOrigin: '50% 50%',
              }}
            />
          </div>
        </div>
      </div>

      <div
        data-experience-panel-group
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(8, 5, 7, 0.84)',
            clipPath: `polygon(${LEFT_TOP}% 0%, 100% 0%, 100% ${RIGHT_START_Y}%, ${RIGHT_BOT}% 100%, ${LEFT_BOT}% 100%)`,
            pointerEvents: 'none',
          }}
        />

        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <line x1={`${LEFT_TOP}%`} y1="0%" x2={`${LEFT_BOT}%`} y2="100%" stroke="rgba(240,232,236,0.55)" strokeWidth="3" />
          <line x1="100%" y1={`${RIGHT_START_Y}%`} x2={`${RIGHT_BOT}%`} y2="100%" stroke="rgba(240,232,236,0.55)" strokeWidth="3" />
        </svg>

        <div
          style={{
            position: 'relative',
            zIndex: 3,
            height: '100%',
            padding: '10vh 0 10vh 35vw',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div
            data-section-content
            ref={contentRef}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            {JOBS.map((job, i) => {
              const isLast = i === JOBS.length - 1;
              const rowLayout = rowLayouts[i];
              return (
                <div
                  key={`${job.company}-${i}`}
                  data-experience-row
                  ref={(node) => {
                    rowRefs.current[i] = node;
                  }}
                  style={{
                    position: 'relative',
                    marginLeft: rowLayout?.marginLeft ?? '0px',
                    width: rowLayout?.width ?? '35vw',
                    boxSizing: 'border-box',
                    paddingLeft: '0.5vw',
                    paddingTop: '1.1rem',
                    paddingBottom: '1.1rem',
                    paddingRight: `${ROW_PADDING_R_VW}vw`,
                    borderTop: '1px solid rgba(240, 232, 236, 0.22)',
                    background: 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      paddingLeft: rowLayout?.contentInsetLeft ?? '0px',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '50%',
                        border: '1px solid rgba(240, 232, 236, 0.2)',
                        background: 'rgba(255, 255, 255, 1)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {job.logo ? (
                        <img
                          src={job.logo}
                          alt={job.company}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.28rem', background: 'rgba(255, 255, 255, 1)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '45%',
                            height: '45%',
                            border: '1px solid rgba(240, 232, 236, 0.14)',
                            borderRadius: '50%',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 'var(--font-fluid-md)',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              color: COLORS.textPrimary,
                              marginBottom: '0.15rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {job.company}
                          </div>
                          <div
                            style={{
                              fontSize: 'var(--font-fluid-sm)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: COLORS.textPrimaryDim,
                            }}
                          >
                            {job.role}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.3rem',
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 'var(--font-fluid-xs)',
                              letterSpacing: '0.1em',
                              color: COLORS.textPrimaryDim,
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {job.period}
                          </div>
                          <div
                            style={{
                              padding: '0.18rem 0.45rem',
                              background: 'rgba(240, 232, 236, 0.1)',
                              border: '1px solid rgba(240, 232, 236, 0.16)',
                              fontSize: 'var(--font-fluid-2xs)',
                              fontWeight: 700,
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: COLORS.textPrimaryDim,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {job.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isLast ? (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: rowLayout?.bottomBorderInsetLeft ?? '0px',
                        right: rowLayout?.bottomBorderInsetRight ?? '0px',
                        bottom: 0,
                        borderBottom: '1px solid rgba(240, 232, 236, 0.22)',
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        data-experience-wipe
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-30vh',
          left: 0,
          width: 'clamp(7rem, 18vw, 15rem)',
          height: '170vh',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <div
          data-experience-wipe-line
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255, 255, 255, 1)',
            boxShadow: '0 0 28px rgba(255, 255, 255, 0.28)',
          }}
        />
      </div>

      <div
        data-experience-ripples
        style={{
          position: 'absolute',
          right: `${ripple.rightVw}vw`,
          bottom: `${ripple.bottomVh}vh`,
          width: `${ripple.sideVw}vw`,
          height: `${ripple.sideVw}vw`,
          transform: `rotate(${ripple.angleDeg}deg)`,
          transformOrigin: 'center',
          overflow: 'hidden',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div
          data-experience-ripples-fade
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <ExperienceRipples isActive={true} animationsEnabled={animationsEnabled} />
        </div>
      </div>
    </section>
  );
}

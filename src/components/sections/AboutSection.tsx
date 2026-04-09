import { useLayoutEffect, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import SectionBackground from '../background/SectionBackground';
import AboutTriangles from '../menu/splashEffects/AboutTriangles';
import ScrollViewport from '../shared/ScrollViewport';
import { createAboutEntryTimeline } from '../../lib/animations';

interface AboutSectionProps {
  isActive: boolean;
  animationsEnabled: boolean;
}

export default function AboutSection({ isActive, animationsEnabled }: AboutSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const entryTlRef   = useRef<gsap.core.Timeline | null>(null);

  const bobAnim  = isActive && animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';

  // Runs before first paint - sets GSAP initial states so content is invisible until
  // the wipe reveals it. Using useLayoutEffect prevents a one-frame flash at full opacity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current || !animationsEnabled) return;
    entryTlRef.current = createAboutEntryTimeline(containerRef.current);
    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, []);

  // Park the wipe off-screen whenever animations are disabled so it never flashes
  // visible when toggling animations back on (the entry timeline won't re-run then).
  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    const wipeLine = containerRef.current.querySelector('[data-about-wipe]');
    if (!wipeLine) return;
    gsap.set(wipeLine, { autoAlpha: 0 });
  }, [animationsEnabled]);

  return (
    <section
      ref={containerRef}
      aria-hidden={!isActive}
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

      <div
        data-about-watermark
        style={{
          position: 'absolute',
          top: '-0.12em',
          left: '-0.03em',
          fontFamily: '"Cinzel", serif',
          fontWeight: 900,
          fontSize: 'clamp(7rem, 18vw, 22rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'var(--text-primary)',
          opacity: 0.75,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        About
      </div>

      {/* Geometric line overlays */}
      <div
        data-about-geo-lines
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
      >
        {/* Line 1: horizontal under the watermark bottom edge */}
        {/* watermark top = -0.12em, lineHeight = 1, so bottom = 0.88 * font-size */}
        <div style={{
          position: 'absolute',
          top: 'calc(clamp(7rem, 18vw, 22rem) * 0.67)',
          left: 0,
          width: '88%',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240,232,236,0.38) 0%, rgba(240,232,236,0.38) 70%, transparent 100%)',
        }} />

        {/* Line 2: horizontal right below the text panel */}
        {/* panel bottom = section height - bottom padding (6vh) */}
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 6vh)',
          left: 0,
          width: '56vw',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240,232,236,0.38) 0%, rgba(240,232,236,0.38) 72%, transparent 100%)',
        }} />

        {/* Lines 3 and 4 use SVG for diagonal/angled positioning */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* vertical line gradient: opaque at bottom, semi-transparent at top */}
            <linearGradient id="ab-vert" gradientUnits="userSpaceOnUse" x1="92%" y1="95%" x2="92%" y2="4%">
              <stop offset="0%" stopColor="#f0e8ec" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#f0e8ec" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Line 3: diagonal from near bottom-left to mid-right */}
          <line
            x1="20%"
            y1="100%"
            x2="100%"
            y2="50%"
            stroke="#f0e8ec"
            strokeOpacity="0.22"
            strokeWidth="3"
          />
          {/* Line 4: vertical near right edge, fades toward top */}
          <line
            x1="97%"
            y1="100%"
            x2="97%"
            y2="0%"
            stroke="url(#ab-vert)"
            strokeWidth="3"
          />
        </svg>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          height: '100%',
          padding: '12vh 6vw 6vh 7vw',
          alignItems: 'flex-start',
          gap: '3vw',
        }}
      >
        <div
          data-about-panel
          style={{
            position: 'relative',
            width: '50%',
            maxWidth: '54rem',
            height: '100%',
            minHeight: 0,
            flexShrink: 0,
          }}
        >
          {/* white border layer - slightly oversized so it peeks around the content clip */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-2px',
              background: 'rgba(255, 255, 255, 0.5)',
              clipPath: 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)',
              pointerEvents: 'none',
            }}
          />
          <ScrollViewport
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              clipPath: 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)',
            }}
            viewportStyle={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
              boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
              padding: '5rem 3rem 2rem',
              gap: '1.25rem',
            }}
            thumbColor="rgba(255, 214, 224, 0.7)"
            thumbHoverColor="rgba(255, 132, 176, 0.98)"
          >
            <div data-about-copy>
              <h2
                style={{
                  fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Ryan Zhou
              </h2>
            </div>

            <div
              data-about-copy
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontFamily: 'Cambria, "Times New Roman", serif',
                fontSize: 'var(--font-fluid-lg)',
                lineHeight: 1.6,
                color: COLORS.textPrimaryDim,
              }}
            >
              <p>
                Hey y'all, I'm Ryan!
              </p>
              <p>I'm:</p>
              <ul style={{ paddingLeft: '1.2em', display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyleType: 'disc' }}>
                <li>A third-year CS student at the University of Waterloo</li>
                <li>Passionate about programming</li>
                <li>Eager to learn more!</li>
              </ul>
              <p>In my free time, I'm:</p>
              <ul style={{ paddingLeft: '1.2em', display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyleType: 'disc' }}>
                <li>Enjoying video games</li>
                <li>At the gym (begrudgingly)</li>
                <li>An avid casual of the NBA, NFL, and F1</li>
              </ul>
              <p>Check my <a href="#memorandum">memorandum</a> for more about me!</p>
            </div>
          </ScrollViewport>
        </div>

        {/* Right half - profile portrait */}
        <div
          data-about-portrait-anim
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            data-about-portrait
            style={{
              animation: bobAnim,
              position: 'relative',
              width: 'clamp(21rem, 30vw, 39rem)',
              height: 'clamp(21rem, 30vw, 39rem)',
              flexShrink: 0,
            }}
          >
            {/* Glow - centered via transform so size is unambiguous */}
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
            {/* Circle crop via overflow:hidden - avoids subpixel flicker on the img */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(240, 232, 236, 0.25)',
                boxShadow: `0 0 0 1px rgba(205, 35, 45, 0.3), 0 0 4rem rgba(0,0,0,0.6)`,
              }}
            >
              <img
                src="/assets/ryan-zhou-profile-pic.jpg"
                alt="Ryan Zhou"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Wipe line - GSAP moves this from off-screen-left to off-screen-right on entry */}
      <div
        data-about-wipe
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '16vw',
          background: 'white',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      />

      {/* Triangles in the bottom-right corner, rotated 45deg to flow like a forward slash */}
      <div
        data-about-triangles
        style={{
          position: 'absolute',
          right: '-15vw',
          bottom: '-20vw',
          width: '70vw',
          height: '40vw',
          transform: 'rotate(-30deg)',
          transformOrigin: 'center',
          overflow: 'hidden',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <AboutTriangles isActive={true} animationsEnabled={animationsEnabled} />
      </div>
    </section>
  );
}

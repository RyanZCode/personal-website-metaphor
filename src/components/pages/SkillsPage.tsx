import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import PageBackground from '../background/PageBackground';
import SkillsBands from '../menu/splashEffects/SkillsBands';
import {
  createSkillsEntryTimeline,
  createSkillsExitTimeline,
} from '../../lib/animations';
import ScrollViewport from '../shared/ScrollViewport';
import type { RegisterPageNavigation } from '../../lib/pageNavigation';
import { rafThrottle } from '../../lib/rafThrottle';

interface SkillsPageProps {
  isActive: boolean;
  animationsEnabled: boolean;
  initialEntryDelaySeconds: number;
  pageState: 'entering-page' | 'page-active' | 'exiting-page';
  registerNavigation: RegisterPageNavigation;
  onEntryAnimationComplete?: () => void;
}

interface SkillGroup {
  category: string;
  skills: string[];
}

const SKILL_GROUPS: SkillGroup[] = [
  { category: 'Language',  skills: ['TypeScript', 'JavaScript', 'C++', 'Python', 'Ruby', 'Java', 'C', 'SQL', 'HTML', 'CSS'] },
  { category: 'Framework', skills: ['React', 'Next.js', 'Astro', 'Node.js', 'Tailwind'] },
  { category: 'Tool',      skills: ['Git', 'Docker', 'GSAP'] },
  { category: 'Other',     skills: ['Communication', 'Growth Mindset'] },
];

const accent = 'hsl(335, 75%, 50%)';
const BOTTOM_DIAGONAL_WEDGE_CLIP_PATH = 'polygon(0 100%, 100% 0, 100% 100%)';

export default function SkillsPage({
  isActive,
  animationsEnabled,
  initialEntryDelaySeconds,
  pageState,
  registerNavigation,
  onEntryAnimationComplete,
}: SkillsPageProps) {
  const containerRef  = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const entryTlRef    = useRef<gsap.core.Timeline | null>(null);
  const entryDelayRef = useRef<gsap.core.Tween | null>(null);
  const exitTlRef     = useRef<gsap.core.Timeline | null>(null);
  const prevIsActive = useRef(isActive);
  const [isScrollable, setIsScrollable] = useState(false);

  const bobAnim  = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (!animationsEnabled) return;
    const shouldDelayDirectMountPlayback = pageState === 'page-active';
    let rafId: number | null = null;
    let nestedRafId: number | null = null;
    entryTlRef.current = createSkillsEntryTimeline(containerRef.current, {
      paused: initialEntryDelaySeconds > 0 || shouldDelayDirectMountPlayback,
    });
    if (onEntryAnimationComplete) {
      entryTlRef.current.add(() => {
        onEntryAnimationComplete();
      });
    }
    if (initialEntryDelaySeconds > 0) {
      entryDelayRef.current = gsap.delayedCall(entryDelaySeconds, () => {
        entryDelayRef.current = null;
        entryTlRef.current?.play(0);
      });
    } else if (shouldDelayDirectMountPlayback) {
      rafId = requestAnimationFrame(() => {
        nestedRafId = requestAnimationFrame(() => {
          nestedRafId = null;
          entryTlRef.current?.play(0);
        });
      });
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (nestedRafId !== null) cancelAnimationFrame(nestedRafId);
      entryDelayRef.current?.kill();
      entryDelayRef.current = null;
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, []);

  // Park the wipe off-screen when animations are disabled so it never flashes visible
  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    const wipeLine = containerRef.current.querySelector('[data-skills-wipe]');
    if (!wipeLine) return;
    gsap.set(wipeLine, { autoAlpha: 0 });
  }, [animationsEnabled]);

  // Exit: drift watermark and content downward; parent shell opacity handles the fade
  useLayoutEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (!wasActive || isActive || !containerRef.current || !animationsEnabled) return;

    exitTlRef.current?.kill();
    exitTlRef.current = createSkillsExitTimeline(containerRef.current);
  }, [animationsEnabled, isActive]);

  useEffect(() => {
    return () => { exitTlRef.current?.kill(); };
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScrollability = rafThrottle(() => {
      setIsScrollable(viewport.scrollHeight - viewport.clientHeight > 1);
    });

    updateScrollability();

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollability);

    resizeObserver?.observe(viewport);
    if (viewport.firstElementChild instanceof HTMLElement) {
      resizeObserver?.observe(viewport.firstElementChild);
    }

    window.addEventListener('resize', updateScrollability);
    return () => {
      updateScrollability.cancel();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollability);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      showScrollHint: isScrollable,
      onDirection: (direction) => {
        if (direction !== 'up' && direction !== 'down') return false;

        const viewport = viewportRef.current;
        if (!viewport) return false;

        const scrollRange = viewport.scrollHeight - viewport.clientHeight;
        if (scrollRange <= 1) return false;

        const step = Math.max(96, viewport.clientHeight * 0.72);
        viewport.scrollBy({
          top: direction === 'down' ? step : -step,
          behavior: animationsEnabled ? 'smooth' : 'auto',
        });
        return true;
      },
    });

    return () => registerNavigation(null);
  }, [animationsEnabled, isActive, isScrollable, registerNavigation]);

  return (
    <section
      ref={containerRef}
      aria-hidden={!isActive}
      data-skills-page
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <PageBackground />

      {/* Watermark title - top left */}
      <div
        data-page-title
        data-skills-watermark
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
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Skills
      </div>

      {/* Geometric line overlays */}
      <div
        data-skills-geo-lines
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
      >
        <div style={{
          position: 'absolute',
          top: 'calc(clamp(7rem, 18vw, 22rem) * 0.67)',
          left: 0,
          width: '88%',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240,232,236,0.38) 0%, rgba(240,232,236,0.38) 70%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 6vh)',
          left: 0,
          width: '56vw',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240,232,236,0.38) 0%, rgba(240,232,236,0.38) 72%, transparent 100%)',
        }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="sk-vert" gradientUnits="userSpaceOnUse" x1="92%" y1="95%" x2="92%" y2="4%">
              <stop offset="0%" stopColor="#f0e8ec" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#f0e8ec" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <line x1="20%" y1="100%" x2="100%" y2="50%" stroke="#f0e8ec" strokeOpacity="0.22" strokeWidth="3" />
          <line x1="97%" y1="100%" x2="97%" y2="0%" stroke="url(#sk-vert)" strokeWidth="3" />
        </svg>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          height: '100%',
          padding: '12vh 4vw 6vh 7vw',
          alignItems: 'flex-start',
          gap: '3vw',
        }}
      >
        {/* Left panel - skills list */}
        <div
            data-page-content
          data-skills-content
          style={{
            position: 'relative',
            width: '50%',
            maxWidth: '52rem',
            height: '100%',
            minHeight: 0,
            flexShrink: 0,
          }}
        >
          {/* white border layer */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-3px',
              background: 'rgba(255, 255, 255, 0.5)',
              clipPath: 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)',
              pointerEvents: 'none',
            }}
          />
          <ScrollViewport
            ref={viewportRef}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              clipPath: 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)',
            }}
            viewportStyle={{
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
              boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
              padding: '3rem 2.5rem 2rem',
              gap: '0',
            }}
            thumbColor="rgba(255, 214, 224, 0.7)"
            thumbHoverColor="rgba(255, 132, 176, 0.98)"
          >
            {SKILL_GROUPS.map((group, gi) => (
              <div
                key={group.category}
                style={{ marginBottom: gi < SKILL_GROUPS.length - 1 ? '1.5rem' : 0 }}
              >
                {/* Category header */}
                <div
                  style={{
                    fontSize: 'var(--font-fluid-sm)',
                    fontWeight: 700,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: accent,
                    opacity: 0.85,
                    paddingBottom: '0.4rem',
                    marginBottom: '0.2rem',
                    borderBottom: `1px solid ${accent}44`,
                  }}
                >
                  {group.category}
                </div>

                {/* Skill rows */}
                {group.skills.map((skill) => (
                  <div
                    key={skill}
                    data-skill-row
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem 0.6rem 1rem',
                      borderBottom: '1px solid rgba(240, 232, 236, 0.06)',
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'rgba(240, 232, 236, 0.12)',
                      }}
                    />

                    <div
                      style={{
                        fontSize: 'var(--font-fluid-md)',
                        fontWeight: 400,
                        letterSpacing: '0.03em',
                        color: COLORS.textPrimaryDim,
                        fontFamily: 'Cambria, "Times New Roman", serif',
                      }}
                    >
                      {skill}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </ScrollViewport>
        </div>

        {/* Right side - dog portrait */}
        <div
          data-skills-portrait
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
            style={{
              animation: bobAnim,
              position: 'relative',
              width: 'clamp(21rem, 30vw, 39rem)',
              height: 'clamp(21rem, 30vw, 39rem)',
              flexShrink: 0,
            }}
          >
            {/* Glow */}
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
            {/* Circle crop */}
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
                src="/assets/coby-left.jpg"
                alt="Coby looking left"
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

      {/* Bands in the bottom-right corner */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '20vw',
          top: '50vh',
          width: '80vw',
          height: '50vh',
          zIndex: 1,
          clipPath: BOTTOM_DIAGONAL_WEDGE_CLIP_PATH,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          data-skills-bands
          style={{
            position: 'absolute',
            left: '0vw',
            bottom: '-40vw',
            width: '160vw',
            height: '40vw',
            transform: `rotate(-23.5deg)`,
            transformOrigin: 'bottom left',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <SkillsBands isActive={true} animationsEnabled={animationsEnabled} />
        </div>
      </div>

      {/* Wipe line - GSAP moves this from above the screen to below on entry */}
      <div
        data-skills-wipe
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '26vh',
          background: 'white',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import { MENU_ITEMS } from '../../lib/menuConfig';
import {
  createContactEntryTimeline,
  createContactExitTimeline,
} from '../../lib/animations';
import { useViewportProfile } from '../../lib/deviceProfile';
import type { RegisterPageNavigation } from '../../lib/pageNavigation';
import type { PlaySoundEffect } from '../../lib/soundEffects';
import ContactRings from '../menu/splashEffects/ContactRings';
import PageBackground from '../background/PageBackground';
import ScrollViewport from '../shared/ScrollViewport';
import { rafThrottle } from '../../lib/rafThrottle';

interface ContactPageProps {
  isActive: boolean;
  animationsEnabled: boolean;
  initialEntryDelaySeconds: number;
  pageState: 'entering-page' | 'page-active' | 'exiting-page';
  registerNavigation: RegisterPageNavigation;
  playSoundEffect: PlaySoundEffect;
  onEntryAnimationComplete?: () => void;
}

interface ContactMethod {
  platform: string;
  handle: string;
  descriptor: string;
  href: string;
  iconAlt: string;
  iconSrc: string;
  iconScale?: number;
  iconOffsetX?: string;
  iconOffsetY?: string;
}

interface ContactBackgroundLineProps {
  id: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

const CONTACTS: ContactMethod[] = [
  {
    platform: 'GitHub',
    handle: 'github.com/RyanZCode',
    descriptor: 'Open Source',
    href: 'https://github.com/RyanZCode',
    iconAlt: 'GitHub icon',
    iconSrc: '/assets/contact-icons/github-logo.webp',
    iconScale: 1.1,
    iconOffsetX: '2%',
    iconOffsetY: '-1%',
  },
  {
    platform: 'LinkedIn',
    handle: 'linkedin.com/in/ryanzhou154',
    descriptor: 'Professional',
    href: 'https://www.linkedin.com/in/ryanzhou154/',
    iconAlt: 'LinkedIn icon',
    iconSrc: '/assets/contact-icons/linkedin-logo.webp',
    iconScale: 1,
    iconOffsetX: '1%',
    iconOffsetY: '0%',
  },
  {
    platform: 'Email',
    handle: 'r97zhou@uwaterloo.ca',
    descriptor: 'Direct',
    href: 'mailto:r97zhou@uwaterloo.ca',
    iconAlt: 'Email icon',
    iconSrc: '/assets/contact-icons/email-symbol.webp',
    iconScale: 1.2,
    iconOffsetX: '1%',
    iconOffsetY: '0%',
  },
  {
    platform: 'LeetCode',
    handle: 'leetcode.com/RyanZCode',
    descriptor: 'For Fun',
    href: 'https://leetcode.com/u/RyanZCode/',
    iconAlt: 'LeetCode icon',
    iconSrc: '/assets/contact-icons/leetcode-logo.webp',
    iconScale: 1.2,
    iconOffsetX: '-0.5%',
    iconOffsetY: '5%',
  },
];

const PANEL_TOP_PADDING = 0;
const PANEL_BOTTOM_PADDING = 0;
const PANEL_SIDE_PADDING = 38;
const CONTACT_ROW_HEIGHT = 108;
const COMPACT_CONTACT_ROW_HEIGHT = 146;
const NARROW_COMPACT_CONTACT_ROW_HEIGHT = 164;
const MIN_VISIBLE_ROWS = 1;
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.5)';
const PANEL_BORDER_WIDTH = 2;
const BACKGROUND_LINE_COLOR = 'rgba(240, 232, 236, 0.38)';
const PANEL_CLIP_PATH = 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)';
const CONTACT_RINGS_CLIP_PATH = 'polygon(70% 0%, 100% 0%, 100% 100%, 52% 100%)';
const CONTACT_BACKGROUND_LINES: ContactBackgroundLineProps[] = [
  { id: 'bottom-right-diagonal', x1: '20%', y1: '100%', x2: '100%', y2: '40%' },
  { id: 'mid-left-diagonal', x1: '0%', y1: '50%', x2: '100%', y2: '40%' },
  { id: 'divider-to-top-diagonal', x1: '52%', y1: '100%', x2: '70%', y2: '0%' },
  { id: 'top-to-right-diagonal', x1: '52%', y1: '0%', x2: '100%', y2: '55%' },
];

function ContactBackgroundLines() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 'calc(clamp(7rem, 16vw, 17rem) * 0.69)',
          left: 0,
          width: '80%',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240, 232, 236, 0.38) 0%, rgba(240, 232, 236, 0.38) 72%, rgba(240, 232, 236, 0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '7%',
          bottom: 0,
          width: '3px',
          height: '30%',
          background: 'linear-gradient(to top, rgba(240, 232, 236, 0.38) 0%, rgba(240, 232, 236, 0.38) 72%, rgba(240, 232, 236, 0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          bottom: '7%',
          width: '20%',
          height: '3px',
          background: 'linear-gradient(to right, rgba(240, 232, 236, 0.38) 0%, rgba(240, 232, 236, 0.38) 68%, rgba(240, 232, 236, 0) 100%)',
          zIndex: 1,
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
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {CONTACT_BACKGROUND_LINES.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={BACKGROUND_LINE_COLOR}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="square"
          />
        ))}
      </svg>
    </>
  );
}

function ContactPortraitRing({ animationsEnabled }: { animationsEnabled: boolean }) {
  const playState = animationsEnabled ? 'running' : 'paused';

  return (
    <svg
      data-contact-rotating-ring
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '120%',
        height: '120%',
        transform: 'translate(-50%, -50%)',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="rgba(240, 232, 236, 0.5)"
        strokeWidth="0.7"
        pathLength="360"
        strokeDasharray="174 6"
        strokeDashoffset="90"
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation: 'spin 26s linear infinite',
          animationPlayState: playState,
        }}
      />
    </svg>
  );
}

export default function ContactPage({
  isActive,
  animationsEnabled,
  initialEntryDelaySeconds,
  pageState,
  registerNavigation,
  playSoundEffect,
  onEntryAnimationComplete,
}: ContactPageProps) {
  const viewportProfile = useViewportProfile();
  const containerRef = useRef<HTMLElement>(null);
  const panelSlotRef = useRef<HTMLDivElement>(null);
  const panelFrameRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const entryDelayRef = useRef<gsap.core.Tween | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevIsActive = useRef(isActive);
  const selectedIndexRef = useRef(0);
  const [visibleRows, setVisibleRows] = useState(CONTACTS.length);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const contactItem = MENU_ITEMS.find((item) => item.id === 'contact');
  const accent = contactItem
    ? `hsl(${contactItem.accentH} ${contactItem.accentS} ${contactItem.accentL})`
    : 'hsl(25 80% 50%)';
  const isCompact = viewportProfile.layoutMode === 'compact';
  const isNarrowCompactViewport = isCompact && typeof window !== 'undefined' && window.innerWidth <= 380;
  const contactRowHeight = isCompact
    ? isNarrowCompactViewport
      ? NARROW_COMPACT_CONTACT_ROW_HEIGHT
      : COMPACT_CONTACT_ROW_HEIGHT
    : CONTACT_ROW_HEIGHT;

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const selectContact = useCallback((nextIndex: number, options?: { playSound?: boolean }) => {
    const clampedIndex = Math.max(0, Math.min(CONTACTS.length - 1, nextIndex));
    const changed = selectedIndexRef.current !== clampedIndex;
    selectedIndexRef.current = clampedIndex;
    setSelectedIndex(clampedIndex);
    if (changed && options?.playSound !== false) {
      playSoundEffect('switch');
    }
    return changed;
  }, [playSoundEffect]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (!animationsEnabled) return;
    const shouldDelayDirectMountPlayback = pageState === 'page-active';
    let rafId: number | null = null;
    let nestedRafId: number | null = null;
    entryTlRef.current = createContactEntryTimeline(containerRef.current, {
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

  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    const wipeLine = containerRef.current.querySelector('[data-contact-wipe]');
    if (!wipeLine) return;
    gsap.set(wipeLine, { autoAlpha: 0 });
  }, [animationsEnabled]);

  useLayoutEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (!wasActive || isActive || !containerRef.current || !animationsEnabled) return;

    exitTlRef.current?.kill();
    exitTlRef.current = createContactExitTimeline(containerRef.current);
  }, [animationsEnabled, isActive]);

  useEffect(() => {
    return () => {
      exitTlRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    const row = rowRefs.current[selectedIndex];
    row?.scrollIntoView({ block: 'nearest', behavior: animationsEnabled ? 'smooth' : 'auto' });
  }, [animationsEnabled, selectedIndex]);

  useEffect(() => {
    const panelSlot = panelSlotRef.current;
    const panel = panelFrameRef.current;
    if (!panelSlot || !panel) return;

    const updateVisibleRows = rafThrottle(() => {
      const availableHeight = panelSlot.clientHeight;
      const availableForRows = availableHeight - PANEL_TOP_PADDING - PANEL_BOTTOM_PADDING;
      const nextVisibleRows = Math.max(
        MIN_VISIBLE_ROWS,
        Math.min(CONTACTS.length, Math.floor(availableForRows / contactRowHeight))
      );
      setVisibleRows(nextVisibleRows);
    });

    const resizeObserver = new ResizeObserver(updateVisibleRows);
    resizeObserver.observe(panelSlot);
    resizeObserver.observe(panel);
    window.addEventListener('resize', updateVisibleRows);
    updateVisibleRows();

    return () => {
      updateVisibleRows.cancel();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleRows);
    };
  }, [contactRowHeight]);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      captureWheel: true,
      onDirection: (direction, context) => {
        const isRepeat = context?.isRepeat ?? false;
        const currentIndex = selectedIndexRef.current;

        if (direction === 'up') {
          if (isRepeat && currentIndex === 0) return false;
          return selectContact(currentIndex === 0 ? CONTACTS.length - 1 : currentIndex - 1);
        }

        if (direction === 'down') {
          if (isRepeat && currentIndex === CONTACTS.length - 1) return false;
          return selectContact(currentIndex === CONTACTS.length - 1 ? 0 : currentIndex + 1);
        }

        if (direction === 'left') {
          return selectContact(currentIndex === 0 ? CONTACTS.length - 1 : 0);
        }

        if (direction === 'right') {
          return selectContact(currentIndex === CONTACTS.length - 1 ? 0 : CONTACTS.length - 1);
        }

        return false;
      },
      onWheelDirection: (direction) => {
        if (direction === 'up') return selectContact(selectedIndexRef.current - 1);
        return selectContact(selectedIndexRef.current + 1);
      },
      onConfirm: () => {
        const row = rowRefs.current[selectedIndexRef.current];
        if (!row) return false;
        row.click();
        return true;
      },
    });

    return () => registerNavigation(null);
  }, [isActive, registerNavigation, selectContact]);

  const listViewportHeight = visibleRows * contactRowHeight;
  const panelHeight = PANEL_TOP_PADDING + PANEL_BOTTOM_PADDING + listViewportHeight;
  const bobAnim = isActive && animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  const ringsActive = isActive || pageState === 'entering-page';

  return (
    <section
      ref={containerRef}
      inert={!isActive}
      data-contact-page
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

      <div data-contact-geo-lines style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <ContactBackgroundLines />
      </div>

      <div
        aria-hidden="true"
        data-contact-rings
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          clipPath: CONTACT_RINGS_CLIP_PATH,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-14vw',
            bottom: '-24vh',
            width: '88vw',
            height: '88vw',
            minWidth: '52rem',
            minHeight: '52rem',
            opacity: 0.9,
          }}
        >
          <ContactRings isActive={ringsActive} animationsEnabled={animationsEnabled} />
        </div>
      </div>

      <div
        data-contact-watermark
        data-page-title
        style={{
          position: 'absolute',
          top: '-3vh',
          left: '-1vw',
          fontSize: 'clamp(7rem, 16vw, 17rem)',
          fontWeight: 900,
          letterSpacing: '-0.06em',
          textTransform: 'uppercase',
          color: COLORS.textPrimary,
          opacity: 0.75,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        Contact
      </div>

      <div
        data-contact-wipe
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-8vh',
          bottom: '-8vh',
          left: 'calc(8vw + min(54vw, 48rem) + 1.8rem)',
          width: '8px',
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 0 28px rgba(255, 255, 255, 0.32)',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0,
          visibility: 'hidden',
        }}
      />

      <div
        data-contact-content
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          height: '100%',
          padding: '12vh 6vw 7vh 8vw',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: '4vw',
        }}
      >
        <div
          data-contact-divider-line
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 'calc(8vw + min(54vw, 48rem) + 1.8rem)',
            width: '8px',
            background: BACKGROUND_LINE_COLOR,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        <div
          data-contact-panel
          ref={panelSlotRef}
          style={{
            position: 'relative',
            width: 'min(54vw, 48rem)',
            height: '100%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: `-${PANEL_BORDER_WIDTH}px`,
              right: `-${PANEL_BORDER_WIDTH}px`,
              height: `${panelHeight + PANEL_BORDER_WIDTH * 2}px`,
              transform: 'translateY(-50%)',
              background: PANEL_BORDER_COLOR,
              clipPath: PANEL_CLIP_PATH,
              pointerEvents: 'none',
            }}
          />

          <div
            ref={panelFrameRef}
            style={{
              position: 'relative',
              width: '100%',
              height: `${panelHeight}px`,
              minHeight: 0,
            }}
          >
            <ScrollViewport
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: `${panelHeight}px`,
                transform: 'translateY(-50%)',
                overflow: 'hidden',
                clipPath: PANEL_CLIP_PATH,
              }}
              viewportStyle={{
                display: 'flex',
                flexDirection: 'column',
                height: `${listViewportHeight}px`,
                minHeight: 0,
                background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
                boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
                padding: `${PANEL_TOP_PADDING}px ${PANEL_SIDE_PADDING}px ${PANEL_BOTTOM_PADDING}px`,
                boxSizing: 'border-box',
              }}
              thumbColor="rgba(255, 214, 224, 0.62)"
              thumbHoverColor="rgba(255, 214, 224, 0.95)"
            >
              {CONTACTS.map((contact, index) => (
                <a
                  key={contact.platform}
                  href={contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-contact-row
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  onMouseEnter={() => selectContact(index)}
                  onFocus={() => selectContact(index)}
                  onClick={() => playSoundEffect('enter')}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    height: `${contactRowHeight}px`,
                    minHeight: `${contactRowHeight}px`,
                    padding: `0 ${PANEL_SIDE_PADDING}px`,
                    marginLeft: `-${PANEL_SIDE_PADDING}px`,
                    marginRight: `-${PANEL_SIDE_PADDING}px`,
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    background: index === selectedIndex ? 'linear-gradient(90deg, rgba(255, 173, 110, 0.18), rgba(255, 173, 110, 0.05) 68%, transparent)' : 'transparent',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '0.35rem',
                      background: index === selectedIndex ? accent : 'rgba(255, 255, 255, 0.12)',
                      boxShadow: index === selectedIndex ? `0 0 18px ${accent}` : 'none',
                      opacity: index === selectedIndex ? 1 : 0.55,
                      pointerEvents: 'none',
                    }}
                  />
                  {index < CONTACTS.length - 1 ? (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: `${PANEL_BORDER_WIDTH}px`,
                        background: PANEL_BORDER_COLOR,
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}
                  <div
                    data-contact-row-main
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}
                  >
                    <div
                      data-contact-row-icon
                      aria-label={contact.iconAlt}
                      style={{
                        width: '3.35rem',
                        height: '3.35rem',
                        borderRadius: '50%',
                        border: '1px solid rgba(240, 232, 236, 0.28)',
                        background: 'rgba(255, 255, 255, 1)',
                        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={contact.iconSrc}
                        alt={contact.iconAlt}
                        style={{
                          width: '62%',
                          height: '62%',
                          objectFit: 'contain',
                          display: 'block',
                          transform: `translate(${contact.iconOffsetX ?? '0%'}, ${contact.iconOffsetY ?? '0%'}) scale(${contact.iconScale ?? 1})`,
                          transformOrigin: '50% 50%',
                        }}
                      />
                    </div>
                    <div
                      data-contact-row-copy
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}
                    >
                      <div
                        data-contact-row-title
                        style={{
                          fontSize: 'var(--font-fluid-lg)',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: index === selectedIndex ? COLORS.textPrimary : COLORS.textPrimary,
                        }}
                      >
                        {contact.platform}
                      </div>
                      <div
                        data-contact-row-handle
                        style={{
                          fontSize: 'var(--font-fluid-md)',
                          color: index === selectedIndex ? accent : 'rgba(255, 197, 160, 0.92)',
                          letterSpacing: '0.04em',
                          wordBreak: 'break-word',
                        }}
                      >
                        {contact.handle}
                      </div>
                    </div>
                  </div>
                  <div
                    data-contact-row-badge
                    style={{
                      padding: '0.38rem 0.82rem',
                      background: index === selectedIndex ? 'rgba(255, 173, 110, 0.14)' : 'rgba(240, 232, 236, 0.05)',
                      border: index === selectedIndex ? `1px solid ${accent}` : '1px solid rgba(240, 232, 236, 0.14)',
                      fontSize: 'var(--font-fluid-xs)',
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: index === selectedIndex ? COLORS.textPrimary : COLORS.textPrimaryFade,
                    }}
                  >
                    {contact.descriptor}
                  </div>
                </a>
              ))}
            </ScrollViewport>
          </div>
        </div>

        <div
          data-contact-portrait
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
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
                background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(130, 50, 200, 0.75) 0%, transparent 65%)',
                animation: glowAnim,
                pointerEvents: 'none',
              }}
            />
            <ContactPortraitRing animationsEnabled={animationsEnabled} />
            <div
              data-contact-portrait-circle
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(240, 232, 236, 0.25)',
                boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.3), 0 0 4rem rgba(0,0,0,0.6)',
              }}
            >
              <img
                    src="/assets/coby-stare.webp"
                alt="Coby staring at the camera"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transform: `scale(1.2)`,
                  transformOrigin: '35% 100%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

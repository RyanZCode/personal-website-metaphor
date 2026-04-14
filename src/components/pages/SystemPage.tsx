import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import type { RegisterPageNavigation } from '../../lib/pageNavigation';
import type { PlaySoundEffect } from '../../lib/soundEffects';
import SystemGlitch from '../menu/splashEffects/SystemGlitch';
import PageBackground from '../background/PageBackground';
import ScrollViewport from '../shared/ScrollViewport';
import { createSystemEntryTimeline, createSystemExitTimeline } from '../../lib/animations';
import { rafThrottle } from '../../lib/rafThrottle';

interface SystemPageProps {
  isActive: boolean;
  pageState: 'entering-page' | 'page-active' | 'exiting-page';
  cursorStyle: 'default' | 'metaphor';
  onCursorChange: (style: 'default' | 'metaphor') => void;
  bgInverted: boolean;
  onBgInvertedChange: (inverted: boolean) => void;
  animationsEnabled: boolean;
  onAnimationsToggle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  registerNavigation: RegisterPageNavigation;
  playSoundEffect: PlaySoundEffect;
}

interface SystemOption {
  label: string;
  description: string;
}

const PANEL_CLIP_PATH = 'polygon(0 0, 94% 0, 100% 10%, 100% 100%, 6% 100%, 0 90%)';
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.52)';
const PANEL_TOP_PADDING = 0;
const PANEL_BOTTOM_PADDING = 0;
const PANEL_SIDE_PADDING = 0;
const SYSTEM_ROW_HEIGHT = 156;
const MIN_VISIBLE_ROWS = 1;
const TOGGLE_BUTTON_WIDTH = '11.75rem';
const BACKGROUND_LINE_COLOR = 'rgba(240, 232, 236, 0.38)';
const SYSTEM_ROW_COUNT = 4;

const CURSOR_OPTIONS: Array<SystemOption & { id: 'default' | 'metaphor' }> = [
  { id: 'default', label: 'Default', description: 'System pointer for a cleaner interface.' },
  { id: 'metaphor', label: 'Metaphor', description: 'Custom cursor styled after the game UI.' },
];

const BACKGROUND_OPTIONS: Array<SystemOption & { id: boolean }> = [
  { id: false, label: 'Default', description: 'Blue on the left, red on the right.' },
  { id: true, label: 'Inverted', description: 'Red on the left, blue on the right.' },
];

const ANIMATION_OPTIONS: Array<SystemOption & { id: boolean }> = [
  { id: true, label: 'On', description: 'Ambient motion and transitions stay fully active.' },
  { id: false, label: 'Off', description: 'Reduced motion across page transitions and effects.' },
];

const SOUND_OPTIONS: Array<SystemOption & { id: boolean }> = [
  { id: true, label: 'On', description: 'Interface sound remains enabled.' },
  { id: false, label: 'Off', description: 'Interface sound remains muted.' },
];

interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  interactive?: boolean;
  side: 'left' | 'right';
  rowSelected?: boolean;
}

function ChoiceButton({ label, selected, onClick, interactive = true, side, rowSelected = false }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      aria-pressed={selected}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TOGGLE_BUTTON_WIDTH,
        minWidth: TOGGLE_BUTTON_WIDTH,
        flex: `0 0 ${TOGGLE_BUTTON_WIDTH}`,
        height: '3.55rem',
        padding: side === 'left' ? '0 1.2rem 0 1.6rem' : '0 1.2rem 0 1.4rem',
        border: 'none',
        borderLeft: side === 'right' ? '1px solid rgba(0, 0, 0, 0.2)' : 'none',
        background: selected ? 'rgba(245, 242, 240, 0.98)' : 'rgba(220, 220, 220, 0.9)',
        color: selected ? 'rgba(30, 30, 30, 0.9)' : 'rgba(110, 110, 110, 0.92)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: '"Cinzel", serif',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background 120ms ease, color 120ms ease, filter 120ms ease',
        outline: rowSelected ? '2px solid rgba(162, 246, 233, 0.5)' : 'none',
        outlineOffset: rowSelected ? '2px' : '0',
        clipPath:
          side === 'left'
            ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
            : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        filter: selected ? 'brightness(1)' : 'brightness(0.92)',
      }}
    >
      {selected ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: side === 'left' ? '0.5rem' : '0.6rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '0.34rem solid transparent',
            borderBottom: '0.34rem solid transparent',
            borderLeft: '0.46rem solid rgba(60, 60, 60, 0.9)',
          }}
        />
      ) : null}
      <span
        style={{
          fontSize: 'var(--font-fluid-md)',
          fontWeight: 900,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
}

interface SystemRowProps {
  title: string;
  detail: string;
  controls: import('react').ReactNode;
  bordered?: boolean;
  selected?: boolean;
  onMouseEnter?: () => void;
  rowRef?: (node: HTMLDivElement | null) => void;
}

function SystemRow({ title, detail, controls, bordered = true, selected = false, onMouseEnter, rowRef }: SystemRowProps) {
  return (
    <div
      ref={rowRef}
      onMouseEnter={onMouseEnter}
      style={{
        position: 'relative',
        display: 'flex',
        gap: '1.75rem',
        alignItems: 'stretch',
        padding: '1.7rem clamp(0.85rem, 1.6vw, 2.2rem) 1.8rem 2.4rem',
        height: 'auto',
        minHeight: `${SYSTEM_ROW_HEIGHT}px`,
        boxSizing: 'border-box',
        borderBottom: bordered ? `2px solid ${PANEL_BORDER_COLOR}` : 'none',
        background: selected ? 'linear-gradient(90deg, rgba(32, 119, 110, 0.28), rgba(32, 119, 110, 0.08) 65%, transparent)' : 'transparent',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '0.4rem',
          background: 'linear-gradient(180deg, rgba(162, 246, 233, 1), rgba(47, 177, 165, 0.28))',
          boxShadow: selected ? '0 0 18px rgba(162, 246, 233, 0.45)' : 'none',
          opacity: selected ? 1 : 0,
        }}
      />
        <div
          style={{
            flex: '1.28 1 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.55rem',
            minWidth: 0,
            alignSelf: 'stretch',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--font-fluid-xl)',
            lineHeight: 0.88,
            letterSpacing: '-0.06em',
            textTransform: 'uppercase',
            color: COLORS.textPrimary,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            alignSelf: 'flex-start',
            marginLeft: '1.9rem',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'fit-content',
            maxWidth: '100%',
            padding: '0.45rem 1.45rem',
            fontFamily: 'Cambria, "Times New Roman", serif',
            fontSize: 'var(--font-fluid-sm)',
            lineHeight: 1.35,
            textAlign: 'center',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            color: 'rgba(20, 20, 20, 0.92)',
            background: 'rgba(245, 242, 240, 0.95)',
            clipPath: 'polygon(0.8rem 0%, 100% 0%, calc(100% - 0.8rem) 100%, 0% 100%)',
            opacity: selected ? 1 : 0,
            visibility: selected ? 'visible' : 'hidden',
            transform: selected ? 'translateX(0)' : 'translateX(0.35rem)',
            transition: 'opacity 120ms ease, transform 120ms ease, visibility 120ms ease',
          }}
        >
          {detail}
        </p>
      </div>
      <div
        style={{
          flex: '0.9 1 16rem',
          display: 'flex',
          width: '100%',
          minWidth: 0,
          height: '100%',
          justifyContent: 'flex-end',
          alignItems: 'center',
          alignSelf: 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            alignContent: 'center',
            gap: 0,
            flexWrap: 'wrap',
            width: 'min(100%, clamp(23.35rem, 34vw, 23.7rem))',
            maxWidth: '100%',
            marginRight: 'clamp(0.35rem, 1vw, 1rem)',
          }}
        >
          {controls}
        </div>
      </div>
    </div>
  );
}

export default function SystemPage({
  isActive,
  pageState,
  cursorStyle,
  onCursorChange,
  bgInverted,
  onBgInvertedChange,
  animationsEnabled,
  onAnimationsToggle,
  soundEnabled,
  onSoundToggle,
  registerNavigation,
  playSoundEffect,
}: SystemPageProps) {
  const containerRef = useRef<HTMLElement>(null);
  const panelSlotRef = useRef<HTMLDivElement>(null);
  const panelFrameRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const prevIsActive = useRef(isActive);
  const selectedRowIndexRef = useRef(0);
  const [visibleRows, setVisibleRows] = useState(3);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const glitchActive = isActive || pageState === 'entering-page';
  const bobAnim = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  useEffect(() => {
    selectedRowIndexRef.current = selectedRowIndex;
  }, [selectedRowIndex]);

  const selectRow = useCallback((nextRowIndex: number, options?: { playSound?: boolean }) => {
    const clampedIndex = Math.max(0, Math.min(SYSTEM_ROW_COUNT - 1, nextRowIndex));
    const changed = selectedRowIndexRef.current !== clampedIndex;
    selectedRowIndexRef.current = clampedIndex;
    setSelectedRowIndex(clampedIndex);
    if (changed && options?.playSound !== false) {
      playSoundEffect('switch');
    }
    return changed;
  }, [playSoundEffect]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current || !animationsEnabled) return;
    entryTlRef.current = createSystemEntryTimeline(containerRef.current);
    return () => {
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (animationsEnabled || !containerRef.current) return;
    const wipeLine = containerRef.current.querySelector('[data-system-wipe]');
    if (!wipeLine) return;
    gsap.set(wipeLine, { autoAlpha: 0 });
  }, [animationsEnabled]);

  useEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (wasActive && !isActive && containerRef.current && animationsEnabled) {
      exitTlRef.current?.kill();
      exitTlRef.current = createSystemExitTimeline(containerRef.current);
    }
  }, [isActive, animationsEnabled]);

  useEffect(() => {
    return () => {
      exitTlRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    const panelSlot = panelSlotRef.current;
    const panel = panelFrameRef.current;
    if (!panelSlot || !panel) return;

    const updateVisibleRows = rafThrottle(() => {
      const availableHeight = panelSlot.clientHeight;
      const availableForRows = availableHeight - PANEL_TOP_PADDING - PANEL_BOTTOM_PADDING;
      const nextVisibleRows = Math.max(
        MIN_VISIBLE_ROWS,
        Math.min(4, Math.floor(availableForRows / SYSTEM_ROW_HEIGHT))
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
  }, []);

  useEffect(() => {
    const updateViewportSize = rafThrottle(() => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });

    window.addEventListener('resize', updateViewportSize);
    updateViewportSize();

    return () => {
      updateViewportSize.cancel();
      window.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  useEffect(() => {
    const row = rowRefs.current[selectedRowIndex];
    row?.scrollIntoView({ block: 'nearest', behavior: animationsEnabled ? 'smooth' : 'auto' });
  }, [animationsEnabled, selectedRowIndex]);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      captureWheel: true,
      onDirection: (direction, context) => {
        const isRepeat = context?.isRepeat ?? false;
        const currentRowIndex = selectedRowIndexRef.current;

        if (direction === 'up') {
          if (isRepeat && currentRowIndex === 0) return false;
          return selectRow(currentRowIndex === 0 ? SYSTEM_ROW_COUNT - 1 : currentRowIndex - 1);
        }

        if (direction === 'down') {
          if (isRepeat && currentRowIndex === SYSTEM_ROW_COUNT - 1) return false;
          return selectRow(currentRowIndex === SYSTEM_ROW_COUNT - 1 ? 0 : currentRowIndex + 1);
        }

        if (direction === 'left') {
          if (currentRowIndex === 0) {
            onCursorChange(cursorStyle === 'default' ? 'metaphor' : 'default');
            return true;
          }
          if (currentRowIndex === 1) {
            onBgInvertedChange(!bgInverted);
            return true;
          }
          if (currentRowIndex === 2) {
            onAnimationsToggle();
            return true;
          }
          if (currentRowIndex === 3) {
            onSoundToggle();
            return true;
          }
          return false;
        }

        if (direction === 'right') {
          if (currentRowIndex === 0) {
            onCursorChange(cursorStyle === 'default' ? 'metaphor' : 'default');
            return true;
          }
          if (currentRowIndex === 1) {
            onBgInvertedChange(!bgInverted);
            return true;
          }
          if (currentRowIndex === 2) {
            onAnimationsToggle();
            return true;
          }
          if (currentRowIndex === 3) {
            onSoundToggle();
            return true;
          }
          return false;
        }

        return false;
      },
      onWheelDirection: (direction) => {
        if (direction === 'up') {
          return selectRow(selectedRowIndexRef.current - 1);
        }

        return selectRow(selectedRowIndexRef.current + 1);
      },
    });

    return () => registerNavigation(null);
  }, [
    animationsEnabled,
    bgInverted,
    cursorStyle,
    isActive,
    onAnimationsToggle,
    onBgInvertedChange,
    onCursorChange,
    onSoundToggle,
    playSoundEffect,
    registerNavigation,
    selectRow,
    soundEnabled,
  ]);

  const listViewportHeight = visibleRows * SYSTEM_ROW_HEIGHT;
  const panelHeight = PANEL_TOP_PADDING + PANEL_BOTTOM_PADDING + listViewportHeight;
  const dividerX = viewportSize.width * 0.41;

  return (
    <section
      ref={containerRef}
      aria-hidden={!isActive}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        padding: '8vh 6vw 6vh 0',
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
      >
      <PageBackground />
      <div
        data-system-glitch
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
        }}
      >
        <SystemGlitch isActive={glitchActive} animationsEnabled={animationsEnabled} />
      </div>

      <div
        data-system-background
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* Watermark underline */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(clamp(7rem, 16vw, 17rem) * 0.69)',
            left: 0,
            width: '75%',
            height: '3px',
            background: 'linear-gradient(to right, rgba(240,232,236,0.38) 0%, rgba(240,232,236,0.38) 70%, transparent 100%)',
          }}
        />
        {/* Divider between portrait and panel */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: `${dividerX}px`,
            width: '8px',
            background: BACKGROUND_LINE_COLOR,
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
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
          preserveAspectRatio="none"
        >
          {/* Large right-dipping screen arc */}
          <path
            d={`M ${viewportSize.width * 0.7} -1 Q ${viewportSize.width * 0.9} ${viewportSize.height * 0.5} ${viewportSize.width * 0.7} ${viewportSize.height}`}
            fill="none"
            stroke={BACKGROUND_LINE_COLOR}
            strokeWidth="3"
          />
          {/* Upper-left diagonal */}
          <line
            x1="-1"
            y1={viewportSize.height * 0.4}
            x2={viewportSize.width * 0.65}
            y2="-1"
            stroke={BACKGROUND_LINE_COLOR}
            strokeWidth="3"
          />
          {/* Lower-left arc into the divider */}
          <path
            d={`M 0 ${viewportSize.height * 0.5} Q ${viewportSize.width * 0.05} ${viewportSize.height * 0.98} ${dividerX} ${viewportSize.height * 0.95}`}
            fill="none"
            stroke={BACKGROUND_LINE_COLOR}
            strokeWidth="3"
          />
        </svg>
        <div
          data-system-watermark
          style={{
            position: 'absolute',
            top: '-3vh',
            left: '-1vw',
            fontSize: 'clamp(7rem, 16vw, 17rem)',
            fontWeight: 900,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            textTransform: 'uppercase',
            color: COLORS.textPrimary,
            opacity: 0.75,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          System
        </div>

        <div
          data-system-portrait
          style={{
            position: 'absolute',
            top: '10vh',
            bottom: '10vh',
            left: '9vw',
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
                background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(130, 50, 200, 0.75) 0%, transparent 65%)',
                animation: glowAnim,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(240, 232, 236, 0.25)',
                boxShadow: '0 0 0 1px rgba(130, 50, 200, 0.3), 0 0 4rem rgba(0, 0, 0, 0.6)',
              }}
            >
              <img
                src="/assets/coby-sleep.jpg"
                alt="Coby sleeping"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '50% 38%',
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transform: 'rotate(120deg) scale(1.26)',
                  transformOrigin: '55% 55%',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        data-system-panel
        ref={panelSlotRef}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'stretch',
          width: 'min(54vw, 58rem)',
          height: '100%',
          minWidth: '0',
          marginRight: '2.5vw',
        }}
      >
        <div
          ref={panelFrameRef}
          style={{
            position: 'relative',
            width: '100%',
            height: `${panelHeight}px`,
            minHeight: 0,
            alignSelf: 'center',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              right: '-2px',
              bottom: '-2px',
              background: PANEL_BORDER_COLOR,
              clipPath: PANEL_CLIP_PATH,
              pointerEvents: 'none',
            }}
          />
          <ScrollViewport
            style={{
              position: 'relative',
              width: '100%',
              height: `${panelHeight}px`,
              overflow: 'hidden',
              clipPath: PANEL_CLIP_PATH,
              boxShadow: '0 2rem 5rem rgba(0, 0, 0, 0.42)',
            }}
            viewportStyle={{
              display: 'flex',
              flexDirection: 'column',
              height: `${listViewportHeight}px`,
              minHeight: 0,
              background: 'linear-gradient(140deg, rgba(10, 29, 26, 0.92), rgba(4, 7, 7, 0.88))',
              boxShadow: 'inset 0 0 0 1px rgba(35, 175, 155, 0.18)',
              padding: `${PANEL_TOP_PADDING}px ${PANEL_SIDE_PADDING}px ${PANEL_BOTTOM_PADDING}px`,
              boxSizing: 'border-box',
            }}
            thumbColor="rgba(162, 246, 233, 0.62)"
            thumbHoverColor="rgba(162, 246, 233, 0.98)"
          >
            <SystemRow
              title="Cursor"
              detail="Change the cursor appearance."
              selected={selectedRowIndex === 0}
              onMouseEnter={() => selectRow(0)}
              rowRef={(node) => { rowRefs.current[0] = node; }}
              controls={CURSOR_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.id}
                  label={opt.label}
                  selected={cursorStyle === opt.id}
                  onClick={() => onCursorChange(opt.id)}
                  interactive={cursorStyle !== opt.id}
                  rowSelected={selectedRowIndex === 0}
                  side={opt.id === 'default' ? 'left' : 'right'}
                />
              ))}
            />

            <SystemRow
              title="Background"
              detail="Change the background colour."
              selected={selectedRowIndex === 1}
              onMouseEnter={() => selectRow(1)}
              rowRef={(node) => { rowRefs.current[1] = node; }}
              controls={BACKGROUND_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.label}
                  label={opt.label}
                  selected={bgInverted === opt.id}
                  onClick={() => onBgInvertedChange(opt.id)}
                  interactive={bgInverted !== opt.id}
                  rowSelected={selectedRowIndex === 1}
                  side={opt.id === false ? 'left' : 'right'}
                />
              ))}
            />

            <SystemRow
              title="Motion"
              detail="Enable animations."
              selected={selectedRowIndex === 2}
              onMouseEnter={() => selectRow(2)}
              rowRef={(node) => { rowRefs.current[2] = node; }}
              controls={ANIMATION_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.label}
                  label={opt.label}
                  selected={animationsEnabled === opt.id}
                  onClick={() => {
                    if (animationsEnabled !== opt.id) onAnimationsToggle();
                  }}
                  interactive={animationsEnabled !== opt.id}
                  rowSelected={selectedRowIndex === 2}
                  side={opt.id === true ? 'left' : 'right'}
                />
              ))}
            />

            <SystemRow
              title="Sound"
              detail="Enable audio."
              bordered={false}
              selected={selectedRowIndex === 3}
              onMouseEnter={() => selectRow(3)}
              rowRef={(node) => { rowRefs.current[3] = node; }}
              controls={SOUND_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.label}
                  label={opt.label}
                  selected={soundEnabled === opt.id}
                  onClick={() => {
                    if (soundEnabled !== opt.id) onSoundToggle();
                  }}
                  interactive={soundEnabled !== opt.id}
                  rowSelected={selectedRowIndex === 3}
                  side={opt.id === true ? 'left' : 'right'}
                />
              ))}
            />
          </ScrollViewport>
        </div>
      </div>

      <div
        data-system-wipe
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '16vw',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.32)',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0,
        }}
      />
    </section>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import {
  createExperienceEntryTimeline,
  createExperienceExitTimeline,
} from '../../lib/animations';
import { readViewportProfile, useViewportProfile } from '../../lib/deviceProfile';
import type { RegisterPageNavigation } from '../../lib/pageNavigation';
import PageBackground from '../background/PageBackground';
import ExperienceRipples from '../menu/splashEffects/ExperienceRipples';
import { rafThrottle } from '../../lib/rafThrottle';
import { usePageAnimationLifecycle } from '../../hooks/usePageAnimationLifecycle';
import {
  COMPACT_GEOMETRY,
  DEFAULT_GEOMETRY,
  EXPERIENCE_ACCENT,
  EXPERIENCE_BOTTOM_SCROLL_SPACE_REM,
  EXPERIENCE_SCROLL_STEP,
  JOBS,
  ROW_PADDING_R_VW,
  buildRowLayouts,
  computeRippleLayout,
  createDefaultRowLayout,
  getElementTranslate,
  haveRowLayoutsChanged,
  type ExperienceLayoutMeasurement,
  type RowLayout,
} from './experience/experienceLayout';

interface ExperiencePageProps {
  isActive: boolean;
  animationsEnabled: boolean;
  initialEntryDelaySeconds: number;
  pageState: 'entering-page' | 'page-active' | 'exiting-page';
  registerNavigation: RegisterPageNavigation;
  onEntryAnimationComplete?: () => void;
}


export default function ExperiencePage({
  isActive,
  animationsEnabled,
  initialEntryDelaySeconds,
  pageState,
  registerNavigation,
  onEntryAnimationComplete,
}: ExperiencePageProps) {
  const viewportProfile = useViewportProfile();
  const isCompact = viewportProfile.layoutMode === 'compact';
  const geometry = isCompact ? COMPACT_GEOMETRY : DEFAULT_GEOMETRY;
  const containerRef = useRef<HTMLElement | null>(null);
  const bobAnim  = animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const glowAnim = animationsEnabled ? 'portrait-glow 3s ease-in-out infinite' : 'none';
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollOffsetRef = useRef(0);
  const rowMeasurementRef = useRef<ExperienceLayoutMeasurement | null>(null);
  const measureRowLayoutsRef = useRef<(() => void) | null>(null);
  const touchScrollRef = useRef<{ startY: number; startOffset: number } | null>(null);

  // 16:9 fallbacks, updated after mount and on resize.
  const [ripple, setRipple] = useState({ angleDeg: 28, rightVw: -63, bottomVh: -57, sideVw: 80 });
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const [scrollOffset, setScrollOffset] = useState(0);
  const [maxScrollOffset, setMaxScrollOffset] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({ viewportWidth: 1, viewportHeight: 1, contentHeight: 1 });
  const [rowLayouts, setRowLayouts] = useState<RowLayout[]>(
    () => JOBS.map(() => createDefaultRowLayout())
  );

  useEffect(() => {
    scrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  const scrollExperienceTo = useCallback((nextOffset: number) => {
    const clampedOffset = Math.max(0, Math.min(nextOffset, maxScrollOffset));
    if (Math.abs(clampedOffset - scrollOffsetRef.current) < 0.5) {
      return false;
    }

    setScrollOffset(clampedOffset);
    return true;
  }, [maxScrollOffset]);

  const scrollExperienceBy = useCallback((delta: number) => {
    if (maxScrollOffset <= 1) {
      return false;
    }

    return scrollExperienceTo(scrollOffsetRef.current + delta);
  }, [maxScrollOffset, scrollExperienceTo]);

  const createEntryTimeline = useCallback((
    container: Element,
    options?: { paused?: boolean },
  ) => {
    const currentLayoutMode = readViewportProfile().layoutMode;
    container.setAttribute(
      'data-experience-compact',
      currentLayoutMode === 'compact' ? 'true' : 'false',
    );

    return createExperienceEntryTimeline(container, options);
  }, []);

  usePageAnimationLifecycle({
    isActive,
    animationsEnabled,
    initialEntryDelaySeconds,
    pageState,
    containerRef,
    createEntryTimeline,
    createExitTimeline: createExperienceExitTimeline,
    onEntryAnimationComplete,
  });

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
    const update = rafThrottle(() => {
      setRipple(computeRippleLayout());
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
    update();
    window.addEventListener('resize', update);
    return () => {
      update.cancel();
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    const updateScrollMetrics = rafThrottle(() => {
      const viewport = viewportRef.current;
      const content = contentRef.current;

      if (!viewport || !content) return;

      const nextMax = Math.max(0, content.scrollHeight - viewport.clientHeight);
      setMaxScrollOffset(nextMax);
      setScrollOffset((current) => Math.min(current, nextMax));
      setScrollMetrics({
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        contentHeight: content.scrollHeight,
      });
    });

    updateScrollMetrics();

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollMetrics);

    if (resizeObserver) {
      if (viewportRef.current) resizeObserver.observe(viewportRef.current);
      if (contentRef.current) resizeObserver.observe(contentRef.current);
    }

    window.addEventListener('resize', updateScrollMetrics);
    return () => {
      updateScrollMetrics.cancel();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollMetrics);
    };
  }, []);

  useLayoutEffect(() => {
    const measureRowLayoutsNow = () => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (!viewport || !content) {
        return;
      }

      const panelGroup = containerRef.current?.querySelector('[data-experience-panel-group]');
      const panelTranslate = getElementTranslate(panelGroup);
      const viewportRect = viewport.getBoundingClientRect();
      const measurement: ExperienceLayoutMeasurement = {
        contentLeft: viewportRect.left + content.offsetLeft - panelTranslate.x,
        contentTop: viewportRect.top + content.offsetTop - panelTranslate.y,
        contentWidth: content.clientWidth,
        rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
        rows: JOBS.map((_, index) => {
          const row = rowRefs.current[index];
          return row
            ? { offsetTop: row.offsetTop, height: row.offsetHeight }
            : { offsetTop: 0, height: 0 };
        }),
      };

      rowMeasurementRef.current = measurement;
      const nextLayouts = buildRowLayouts(
        measurement,
        scrollOffsetRef.current,
        window.innerWidth,
        window.innerHeight,
        geometry,
      );
      setRowLayouts((currentLayouts) => {
        return haveRowLayoutsChanged(nextLayouts, currentLayouts) ? nextLayouts : currentLayouts;
      });
    };
    const measureRowLayouts = rafThrottle(measureRowLayoutsNow);

    measureRowLayoutsRef.current = measureRowLayouts;

    measureRowLayoutsNow();

    const container = containerRef.current;
    const handleEntryComplete = () => {
      measureRowLayoutsNow();
    };
    container?.addEventListener('experience-entry-complete', handleEntryComplete);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measureRowLayouts);

    if (resizeObserver) {
      if (viewportRef.current) {
        resizeObserver.observe(viewportRef.current);
      }
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
    }

    window.addEventListener('resize', measureRowLayouts);

    return () => {
      if (measureRowLayoutsRef.current === measureRowLayouts) {
        measureRowLayoutsRef.current = null;
      }
      container?.removeEventListener('experience-entry-complete', handleEntryComplete);
      measureRowLayouts.cancel();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureRowLayouts);
    };
  }, [geometry]);

  useEffect(() => {
    measureRowLayoutsRef.current?.();
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      touchScrollRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    const measurement = rowMeasurementRef.current;
    if (!measurement) return;

    const nextLayouts = buildRowLayouts(
      measurement,
      scrollOffset,
      viewportSize.width,
      viewportSize.height,
      geometry,
    );
    setRowLayouts((currentLayouts) => (
      haveRowLayoutsChanged(nextLayouts, currentLayouts) ? nextLayouts : currentLayouts
    ));
  }, [geometry, scrollOffset, viewportSize.height, viewportSize.width]);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      showScrollHint: maxScrollOffset > 1,
      captureWheel: true,
      onDirection: (direction) => {
        if (direction !== 'up' && direction !== 'down') return false;
        const delta = direction === 'down' ? EXPERIENCE_SCROLL_STEP : -EXPERIENCE_SCROLL_STEP;
        return scrollExperienceBy(delta);
      },
    });

    return () => registerNavigation(null);
  }, [isActive, maxScrollOffset, registerNavigation, scrollExperienceBy]);

  const handleViewportTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isActive || maxScrollOffset <= 1 || event.touches.length !== 1) {
      touchScrollRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchScrollRef.current = {
      startY: touch.clientY,
      startOffset: scrollOffsetRef.current,
    };
  }, [isActive, maxScrollOffset]);

  const handleViewportTouchMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touchSession = touchScrollRef.current;
    if (!touchSession || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const delta = touchSession.startY - touch.clientY;
    scrollExperienceTo(touchSession.startOffset + delta);
  }, [scrollExperienceTo]);

  const handleViewportTouchEnd = useCallback(() => {
    touchScrollRef.current = null;
  }, []);

  const bottomScrollSpace = maxScrollOffset > 1 ? `${EXPERIENCE_BOTTOM_SCROLL_SPACE_REM}rem` : '0px';
  const scrollbarThumbFraction = Math.min(
    1,
    Math.max(0.18, scrollMetrics.viewportHeight / Math.max(scrollMetrics.contentHeight, 1))
  );
  const scrollbarProgress = maxScrollOffset <= 1 ? 0 : scrollOffset / maxScrollOffset;
  const trackAngleDeg = Math.atan2(
    ((100 - geometry.rightStartY) / 100) * viewportSize.height,
    ((geometry.rightBottom - 100) / 100) * viewportSize.width
  ) * 180 / Math.PI;
  const trackLengthPx = Math.min(scrollMetrics.viewportHeight * 0.76, scrollMetrics.viewportWidth * 0.7);
  const trackTopPx = scrollMetrics.viewportHeight * 0.16;
  const trackRightPx = isCompact
    ? Math.max(8, scrollMetrics.viewportWidth * 0.025)
    : Math.max(18, scrollMetrics.viewportWidth * 0.075);
  const thumbWidthPx = trackLengthPx * scrollbarThumbFraction;
  const thumbTravelPx = Math.max(0, trackLengthPx - thumbWidthPx);
  const thumbOffsetPx = thumbTravelPx * scrollbarProgress;

  return (
    <section
      ref={containerRef}
      inert={!isActive}
      data-experience-page
      data-experience-compact={isCompact ? 'true' : 'false'}
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

      {/* Watermark - behind the dark panel */}
      <div
        data-experience-watermark
        data-page-title
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
            opacity: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Experience
      </div>

      {!isCompact ? (
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

        </div>
      ) : null}

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
          {!isCompact ? (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '120%',
                height: '120%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: '3px solid rgba(240,232,236,0.34)',
                clipPath: 'inset(0 0 52% 0)',
                pointerEvents: 'none',
              }}
            />
          ) : null}
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
              boxShadow: `0 0 0 1px ${EXPERIENCE_ACCENT}4d, 0 0 4rem rgba(0,0,0,0.6)`,
            }}
          >
            <img
              src="/assets/coby-wistful.webp"
              alt="Coby with a wistful look"
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
        data-experience-lines
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
            background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
            boxShadow: '0 0 0 1px rgba(205, 35, 45, 0.18), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
            clipPath: `polygon(${geometry.leftTop}% 0%, 100% 0%, 100% ${geometry.rightStartY}%, ${geometry.rightBottom}% 100%, ${geometry.leftBottom}% 100%)`,
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
          <line x1={`${geometry.leftTop}%`} y1="0%" x2={`${geometry.leftBottom}%`} y2="100%" stroke="rgba(240,232,236,0.55)" strokeWidth="3" />
          <line x1="100%" y1={`${geometry.rightStartY}%`} x2={`${geometry.rightBottom}%`} y2="100%" stroke="rgba(240,232,236,0.55)" strokeWidth="3" />
        </svg>

        <div
          data-experience-layout
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
            style={{
              width: '100%',
              height: '100%',
              minWidth: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: maxScrollOffset > 1 ? 'stretch' : 'center',
            }}
          >
              <div
                ref={viewportRef}
                onTouchStart={handleViewportTouchStart}
                onTouchMove={handleViewportTouchMove}
                onTouchEnd={handleViewportTouchEnd}
                onTouchCancel={handleViewportTouchEnd}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: maxScrollOffset > 1 ? 'flex-start' : 'center',
                  overscrollBehavior: 'contain',
                  touchAction: maxScrollOffset > 1 ? 'none' : 'auto',
                }}
              >
              {maxScrollOffset > 1 ? (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: `${trackTopPx}px`,
                    left: `calc(100% - ${trackRightPx}px)`,
                    width: `${trackLengthPx}px`,
                    height: '12px',
                    zIndex: 2,
                    pointerEvents: 'none',
                    transform: `translateY(-50%) rotate(${trackAngleDeg}deg)`,
                    transformOrigin: '0 50%',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      width: '100%',
                      height: '4px',
                      transform: 'translateY(-50%)',
                      borderRadius: '999px',
                      background: 'rgba(255, 214, 224, 0.24)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${thumbOffsetPx}px`,
                      top: '50%',
                      width: `${thumbWidthPx}px`,
                      height: '4px',
                      transform: 'translateY(-50%)',
                      borderRadius: '999px',
                      background: 'rgba(255, 214, 224, 0.7)',
                      boxShadow: '0 0 8px rgba(255, 132, 176, 0.42)',
                    }}
                  />
                </div>
              ) : null}
              <div
                data-page-content
                ref={contentRef}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  paddingBottom: bottomScrollSpace,
                  boxSizing: 'border-box',
                  transform: maxScrollOffset > 1 ? `translateY(${-scrollOffset}px)` : 'translateY(0px)',
                  willChange: maxScrollOffset > 1 ? 'transform' : 'auto',
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
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                padding: '0.28rem',
                                background: 'rgba(255, 255, 255, 1)',
                                transform: `translate(${job.logoOffsetX ?? '0%'}, ${job.logoOffsetY ?? '0%'}) scale(${job.logoScale ?? 1})`,
                                transformOrigin: '50% 50%',
                              }}
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
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              alignItems: 'stretch',
                              gap: '0.45rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                   fontSize: 'var(--font-fluid-md)',
                                   fontWeight: 600,
                                   letterSpacing: '0.04em',
                                   color: COLORS.textPrimary,
                                  marginBottom: '0.15rem',
                                  whiteSpace: 'normal',
                                  overflow: 'visible',
                                  textOverflow: 'clip',
                                  lineHeight: 1.05,
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
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
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
                                  whiteSpace: 'normal',
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
                                  whiteSpace: 'normal',
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
          visibility: 'hidden',
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

      {!isCompact ? (
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
      ) : null}
    </section>
  );
}

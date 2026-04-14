import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { rafThrottle, type RafThrottledCallback } from '../../lib/rafThrottle';

interface ScrollViewportProps {
  children: ReactNode;
  style?: CSSProperties;
  viewportStyle?: CSSProperties;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  thumbColor?: string;
  thumbHoverColor?: string;
}

interface ScrollMetrics {
  visible: boolean;
  thumbHeight: number;
  thumbTop: number;
}

const TRACK_WIDTH = 12;
const THUMB_WIDTH = 4;
const MIN_THUMB_HEIGHT = 48;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const ScrollViewport = forwardRef<HTMLDivElement, ScrollViewportProps>(function ScrollViewport(
  {
    children,
    style,
    viewportStyle,
    viewportProps,
    thumbColor = 'rgba(240, 232, 236, 0.24)',
    thumbHoverColor = 'rgba(240, 232, 236, 0.44)',
  },
  forwardedRef
) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const updateMetricsRef = useRef<RafThrottledCallback<[]> | null>(null);
  const observedContentRef = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    visible: false,
    thumbHeight: MIN_THUMB_HEIGHT,
    thumbTop: 0,
  });

  useImperativeHandle(forwardedRef, () => viewportRef.current, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateMetrics = rafThrottle(() => {
      const { clientHeight, scrollHeight, scrollTop } = viewport;
      const scrollRange = scrollHeight - clientHeight;

      if (scrollRange <= 0 || clientHeight <= 0) {
        setMetrics({
          visible: false,
          thumbHeight: MIN_THUMB_HEIGHT,
          thumbTop: 0,
        });
        return;
      }

      const thumbHeight = Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight);
      const maxThumbTop = Math.max(clientHeight - thumbHeight, 0);
      const thumbTop = maxThumbTop === 0 ? 0 : (scrollTop / scrollRange) * maxThumbTop;

      setMetrics({
        visible: true,
        thumbHeight,
        thumbTop,
      });
    });

    const resizeObserver = new ResizeObserver(updateMetrics);
    const syncObservedContent = () => {
      const nextContent = viewport.firstElementChild instanceof HTMLElement
        ? viewport.firstElementChild
        : null;

      if (observedContentRef.current && observedContentRef.current !== nextContent) {
        resizeObserver.unobserve(observedContentRef.current);
      }

      if (nextContent && observedContentRef.current !== nextContent) {
        resizeObserver.observe(nextContent);
      }

      observedContentRef.current = nextContent;
      updateMetrics();
    };
    const mutationObserver = new MutationObserver(syncObservedContent);

    updateMetricsRef.current = updateMetrics;
    resizeObserver.observe(viewport);
    syncObservedContent();
    mutationObserver.observe(viewport, { childList: true });
    viewport.addEventListener('scroll', updateMetrics, { passive: true });
    window.addEventListener('resize', updateMetrics);
    updateMetrics();

    return () => {
      updateMetricsRef.current = null;
      observedContentRef.current = null;
      updateMetrics.cancel();
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', updateMetrics);
      window.removeEventListener('resize', updateMetrics);
    };
  }, []);

  useEffect(() => {
    updateMetricsRef.current?.();
  }, [children]);

  const startDrag = (event: ReactMouseEvent<HTMLDivElement>, dragFromThumb: boolean) => {
    event.preventDefault();

    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !metrics.visible) return;

    setDragging(true);

    const trackRect = track.getBoundingClientRect();
    const maxThumbTop = Math.max(trackRect.height - metrics.thumbHeight, 0);
    const pointerOffset = dragFromThumb
      ? event.clientY - (trackRect.top + metrics.thumbTop)
      : metrics.thumbHeight / 2;

    const updateFromPointer = (clientY: number) => {
      const nextThumbTop = clamp(clientY - trackRect.top - pointerOffset, 0, maxThumbTop);
      const scrollRange = viewport.scrollHeight - viewport.clientHeight;
      viewport.scrollTop = maxThumbTop === 0 ? 0 : (nextThumbTop / maxThumbTop) * scrollRange;
    };

    const onMove = (moveEvent: MouseEvent) => updateFromPointer(moveEvent.clientY);
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    updateFromPointer(event.clientY);
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 0,
        ...style,
      }}
    >
      <div
        {...viewportProps}
        ref={viewportRef}
        style={{
          position: 'relative',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingRight: `${TRACK_WIDTH + 10}px`,
          ...viewportStyle,
        }}
        data-custom-scroll-viewport
      >
        {children}
      </div>

      {metrics.visible && (
        <div
          ref={trackRef}
          onMouseDown={(event) => startDrag(event, false)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: `${TRACK_WIDTH}px`,
            zIndex: 5,
          }}
        >
          <div
            onMouseDown={(event) => {
              event.stopPropagation();
              startDrag(event, true);
            }}
            style={{
              position: 'absolute',
              top: `${metrics.thumbTop}px`,
              right: `${(TRACK_WIDTH - THUMB_WIDTH) / 2}px`,
              width: `${THUMB_WIDTH}px`,
              height: `${metrics.thumbHeight}px`,
              borderRadius: '999px',
              background: hovered || dragging ? thumbHoverColor : thumbColor,
              boxShadow: hovered || dragging ? '0 0 14px rgba(255, 255, 255, 0.28)' : '0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}
          />
        </div>
      )}
    </div>
  );
});

export default ScrollViewport;

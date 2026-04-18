import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS } from '../../lib/constants';
import { MENU_ITEMS } from '../../lib/menuConfig';
import {
  createMemorandumEntryTimeline,
  createMemorandumBrowserReEntryTimeline,
  createMemorandumCategoryTimeline,
  createMemorandumDetailContentEnterTimeline,
  createMemorandumDetailContentExitTimeline,
  createMemorandumDetailEnterTimeline,
  createMemorandumDetailExitTimeline,
  createMemorandumExitTimeline,
  type MemorandumDetailPageTurnDirection,
} from '../../lib/animations';
import type {
  MemorandumColumn,
  MemorandumData,
  MemorandumEntry,
} from '../../lib/memorandum';
import type { RegisterPageNavigation } from '../../lib/pageNavigation';
import {
  buildMemorandumPath,
  parseMemorandumRoute,
  resolveAppRoute,
} from '../../lib/routes';
import type { PlaySoundEffect } from '../../lib/soundEffects';
import PageBackground from '../background/PageBackground';
import MemorandumTrapezoids from '../menu/splashEffects/MemorandumTrapezoids';
import ScrollViewport from '../shared/ScrollViewport';
import { rafThrottle } from '../../lib/rafThrottle';

interface MemorandumPageProps {
  memorandumData: MemorandumData;
  isActive: boolean;
  animationsEnabled: boolean;
  initialEntryDelaySeconds: number;
  pageState: 'entering-page' | 'page-active' | 'exiting-page';
  registerNavigation: RegisterPageNavigation;
  requestPageExit: (options?: { fromPopState?: boolean; playSound?: boolean }) => void;
  readEntryIds: string[];
  onEntryRead: (entryId: string) => void;
  locationPath: string;
  onPathChange: (nextPath: string, options?: { replace?: boolean }) => void;
  playSoundEffect: PlaySoundEffect;
  onEntryAnimationComplete?: () => void;
}

type TimelineCallbackEvent = 'onComplete' | 'onInterrupt';

function appendTimelineCallback(
  timeline: gsap.core.Timeline,
  event: TimelineCallbackEvent,
  callback: () => void,
) {
  const existing = timeline.eventCallback(event) as (() => void) | undefined;
  timeline.eventCallback(event, () => {
    existing?.();
    callback();
  });
}

const LIST_PANEL_CLIP_PATH = 'polygon(0 0, 96% 0, 100% 8%, 100% 100%, 4% 100%, 0 92%)';
const MEMORANDUM_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC',
});
const MEMORANDUM_BOOK_SPINES = [
  {
    label: 'Record',
    left: 16,
    height: 10,
    fontFamily: '"Cinzel", "Palatino Linotype", "Book Antiqua", Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Archive',
    left: 8,
    height: 12,
    fontFamily: '"Baskerville Old Face", Baskerville, Garamond, Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Index',
    left: 23,
    height: 8,
    fontFamily: '"Book Antiqua", Palatino, "Palatino Linotype", serif',
    fontWeight: 700,
  },
  {
    label: 'Notes',
    left: 12,
    height: 11,
    fontFamily: 'Garamond, "Times New Roman", Times, serif',
    fontWeight: 600,
  },
  {
    label: 'Logbook',
    left: 19,
    height: 9,
    fontFamily: 'Cambria, Georgia, serif',
    fontWeight: 700,
  },
  {
    label: 'Memoranda',
    left: 4,
    height: 13,
    fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    fontWeight: 700,
  },
  {
    label: 'Journal',
    left: 26,
    height: 7,
    fontFamily: 'Didot, "Bodoni MT", "Times New Roman", serif',
    fontWeight: 700,
  },
  {
    label: 'Chronicle',
    left: 10,
    height: 10,
    fontFamily: 'Constantia, Cambria, Georgia, serif',
    fontWeight: 700,
  },
] as const;
const MEMORANDUM_BOOK_SPINE_GAP = 0;
const MEMORANDUM_BOOK_SPINE_LAYOUT = MEMORANDUM_BOOK_SPINES.map((spine, index) => ({
  ...spine,
  index,
  top: MEMORANDUM_BOOK_SPINES
    .slice(0, index)
    .reduce((sum, entry) => sum + entry.height + MEMORANDUM_BOOK_SPINE_GAP, 0),
}));

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return (index + length) % length;
}

function formatMemorandumDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return MEMORANDUM_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day))).toUpperCase();
}

function getInitialMemorandumState(locationPath: string, memorandumData: MemorandumData) {
  const parsed = parseMemorandumRoute(locationPath, memorandumData);
  const columns = memorandumData.columns;
  const columnIndex = parsed?.columnIndex ?? 0;
  const selectedEntryIndices = columns.map(() => 0);

  if (parsed?.entrySlug) {
    const entryIndex = columns[columnIndex].entries.findIndex(
      (entry) => entry.slug === parsed.entrySlug
    );
    if (entryIndex >= 0) {
      selectedEntryIndices[columnIndex] = entryIndex;
    }
  }

  return {
    columnIndex,
    selectedEntryIndices,
    detailEntrySlug: parsed?.entrySlug ?? null,
    detailPageIndex: parsed?.pageNumber ? parsed.pageNumber - 1 : 0,
  };
}

function findMemorandumEntryBySlug(columns: MemorandumColumn[], slug: string | null) {
  if (!slug) return null;

  for (const column of columns) {
    const entry = column.entries.find((candidate) => candidate.slug === slug);
    if (entry) {
      return { column, entry };
    }
  }

  return null;
}

function ActionPlate({
  label,
  onClick,
  sideSymbol,
  sideSymbolPosition,
}: {
  label: string;
  onClick: () => void;
  sideSymbol?: string;
  sideSymbolPosition?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.7rem',
        alignSelf: 'stretch',
        minWidth: '4.4rem',
        height: 'calc(100% + 2px)',
        marginBottom: '-2px',
        padding: '0 0.8rem',
        border: 'none',
        background: 'rgba(245, 242, 240, 0.96)',
        clipPath: sideSymbolPosition === 'left'
          ? 'polygon(0.8rem 0%, 100% 0%, 100% 100%, 0% 100%)'
          : 'polygon(0 0, 100% 0, calc(100% - 0.8rem) 100%, 0 100%)',
        cursor: 'pointer',
      }}
    >
      {sideSymbol && sideSymbolPosition === 'left' ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 10 10"
          style={{
            display: 'block',
            width: '0.58rem',
            height: '0.58rem',
            transform: 'translateY(0.01rem)',
          }}
        >
          <polygon points="8,1 2,5 8,9" fill="rgba(48, 48, 48, 0.72)" />
        </svg>
      ) : null}
      <span
        style={{
          color: COLORS.textPrimary,
          background: 'rgba(0, 0, 0, 0.88)',
          fontFamily: '"Cinzel", serif',
          fontSize: 'var(--font-fluid-2xs)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '1px solid rgba(0, 0, 0, 0.88)',
          padding: '0.22rem 0.35rem',
          borderRadius: '3px',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {label}
      </span>
      {sideSymbol && sideSymbolPosition === 'right' ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 10 10"
          style={{
            display: 'block',
            width: '0.58rem',
            height: '0.58rem',
            transform: 'translateY(0.01rem)',
          }}
        >
          <polygon points="2,1 8,5 2,9" fill="rgba(48, 48, 48, 0.72)" />
        </svg>
      ) : null}
    </button>
  );
}

function ViewedProgressOctagon({
  percent,
  fillColor,
}: {
  percent: number;
  fillColor: string;
}) {
  const center = 56;
  const radius = 46;
  const segmentCount = 8;
  const filledSegments = Math.max(0, Math.min(segmentCount, Math.round((percent / 100) * segmentCount)));
  const points = Array.from({ length: segmentCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / segmentCount;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });
  const octagonPath = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg
      viewBox="0 0 112 112"
      aria-hidden="true"
      style={{
        display: 'block',
        width: 'clamp(4.8rem, 9vw, 6.7rem)',
        height: 'clamp(4.8rem, 9vw, 6.7rem)',
        overflow: 'visible',
      }}
    >
      <polygon
        points={octagonPath}
        fill="rgba(255, 255, 255, 0.05)"
        stroke="rgba(240, 232, 236, 0.78)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {points.map((point, index) => {
        const nextPoint = points[(index + 1) % segmentCount];
        return (
          <polygon
            key={index}
            points={`${center},${center} ${point.x},${point.y} ${nextPoint.x},${nextPoint.y}`}
            fill={index < filledSegments ? fillColor : 'rgba(255, 255, 255, 0.04)'}
            stroke="rgba(240, 232, 236, 0.7)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

function BookSpine({
  index,
  label,
  left,
  top,
  height,
  fontFamily,
  fontWeight,
}: {
  index: number;
  label: string;
  left: number;
  top: number;
  height: number;
  fontFamily: string;
  fontWeight: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}%`,
        right: 0,
        top: `${top}%`,
        height: `${height}%`,
        background: 'linear-gradient(180deg, rgba(4, 7, 7, 0.94), rgba(0, 0, 0, 0.92))',
        boxShadow: 'inset 0 0 0 1px rgba(240, 232, 236, 0.32), 0 0.35rem 1rem rgba(0, 0, 0, 0.22)',
        borderRadius: '0.15rem 0 0 0.15rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            index % 2 === 0
              ? 'linear-gradient(90deg, rgba(255, 210, 90, 0.14), transparent 48%, rgba(255, 255, 255, 0.04))'
              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 46%, rgba(255, 210, 90, 0.18))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1rem 0 1.75rem',
          color: 'rgba(240, 232, 236, 0.7)',
          fontFamily,
          fontSize: 'clamp(0.9rem, 1.8vw, 1.7rem)',
          fontWeight,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'clip',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          top: '8%',
          bottom: '8%',
          left: '0.5rem',
          width: '2px',
          background: 'rgba(240, 232, 236, 0.38)',
        }}
      />
    </div>
  );
}

function PinnedMarker({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  return (
    <span
      aria-label="Pinned entry"
      title="Pinned"
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2.2rem',
        height: '2.2rem',
        color,
        opacity: active ? 1 : 0.86,
      }}
    >
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        style={{
          display: 'block',
          width: '1.25rem',
          height: '1.25rem',
          transform: 'rotate(45deg)',
          filter: active ? 'drop-shadow(0 0 8px rgba(255, 244, 196, 0.28))' : 'none',
        }}
      >
        <path
          d="M160 96C160 78.3 174.3 64 192 64L448 64C465.7 64 480 78.3 480 96C480 113.7 465.7 128 448 128L418.5 128L428.8 262.1C465.9 283.3 494.6 318.5 507 361.8L510.8 375.2C513.6 384.9 511.6 395.2 505.6 403.3C499.6 411.4 490 416 480 416L160 416C150 416 140.5 411.3 134.5 403.3C128.5 395.3 126.5 384.9 129.3 375.2L133 361.8C145.4 318.5 174 283.3 211.2 262.1L221.5 128L192 128C174.3 128 160 113.7 160 96zM288 464L352 464L352 576C352 593.7 337.7 608 320 608C302.3 608 288 593.7 288 576L288 464z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export default function MemorandumPage({
  memorandumData,
  isActive,
  animationsEnabled,
  initialEntryDelaySeconds,
  pageState,
  registerNavigation,
  requestPageExit,
  readEntryIds,
  onEntryRead,
  locationPath,
  onPathChange,
  playSoundEffect,
  onEntryAnimationComplete,
}: MemorandumPageProps) {
  const bobAnim = isActive && animationsEnabled ? 'portrait-bob 4s ease-in-out infinite' : 'none';
  const columns = memorandumData.columns;
  const initialState = getInitialMemorandumState(locationPath, memorandumData);
  const containerRef = useRef<HTMLElement>(null);
  const listViewportRef = useRef<HTMLDivElement>(null);
  const detailViewportRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const entryDelayRef = useRef<gsap.core.Tween | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const detailTlRef = useRef<gsap.core.Timeline | null>(null);
  const categoryTlRef = useRef<gsap.core.Timeline | null>(null);
  const delayedExitRef = useRef<gsap.core.Tween | null>(null);
  const onEntryReadRef = useRef(onEntryRead);
  const mountedRef = useRef(true);
  const pendingReadEntryIdRef = useRef<string | null>(null);
  const pendingExternalExitRef = useRef(false);
  const prevIsActive = useRef(isActive);
  const previousColumnIndexRef = useRef(initialState.columnIndex);
  const initialCategoryPaintRef = useRef(false);
  const pageEntryReadyRef = useRef(!animationsEnabled);
  const pendingDetailRouteRef = useRef<ReturnType<typeof parseMemorandumRoute> | null>(
    initialState.detailEntrySlug
      ? parseMemorandumRoute(locationPath, memorandumData)
      : null
  );
  const selectedColumnIndexRef = useRef(initialState.columnIndex);
  const selectedEntryIndicesRef = useRef(initialState.selectedEntryIndices);
  const detailEntryIdRef = useRef<string | null>(null);
  const detailPageIndexRef = useRef(0);
  const tabBgRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tabWhiteLabelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tabDarkLabelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(initialState.columnIndex);
  const [selectedEntryIndices, setSelectedEntryIndices] = useState(initialState.selectedEntryIndices);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [detailPageIndex, setDetailPageIndex] = useState(0);
  const [displayedDetail, setDisplayedDetail] = useState<{ entryId: string; pageIndex: number } | null>(null);
  const [detailEnterPending, setDetailEnterPending] = useState(false);
  const [detailContentEnterPending, setDetailContentEnterPending] = useState<MemorandumDetailPageTurnDirection | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTrapezoidReentryPending, setIsTrapezoidReentryPending] = useState(false);
  const [pageEntryReady, setPageEntryReady] = useState(!animationsEnabled);
  const [isDetailBodyScrollable, setIsDetailBodyScrollable] = useState(false);
  const memorandumItem = MENU_ITEMS.find((item) => item.id === 'memorandum');
  const accent = memorandumItem
    ? `hsl(${memorandumItem.accentH} ${memorandumItem.accentS} ${memorandumItem.accentL})`
    : 'hsl(120 50% 40%)';
  const accentSoft = memorandumItem
    ? `hsl(${memorandumItem.accentH} ${memorandumItem.accentS} ${memorandumItem.accentL} / 0.35)`
    : 'hsl(120 50% 40% / 0.35)';
  const accentTransparent = memorandumItem
    ? `hsl(${memorandumItem.accentH} ${memorandumItem.accentS} ${memorandumItem.accentL} / 0)`
    : 'hsl(120 50% 40% / 0)';
  const accentGlow = memorandumItem
    ? `hsl(${memorandumItem.accentH} ${memorandumItem.accentS} ${memorandumItem.accentL} / 0.33)`
    : 'hsl(120 50% 40% / 0.33)';
  const viewedPct = memorandumData.totalEntries > 0 ? Math.round((readEntryIds.length / memorandumData.totalEntries) * 100) : 100;
  const currentColumn = columns[selectedColumnIndex];
  const currentEntryIndex = selectedEntryIndices[selectedColumnIndex] ?? 0;
  const hasEntries = currentColumn.entries.length > 0;
  const detailEntry =
    currentColumn.entries.find((entry) => entry.slug === detailEntryId) ?? null;
  const displayedDetailMatch = findMemorandumEntryBySlug(columns, displayedDetail?.entryId ?? null);
  const displayedDetailEntry = displayedDetailMatch?.entry ?? null;
  const detailEntryIndex = detailEntry
    ? currentColumn.entries.findIndex((entry) => entry.id === detailEntry.id)
    : -1;
  const displayedDetailPage = displayedDetailEntry
    ? displayedDetailEntry.pages[displayedDetail?.pageIndex ?? 0] ?? displayedDetailEntry.pages[0]
    : null;
  const readSet = new Set(readEntryIds);
  const isDetailOpen = Boolean(detailEntryId);
  const hasDisplayedDetail = Boolean(displayedDetailEntry && displayedDetailPage);
  const isInputLocked = isTransitioning || !pageEntryReady;
  const trapezoidsActive =
    animationsEnabled && (isActive || pageState === 'entering-page' || pageState === 'exiting-page');
  const detailAnimationBleedLeft = 'clamp(3rem, 4vw, 4rem)';
  const detailAnimationBleedLeftNegative = `calc(${detailAnimationBleedLeft} * -1)`;
  const detailBodyStyle = {
    position: 'relative' as const,
    height: '100%',
    minHeight: 0,
    paddingLeft: '1.8rem',
    paddingRight: 'clamp(1rem, 1.8vw, 1.7rem)',
    fontSize: 'clamp(1.18rem, 2.05vw, 1.78rem)',
    lineHeight: 1.42,
    color: 'rgba(240, 232, 236, 0.95)',
    width: '100%',
    fontFamily: 'Cambria, "Times New Roman", serif',
  };

  const scrollDetailBody = (direction: 'up' | 'down') => {
    const viewport = detailViewportRef.current;
    if (!viewport) return false;

    const scrollRange = viewport.scrollHeight - viewport.clientHeight;
    if (scrollRange <= 1) return false;

    const step = Math.max(96, viewport.clientHeight * 0.72);
    const delta = direction === 'down' ? step : -step;
    viewport.scrollBy({
      top: delta,
      behavior: animationsEnabled ? 'smooth' : 'auto',
    });
    return true;
  };

  useEffect(() => {
    onEntryReadRef.current = onEntryRead;
  }, [onEntryRead]);

  useEffect(() => {
    selectedColumnIndexRef.current = selectedColumnIndex;
  }, [selectedColumnIndex]);

  useEffect(() => {
    selectedEntryIndicesRef.current = selectedEntryIndices;
  }, [selectedEntryIndices]);

  useEffect(() => {
    detailEntryIdRef.current = detailEntryId;
  }, [detailEntryId]);

  useEffect(() => {
    detailPageIndexRef.current = detailPageIndex;
  }, [detailPageIndex]);

  const clearDelayedExit = () => {
    delayedExitRef.current?.kill();
    delayedExitRef.current = null;
  };

  const resetMemorandumAnimatedState = () => {
    if (!containerRef.current) return;

    clearDelayedExit();
    entryTlRef.current?.kill();
    exitTlRef.current?.kill();
    detailTlRef.current?.kill();
    categoryTlRef.current?.kill();
    entryTlRef.current = null;
    exitTlRef.current = null;
    detailTlRef.current = null;
    categoryTlRef.current = null;

    const browserTargets = containerRef.current.querySelectorAll(
      [
        '[data-memorandum-watermark]',
        '[data-memorandum-watermark-line]',
        '[data-memorandum-prompt]',
        '[data-memorandum-tab-controls]',
        '[data-memorandum-list-shell]',
        '[data-memorandum-right-panel]',
        '[data-memorandum-shelf-motion]',
        '[data-memorandum-collection]',
        '[data-memorandum-book-spines]',
        '[data-memorandum-background-lines]',
        '[data-memorandum-trapezoids]',
      ].join(', ')
    );
    gsap.set(browserTargets, { clearProps: 'x,y,scale,opacity,willChange' });
    gsap.set(containerRef.current.querySelector('[data-memorandum-wipe-line]'), {
      clearProps: 'x,y,scaleX,scaleY,opacity,willChange',
      autoAlpha: 0,
    });
    gsap.set(
      containerRef.current.querySelectorAll(
        [
        '[data-memorandum-detail-shell]',
        '[data-memorandum-detail-panel]',
        '[data-memorandum-detail-left]',
        '[data-memorandum-detail-right]',
        '[data-memorandum-detail-body-motion]',
        '[data-memorandum-detail-image-motion]',
      ].join(', ')
      ),
      { clearProps: 'x,opacity,willChange' }
    );

    pageEntryReadyRef.current = true;
    setPageEntryReady(true);
    pendingExternalExitRef.current = false;
    pendingReadEntryIdRef.current = null;
    setDetailEnterPending(false);
    setDetailContentEnterPending(null);
    setIsTrapezoidReentryPending(false);
    setIsTransitioning(false);
  };

  const setEntryIndexForColumn = (columnIndex: number, nextIndex: number) => {
    const entryCount = columns[columnIndex].entries.length;
    const wrappedIndex = entryCount > 0 ? wrapIndex(nextIndex, entryCount) : 0;
    selectedEntryIndicesRef.current = selectedEntryIndicesRef.current.map((value, index) => {
      if (index !== columnIndex) return value;
      return wrappedIndex;
    });
    setSelectedEntryIndices((current) =>
      current.map((value, index) => {
        if (index !== columnIndex) return value;
        return wrappedIndex;
      })
    );
    return wrappedIndex;
  };

  const selectColumn = (nextColumnIndex: number, options?: { playSound?: boolean }) => {
    const wrappedColumnIndex = wrapIndex(nextColumnIndex, columns.length);
    const changed = selectedColumnIndexRef.current !== wrappedColumnIndex;
    setEntryIndexForColumn(wrappedColumnIndex, 0);
    selectedColumnIndexRef.current = wrappedColumnIndex;
    setSelectedColumnIndex(wrappedColumnIndex);
    rowRefs.current = [];
    if (changed && options?.playSound !== false) {
      playSoundEffect('toggle');
    }
    return changed;
  };

  const selectEntry = (nextIndex: number, options?: { playSound?: boolean }) => {
    const columnIndex = selectedColumnIndexRef.current;
    const column = columns[columnIndex];
    if (!column.entries.length) return false;
    const wrappedIndex = wrapIndex(nextIndex, column.entries.length);
    const changed = (selectedEntryIndicesRef.current[columnIndex] ?? 0) !== wrappedIndex;
    setEntryIndexForColumn(columnIndex, wrappedIndex);
    if (changed && options?.playSound !== false) {
      playSoundEffect('switch');
    }
    return changed;
  };

  const stepColumn = (delta: number) => {
    const nextColumnIndex = wrapIndex(selectedColumnIndexRef.current + delta, columns.length);
    return selectColumn(nextColumnIndex);
  };

  const stepEntry = (delta: number) => {
    const currentIndex = selectedEntryIndicesRef.current[selectedColumnIndexRef.current] ?? 0;
    return selectEntry(currentIndex + delta);
  };

  const flushPendingReadEntry = () => {
    const pendingEntryId = pendingReadEntryIdRef.current;
    if (!pendingEntryId) return;
    pendingReadEntryIdRef.current = null;
    onEntryReadRef.current(pendingEntryId);
  };

  const getVisibleEntryPageSize = () => {
    const viewport = listViewportRef.current;
    if (!viewport) return 1;

    const viewportRect = viewport.getBoundingClientRect();
    const visibleRows = rowRefs.current.reduce((count, row) => {
      if (!row) return count;
      const rect = row.getBoundingClientRect();
      if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) return count;
      return count + 1;
    }, 0);

    if (visibleRows > 0) return visibleRows;

    const firstRow = rowRefs.current.find((row): row is HTMLButtonElement => Boolean(row));
    if (!firstRow) return 1;

    const rowHeight = firstRow.getBoundingClientRect().height;
    if (rowHeight <= 0) return 1;

    return Math.max(1, Math.floor(viewport.clientHeight / rowHeight));
  };

  const jumpEntryPage = (direction: 'up' | 'down') => {
    const columnIndex = selectedColumnIndexRef.current;
    const entryCount = columns[columnIndex].entries.length;
    if (entryCount <= 1) return false;

    const currentIndex = selectedEntryIndicesRef.current[columnIndex] ?? 0;
    const lastIndex = entryCount - 1;
    const pageSize = getVisibleEntryPageSize();

    if (direction === 'up') {
      if (currentIndex === 0) {
        return selectEntry(lastIndex);
      }

      return selectEntry(Math.max(0, currentIndex - pageSize));
    }

    if (currentIndex === lastIndex) {
      return selectEntry(0);
    }

    return selectEntry(Math.min(lastIndex, currentIndex + pageSize));
  };

  const openEntry = (
    entry: MemorandumEntry,
    entryIndex: number,
    options?: { pageIndex?: number; playSound?: boolean; immediate?: boolean }
  ) => {
    if (!options?.immediate && animationsEnabled && !pageEntryReadyRef.current) return;

    const pageIndex = options?.pageIndex ?? 0;
    const shouldPlaySound = options?.playSound ?? true;
    const currentColumnIndex = selectedColumnIndexRef.current;
    const shouldMarkRead = !readSet.has(entry.id);

    setEntryIndexForColumn(currentColumnIndex, entryIndex);

    if (detailEntryIdRef.current === entry.slug) {
      setDetailPageIndex(pageIndex);
      detailPageIndexRef.current = pageIndex;
      setDisplayedDetail({ entryId: entry.slug, pageIndex });
      if (shouldMarkRead) {
        onEntryReadRef.current(entry.id);
      }
      if (shouldPlaySound) {
        playSoundEffect('toggle');
      }
      return;
    }

    const showDetailImmediately = () => {
      setDisplayedDetail({ entryId: entry.slug, pageIndex });
      setDetailEntryId(entry.slug);
      detailEntryIdRef.current = entry.slug;
      setDetailPageIndex(pageIndex);
      detailPageIndexRef.current = pageIndex;
    };

    if (
      options?.immediate ||
      !animationsEnabled ||
      !containerRef.current ||
      !pageEntryReadyRef.current
    ) {
      showDetailImmediately();
      if (shouldMarkRead) {
        onEntryReadRef.current(entry.id);
      }
      if (shouldPlaySound) {
        playSoundEffect('enter');
      }
      return;
    }

    setIsTransitioning(true);
    detailTlRef.current?.kill();
    exitTlRef.current?.kill();

    if (shouldPlaySound) {
      playSoundEffect('enter');
    }

    pendingReadEntryIdRef.current = shouldMarkRead ? entry.id : null;

    exitTlRef.current = createMemorandumExitTimeline(containerRef.current);
    appendTimelineCallback(exitTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      exitTlRef.current = null;
      showDetailImmediately();
      setDetailEnterPending(true);
    });
    appendTimelineCallback(exitTlRef.current, 'onInterrupt', () => {
      exitTlRef.current = null;
      pendingReadEntryIdRef.current = null;
      setIsTransitioning(false);
    });
  };

  const goToDetailSibling = (delta: number) => {
    if (!detailEntry) return false;
    const nextIndex = wrapIndex(detailEntryIndex + delta, currentColumn.entries.length);
    const nextEntry = currentColumn.entries[nextIndex];
    const direction: MemorandumDetailPageTurnDirection = delta > 0 ? 'forward' : 'backward';

    if (!animationsEnabled || !containerRef.current) {
      setDetailContentEnterPending(null);
      setEntryIndexForColumn(selectedColumnIndexRef.current, nextIndex);
      setDetailEntryId(nextEntry.slug);
      detailEntryIdRef.current = nextEntry.slug;
      setDetailPageIndex(0);
      detailPageIndexRef.current = 0;
      setDisplayedDetail({
        entryId: nextEntry.slug,
        pageIndex: 0,
      });
      if (!readSet.has(nextEntry.id)) {
        onEntryReadRef.current(nextEntry.id);
      }
      playSoundEffect('toggle');
      return true;
    }

    setIsTransitioning(true);
    detailTlRef.current?.kill();
    exitTlRef.current?.kill();
    detailTlRef.current = createMemorandumDetailContentExitTimeline(containerRef.current, direction);
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      detailTlRef.current = null;
      setEntryIndexForColumn(selectedColumnIndexRef.current, nextIndex);
      setDetailEntryId(nextEntry.slug);
      detailEntryIdRef.current = nextEntry.slug;
      setDetailPageIndex(0);
      detailPageIndexRef.current = 0;
      setDisplayedDetail({
        entryId: nextEntry.slug,
        pageIndex: 0,
      });
      setDetailContentEnterPending(direction);
      if (!readSet.has(nextEntry.id)) {
        onEntryReadRef.current(nextEntry.id);
      }
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setIsTransitioning(false);
    });
    playSoundEffect('toggle');
    return true;
  };

  const goToDetailPage = (delta: number) => {
    if (!detailEntry) return false;
    const nextPageIndex = detailPageIndex + delta;
    if (nextPageIndex < 0 || nextPageIndex >= detailEntry.pages.length) return false;

    if (!animationsEnabled || !containerRef.current) {
      setDetailContentEnterPending(null);
      setDetailPageIndex(nextPageIndex);
      detailPageIndexRef.current = nextPageIndex;
      setDisplayedDetail({
        entryId: detailEntry.slug,
        pageIndex: nextPageIndex,
      });
      playSoundEffect('toggle');
      return true;
    }

    const direction: MemorandumDetailPageTurnDirection = delta > 0 ? 'forward' : 'backward';
    setIsTransitioning(true);
    detailTlRef.current?.kill();
    exitTlRef.current?.kill();
    detailTlRef.current = createMemorandumDetailContentExitTimeline(containerRef.current, direction);
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      detailTlRef.current = null;
      setDetailPageIndex(nextPageIndex);
      detailPageIndexRef.current = nextPageIndex;
      setDisplayedDetail({
        entryId: detailEntry.slug,
        pageIndex: nextPageIndex,
      });
      setDetailContentEnterPending(direction);
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setIsTransitioning(false);
    });
    playSoundEffect('toggle');
    return true;
  };

  const flushPendingDetailRoute = () => {
    if (!pageEntryReadyRef.current) return false;

    const pendingRoute = pendingDetailRouteRef.current;
    if (!pendingRoute?.entrySlug) return false;

    pendingDetailRouteRef.current = null;
    const column = columns[pendingRoute.columnIndex];
    const entryIndex = column.entries.findIndex((entry) => entry.slug === pendingRoute.entrySlug);
    if (entryIndex < 0) return false;

    openEntry(column.entries[entryIndex], entryIndex, {
      pageIndex: (pendingRoute.pageNumber ?? 1) - 1,
      playSound: false,
    });
    return true;
  };

  const finishExternalPageExit = () => {
    clearDelayedExit();
    pendingExternalExitRef.current = false;
    setIsTransitioning(false);
    requestPageExit({ fromPopState: true, playSound: false });
  };

  const playBrowserExitBeforePageLeave = () => {
    clearDelayedExit();

    if (!animationsEnabled || !containerRef.current) {
      finishExternalPageExit();
      return;
    }

    exitTlRef.current?.kill();
    exitTlRef.current = createMemorandumExitTimeline(containerRef.current);
    appendTimelineCallback(exitTlRef.current, 'onComplete', () => {
      exitTlRef.current = null;
      finishExternalPageExit();
    });
    appendTimelineCallback(exitTlRef.current, 'onInterrupt', () => {
      exitTlRef.current = null;
      finishExternalPageExit();
    });
  };

  const beginExternalPageExit = () => {
    if (pendingExternalExitRef.current) return true;

    pendingExternalExitRef.current = true;
    pendingDetailRouteRef.current = null;
    pendingReadEntryIdRef.current = null;

    const applyClosedState = () => {
      setDetailEntryId(null);
      detailEntryIdRef.current = null;
      setDetailPageIndex(0);
      detailPageIndexRef.current = 0;
    };

    if (!animationsEnabled || !containerRef.current) {
      applyClosedState();
      setDisplayedDetail(null);
      finishExternalPageExit();
      return true;
    }

    clearDelayedExit();
    setIsTransitioning(true);
    detailTlRef.current?.kill();
    exitTlRef.current?.kill();

    if (!hasDisplayedDetail) {
      delayedExitRef.current = gsap.delayedCall(0.14, playBrowserExitBeforePageLeave);
      return true;
    }

    setIsTrapezoidReentryPending(true);
    applyClosedState();
    detailTlRef.current = createMemorandumDetailExitTimeline(containerRef.current);
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      detailTlRef.current = null;
      setDisplayedDetail(null);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!mountedRef.current || !containerRef.current) {
          setIsTrapezoidReentryPending(false);
          finishExternalPageExit();
          return;
        }

        exitTlRef.current?.kill();
        exitTlRef.current = createMemorandumBrowserReEntryTimeline(containerRef.current);
        appendTimelineCallback(exitTlRef.current, 'onComplete', () => {
          exitTlRef.current = null;
          setIsTrapezoidReentryPending(false);
          clearDelayedExit();
          delayedExitRef.current = gsap.delayedCall(0.18, playBrowserExitBeforePageLeave);
        });
        appendTimelineCallback(exitTlRef.current, 'onInterrupt', () => {
          exitTlRef.current = null;
          setIsTrapezoidReentryPending(false);
          playBrowserExitBeforePageLeave();
        });
      }));
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setIsTrapezoidReentryPending(false);
      playBrowserExitBeforePageLeave();
    });

    return true;
  };

  const closeDetail = (options?: { playSound?: boolean; immediate?: boolean }) => {
    if (!hasDisplayedDetail) return false;

    const shouldPlaySound = options?.playSound ?? true;

    const applyClosedState = () => {
      setDetailEntryId(null);
      detailEntryIdRef.current = null;
      setDetailPageIndex(0);
      detailPageIndexRef.current = 0;
    };

    const finishClose = () => {
      applyClosedState();
      setDisplayedDetail(null);
    };

    if (options?.immediate || !animationsEnabled || !containerRef.current) {
      finishClose();
      if (shouldPlaySound) {
        playSoundEffect('exit');
      }
      return true;
    }

    setIsTransitioning(true);
    detailTlRef.current?.kill();
    exitTlRef.current?.kill();

    if (shouldPlaySound) {
      playSoundEffect('exit');
    }

    setIsTrapezoidReentryPending(true);
    applyClosedState();
    detailTlRef.current = createMemorandumDetailExitTimeline(containerRef.current);
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      detailTlRef.current = null;
      setDisplayedDetail(null);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!mountedRef.current || !containerRef.current) {
          setIsTrapezoidReentryPending(false);
          setIsTransitioning(false);
          return;
        }

        exitTlRef.current?.kill();
        exitTlRef.current = createMemorandumBrowserReEntryTimeline(containerRef.current);
        appendTimelineCallback(exitTlRef.current, 'onComplete', () => {
          exitTlRef.current = null;
          setIsTrapezoidReentryPending(false);
          if (!flushPendingDetailRoute()) {
            setIsTransitioning(false);
          }
        });
        appendTimelineCallback(exitTlRef.current, 'onInterrupt', () => {
          exitTlRef.current = null;
          setIsTrapezoidReentryPending(false);
          setIsTransitioning(false);
        });
      }));
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setIsTrapezoidReentryPending(false);
      setIsTransitioning(false);
    });

    return true;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    pageEntryReadyRef.current = !animationsEnabled;
    setPageEntryReady(!animationsEnabled);

    if (!animationsEnabled) {
      setIsTransitioning(false);
      flushPendingReadEntry();
      flushPendingDetailRoute();
      return;
    }

    setIsTransitioning(Boolean(pendingDetailRouteRef.current?.entrySlug));
    const shouldDelayDirectMountPlayback = pageState === 'page-active';
    let rafId: number | null = null;
    let nestedRafId: number | null = null;
    entryTlRef.current = createMemorandumEntryTimeline(containerRef.current, {
      paused: initialEntryDelaySeconds > 0 || shouldDelayDirectMountPlayback,
    });
    if (onEntryAnimationComplete) {
      appendTimelineCallback(entryTlRef.current, 'onComplete', onEntryAnimationComplete);
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
    appendTimelineCallback(entryTlRef.current, 'onComplete', () => {
      if (!mountedRef.current) return;
      entryTlRef.current = null;
      pageEntryReadyRef.current = true;
      setPageEntryReady(true);
      flushPendingReadEntry();
      setIsTransitioning(false);
      flushPendingDetailRoute();
    });
    appendTimelineCallback(entryTlRef.current, 'onInterrupt', () => {
      if (!mountedRef.current) return;
      entryTlRef.current = null;
      pageEntryReadyRef.current = true;
      setPageEntryReady(true);
      flushPendingReadEntry();
      setIsTransitioning(false);
      flushPendingDetailRoute();
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (nestedRafId !== null) cancelAnimationFrame(nestedRafId);
      mountedRef.current = false;
      entryDelayRef.current?.kill();
      entryDelayRef.current = null;
      entryTlRef.current?.kill();
      entryTlRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!detailEnterPending || !hasDisplayedDetail || !containerRef.current) return;

    if (!animationsEnabled) {
      setDetailEnterPending(false);
      flushPendingReadEntry();
      setIsTransitioning(false);
      return;
    }

    detailTlRef.current?.kill();
    detailTlRef.current = createMemorandumDetailEnterTimeline(containerRef.current);
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      detailTlRef.current = null;
      setDetailEnterPending(false);
      flushPendingReadEntry();
      setIsTransitioning(false);
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setDetailEnterPending(false);
      flushPendingReadEntry();
      setIsTransitioning(false);
    });
  }, [animationsEnabled, detailEnterPending, hasDisplayedDetail]);

  useLayoutEffect(() => {
    if (!detailContentEnterPending || !hasDisplayedDetail || !containerRef.current) {
      return;
    }

    if (!animationsEnabled) {
      setDetailContentEnterPending(null);
      setIsTransitioning(false);
      return;
    }

    detailTlRef.current?.kill();
    detailTlRef.current = createMemorandumDetailContentEnterTimeline(
      containerRef.current,
      detailContentEnterPending,
    );
    appendTimelineCallback(detailTlRef.current, 'onComplete', () => {
      detailTlRef.current = null;
      setDetailContentEnterPending(null);
      setIsTransitioning(false);
    });
    appendTimelineCallback(detailTlRef.current, 'onInterrupt', () => {
      detailTlRef.current = null;
      setDetailContentEnterPending(null);
      setIsTransitioning(false);
    });
  }, [animationsEnabled, detailContentEnterPending, hasDisplayedDetail]);

  useEffect(() => {
    if (animationsEnabled) return;
    resetMemorandumAnimatedState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationsEnabled]);

  useLayoutEffect(() => {
    tabBgRefs.current.forEach((background, index) => {
      const whiteLabel = tabWhiteLabelRefs.current[index];
      const darkLabel = tabDarkLabelRefs.current[index];
      const active = index === selectedColumnIndex;

      if (!background || !whiteLabel || !darkLabel) return;

      if (active) {
        gsap.set(background, { opacity: 1, scaleY: 1, transformOrigin: '50% 100%' });
        gsap.set(whiteLabel, { opacity: 0 });
        gsap.set(darkLabel, { opacity: 1 });
        return;
      }

      gsap.set(background, { opacity: 0, scaleY: 0.58, transformOrigin: '50% 100%' });
      gsap.set(whiteLabel, { opacity: 1 });
      gsap.set(darkLabel, { opacity: 0 });
    });

    if (!initialCategoryPaintRef.current) {
      initialCategoryPaintRef.current = true;
      previousColumnIndexRef.current = selectedColumnIndex;
      return;
    }

    const previousColumnIndex = previousColumnIndexRef.current;
    previousColumnIndexRef.current = selectedColumnIndex;
    if (
      previousColumnIndex === selectedColumnIndex ||
      !animationsEnabled ||
      isTransitioning
    ) {
      return;
    }

    const background = tabBgRefs.current[selectedColumnIndex];
    const whiteLabel = tabWhiteLabelRefs.current[selectedColumnIndex];
    const darkLabel = tabDarkLabelRefs.current[selectedColumnIndex];
    if (!background || !whiteLabel || !darkLabel) return;

    categoryTlRef.current?.kill();
    categoryTlRef.current = createMemorandumCategoryTimeline(background, whiteLabel, darkLabel);
  }, [animationsEnabled, isTransitioning, selectedColumnIndex]);

  useLayoutEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (!wasActive || isActive || !containerRef.current || !animationsEnabled) return;

    detailTlRef.current?.kill();
    exitTlRef.current?.kill();

    const pageExitTimeline = gsap.timeline({
      onComplete: () => {
        exitTlRef.current = null;
      },
      onInterrupt: () => {
        exitTlRef.current = null;
      },
    });

    if (hasDisplayedDetail) {
      pageExitTimeline
        .add(createMemorandumDetailExitTimeline(containerRef.current), 0)
        .add(createMemorandumBrowserReEntryTimeline(containerRef.current), 0.08)
        .add(createMemorandumExitTimeline(containerRef.current), 0.32);
    } else {
      pageExitTimeline.add(createMemorandumExitTimeline(containerRef.current), 0);
    }

    exitTlRef.current = pageExitTimeline;
  }, [animationsEnabled, hasDisplayedDetail, isActive]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearDelayedExit();
      pendingReadEntryIdRef.current = null;
      pendingExternalExitRef.current = false;
      entryTlRef.current?.kill();
      exitTlRef.current?.kill();
      detailTlRef.current?.kill();
      categoryTlRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (detailEntryId || !hasEntries || isTransitioning) return;
    const row = rowRefs.current[currentEntryIndex];
    row?.scrollIntoView({ block: 'nearest', behavior: animationsEnabled ? 'smooth' : 'auto' });
  }, [animationsEnabled, currentEntryIndex, detailEntryId, hasEntries, isTransitioning, selectedColumnIndex]);

  useLayoutEffect(() => {
    const viewport = detailViewportRef.current;
    if (!viewport || !hasDisplayedDetail) {
      setIsDetailBodyScrollable(false);
      return;
    }

    const updateScrollability = rafThrottle(() => {
      setIsDetailBodyScrollable(viewport.scrollHeight - viewport.clientHeight > 1);
    });

    viewport.scrollTop = 0;
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
  }, [
    displayedDetail?.entryId,
    displayedDetail?.pageIndex,
    hasDisplayedDetail,
  ]);

  useLayoutEffect(() => {
    const parsed = parseMemorandumRoute(locationPath, memorandumData);
    if (!parsed) {
      const targetPageId = resolveAppRoute(locationPath, memorandumData).pageId ?? null;

      pendingDetailRouteRef.current = null;
      if (targetPageId !== 'memorandum' && isActive) {
        beginExternalPageExit();
        return;
      }

      if (detailEntryIdRef.current) {
        closeDetail({ playSound: false });
      }
      return;
    }

    selectedColumnIndexRef.current = parsed.columnIndex;
    setSelectedColumnIndex(parsed.columnIndex);

    const column = columns[parsed.columnIndex];
    const entryIndex = parsed.entrySlug
      ? column.entries.findIndex((entry) => entry.slug === parsed.entrySlug)
      : -1;

    if (entryIndex >= 0) {
      setEntryIndexForColumn(parsed.columnIndex, entryIndex);
      const entry = column.entries[entryIndex];

      if (detailEntryIdRef.current === entry.slug) {
        const nextPageIndex = (parsed.pageNumber ?? 1) - 1;
        setDetailPageIndex(nextPageIndex);
        detailPageIndexRef.current = nextPageIndex;
        setDisplayedDetail({
          entryId: entry.slug,
          pageIndex: nextPageIndex,
        });
        if (!readSet.has(entry.id)) {
          onEntryReadRef.current(entry.id);
        }
        pendingDetailRouteRef.current = null;
        return;
      }

      if (!pageEntryReadyRef.current && animationsEnabled) {
        pendingDetailRouteRef.current = parsed;
        return;
      }

      if (detailEntryIdRef.current && animationsEnabled) {
        pendingDetailRouteRef.current = parsed;
        closeDetail({ playSound: false });
        return;
      }

      pendingDetailRouteRef.current = null;
      openEntry(entry, entryIndex, {
        pageIndex: (parsed.pageNumber ?? 1) - 1,
        playSound: false,
      });
      return;
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, isActive, locationPath, memorandumData]);

  useEffect(() => {
    if (!isActive || isTransitioning || pendingExternalExitRef.current) return;

    const parsed = parseMemorandumRoute(locationPath, memorandumData);
    if (!parsed) return;

    const nextPath = detailEntry
      ? buildMemorandumPath(currentColumn.id, detailEntry.slug, detailPageIndex + 1)
      : (!parsed.hasExplicitCategory && currentColumn.id === memorandumData.defaultColumnId
          ? buildMemorandumPath()
          : buildMemorandumPath(currentColumn.id));

    if (nextPath !== locationPath) {
      onPathChange(nextPath);
    }
  }, [
    currentColumn.id,
    detailEntry,
    detailPageIndex,
    isActive,
    isTransitioning,
    locationPath,
    memorandumData,
    onPathChange,
  ]);

  useLayoutEffect(() => {
    if (!isActive) {
      registerNavigation(null);
      return;
    }

    registerNavigation({
      captureWheel: !detailEntryId && !isInputLocked,
      inputLocked: isInputLocked,
      hintVariant: detailEntryId ? 'memorandum-detail' : undefined,
      showScrollHint: detailEntryId ? isDetailBodyScrollable : false,
      onDirection: (direction, context) => {
        if (isInputLocked) return false;
        const isRepeat = context?.isRepeat ?? false;
        const currentColumnIndex = selectedColumnIndexRef.current;
        const currentIndex = selectedEntryIndicesRef.current[currentColumnIndex] ?? 0;
        const entryCount = columns[currentColumnIndex].entries.length;

        if (detailEntryId) {
          if (direction === 'up' || direction === 'down') {
            return scrollDetailBody(direction);
          }
          if (direction === 'left') {
            return goToDetailPage(-1);
          }
          if (direction === 'right') {
            return goToDetailPage(1);
          }
          return false;
        }

        if (direction === 'up') {
          if (isRepeat && currentIndex === 0) return false;
          return stepEntry(-1);
        }

        if (direction === 'down') {
          if (isRepeat && currentIndex === entryCount - 1) return false;
          return stepEntry(1);
        }

        if (direction === 'left') {
          return jumpEntryPage('up');
        }

        if (direction === 'right') {
          return jumpEntryPage('down');
        }

        return false;
      },
      onWheelDirection: (direction) => {
        if (isInputLocked) return false;
        if (detailEntryId) return false;
        const currentColumnIndex = selectedColumnIndexRef.current;
        const currentIndex = selectedEntryIndicesRef.current[currentColumnIndex] ?? 0;
        const entryCount = columns[currentColumnIndex].entries.length;
        if (!entryCount) return false;
        if (direction === 'up') {
          return selectEntry(Math.max(0, currentIndex - 1));
        }

        return selectEntry(Math.min(entryCount - 1, currentIndex + 1));
      },
      onConfirm: () => {
        if (detailEntryId || isInputLocked) return false;
        const currentColumnIndex = selectedColumnIndexRef.current;
        const currentIndex = selectedEntryIndicesRef.current[currentColumnIndex] ?? 0;
        const entry = columns[currentColumnIndex].entries[currentIndex];
        if (!entry) return false;
        openEntry(entry, currentIndex);
        return true;
      },
      onBack: () => {
        if (!detailEntryId || isInputLocked) return false;
        return closeDetail();
      },
      onActionKey: (key) => {
        if (isInputLocked) return false;
        if (key === '1') {
          if (detailEntryId) return goToDetailSibling(-1);
          return stepColumn(-1);
        }

        if (key === '3') {
          if (detailEntryId) return goToDetailSibling(1);
          return stepColumn(1);
        }

        return false;
      },
    });

    return () => registerNavigation(null);
  }, [
    animationsEnabled,
    currentColumn.entries.length,
    currentEntryIndex,
    detailEntryId,
    detailPageIndex,
    isDetailBodyScrollable,
    isTransitioning,
    pageEntryReady,
    isActive,
    onEntryRead,
    playSoundEffect,
    readEntryIds,
    registerNavigation,
    selectedColumnIndex,
  ]);

  return (
    <section
      ref={containerRef}
      aria-hidden={!isActive}
      data-memorandum-page
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes memorandum-new-pulse {
            0%, 28%, 100% { opacity: 1; }
            14% { opacity: 0.45; }
          }
        `}
      </style>
      <div
        data-memorandum-browser-shell
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: isDetailOpen || isInputLocked ? 'none' : 'auto',
        }}
      >
        <PageBackground />
        <div
          data-memorandum-background-lines
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <div
            data-memorandum-watermark-line
            style={{
              position: 'absolute',
              top: 'calc(clamp(7rem, 16vw, 17rem) * 0.6)',
              left: 0,
              width: '100%',
              height: '3px',
              background:
                'linear-gradient(to right, rgba(240, 232, 236, 0.42) 0%, rgba(240, 232, 236, 0.42) 74%, rgba(240, 232, 236, 0) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '4.6vw',
              bottom: 0,
              width: '10px',
              height: '70%',
              background:
                'linear-gradient(to top, rgba(240, 232, 236, 0.54) 0%, rgba(240, 232, 236, 0.32) 62%, rgba(240, 232, 236, 0) 100%)',
            }}
          />
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0.45,
            }}
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <line
              x1="0"
              y1="90"
              x2="70"
              y2="0"
              stroke="rgba(240, 232, 236, 0.18)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="55"
              y1="100"
              x2="100"
              y2="0"
              stroke="rgba(240, 232, 236, 0.18)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 85 0 A 72 72 0 0 0 100 70"
              fill="none"
              stroke="rgba(240, 232, 236, 0.16)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div
          data-memorandum-wipe-line
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 'calc(clamp(7rem, 16vw, 17rem) * 0.6)',
            left: 0,
            width: '100%',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.98)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0,
          }}
        />

        <div
          data-page-title
          data-memorandum-watermark
          style={{
            position: 'absolute',
            top: '-2vh',
            left: '-0.25vw',
            fontSize: 'clamp(6.5rem, 14.5vw, 15.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.08em',
            textTransform: 'uppercase',
            color: COLORS.textPrimary,
            opacity: 0.78,
            lineHeight: 0.88,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Memorandum
        </div>

        <div
          data-memorandum-prompt
          style={{
            position: 'absolute',
            top: 'calc(clamp(7rem, 16vw, 17rem) * 0.29)',
            left: 0,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            minHeight: '2.4rem',
            padding: '0 4.5rem 0 0',
            background:
              'linear-gradient(90deg, rgba(245, 242, 240, 0.96) 0%, rgba(245, 242, 240, 0.96) 68%, rgba(245, 242, 240, 0) 100%)',
          }}
        >
          <div
            style={{
              padding: '0.38rem 1.2rem 0.38rem 2.7rem',
              fontSize: 'var(--font-fluid-sm)',
              color: 'rgba(20, 20, 20, 0.82)',
              fontFamily: 'Cambria, "Times New Roman", serif',
            }}
          >
            Which entry?
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            height: '100%',
            padding: '11vh 4vw 7vh 7vw',
            gap: '4vw',
          }}
        >
        <div
          style={{
            width: 'min(52vw, 46rem)',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            paddingTop: '3rem',
          }}
        >
          <div
            data-memorandum-tab-controls
            style={{
              position: 'relative',
              width: '96%',
              margin: 0,
              minHeight: '2.9rem',
              padding: 0,
              overflow: 'visible',
            }}
          >
            <div
              data-memorandum-tab-band
              style={{
                position: 'absolute',
                inset: 0,
                borderBottom: '2px solid rgba(240, 232, 236, 0.28)',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(3, 6, 6, 0.42) 0%, rgba(3, 6, 6, 0.82) 68%, rgba(3, 6, 6, 0.96) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div
              data-memorandum-tabs
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                alignItems: 'center',
                gap: '0.2rem',
                zIndex: 1,
                minHeight: '100%',
              }}
            >
              {columns.map((column, index) => {
                const active = index === selectedColumnIndex;
                const hasUnreadEntries = column.entries.some((entry) => !readSet.has(entry.id));
                return (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => {
                      if (isTransitioning) return;
                      selectColumn(index);
                    }}
                    style={{
                      position: 'relative',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: 'calc(100% + 2px)',
                      marginBottom: '-2px',
                      minWidth: 0,
                      padding: '0 1.05rem',
                      background: 'transparent',
                      color: COLORS.textPrimary,
                      fontFamily: '"Cinzel", serif',
                      fontSize: 'var(--font-fluid-md)',
                      fontWeight: active ? 900 : 600,
                      letterSpacing: '-0.03em',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      ref={(node) => {
                        tabBgRefs.current[index] = node;
                      }}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(245, 242, 240, 0.96)',
                        opacity: active ? 1 : 0,
                        transformOrigin: '50% 100%',
                      }}
                    />
                    <span
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 0,
                      }}
                    >
                      <span
                        ref={(node) => {
                          tabWhiteLabelRefs.current[index] = node;
                        }}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          color: COLORS.textPrimary,
                          opacity: active ? 0 : 1,
                        }}
                      >
                        {column.label}
                      </span>
                      <span
                        ref={(node) => {
                          tabDarkLabelRefs.current[index] = node;
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 2,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(0, 0, 0, 0.88)',
                          opacity: active ? 1 : 0,
                        }}
                      >
                        {column.label}
                      </span>
                    </span>
                    {hasUnreadEntries ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '0.42rem',
                          right: '0.7rem',
                          width: '0.42rem',
                          height: '0.42rem',
                          borderRadius: '999px',
                          background: 'rgba(214, 52, 73, 0.98)',
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'stretch',
                zIndex: 2,
                transform: 'translateX(calc(-100% + 1px))',
              }}
            >
              <ActionPlate
                label="1"
                sideSymbol="<"
                sideSymbolPosition="left"
                onClick={() => {
                  if (isInputLocked) return;
                  stepColumn(-1);
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'stretch',
                zIndex: 2,
                transform: 'translateX(calc(100% - 1px))',
              }}
            >
              <ActionPlate
                label="3"
                sideSymbol=">"
                sideSymbolPosition="right"
                onClick={() => {
                  if (isInputLocked) return;
                  stepColumn(1);
                }}
              />
            </div>
          </div>

          <div
            data-memorandum-list-shell
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              marginTop: 0,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '-3px',
                background: 'rgba(255, 255, 255, 0.5)',
                clipPath: LIST_PANEL_CLIP_PATH,
                pointerEvents: 'none',
              }}
            />
            <ScrollViewport
              ref={listViewportRef}
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                clipPath: LIST_PANEL_CLIP_PATH,
              }}
              viewportStyle={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
                background: 'linear-gradient(180deg, rgba(14, 57, 56, 0.86), rgba(10, 27, 30, 0.92))',
                boxShadow: 'inset 0 0 0 1px rgba(38, 162, 120, 0.16), 0 2rem 5rem rgba(0, 0, 0, 0.45)',
                padding: '1.15rem 0 2.4rem',
                boxSizing: 'border-box',
              }}
              thumbColor="rgba(188, 255, 206, 0.72)"
              thumbHoverColor="rgba(118, 255, 156, 0.98)"
            >
              {hasEntries ? currentColumn.entries.map((entry, index) => {
                const selected = index === currentEntryIndex;
                const unread = !readSet.has(entry.id);
                const pinned = entry.pinned;
                const contentLeft = unread ? '5rem' : '2rem';
                const splashLeft = unread ? '3.1rem' : '0.8rem';
                const dividerLeft = unread ? '3.25rem' : '0.95rem';
                const metadataColor = selected ? 'rgba(12, 18, 16, 0.8)' : 'rgba(190, 228, 214, 0.74)';
                const dateColor = selected ? 'rgba(12, 18, 16, 0.66)' : 'rgba(216, 234, 226, 0.58)';
                const pinColor = selected ? 'rgba(18, 18, 14, 0.78)' : 'rgba(255, 231, 166, 0.88)';

                return (
                  <button
                    key={entry.id}
                    type="button"
                    ref={(node) => {
                      rowRefs.current[index] = node;
                    }}
                    onMouseEnter={() => {
                      if (isInputLocked) return;
                      selectEntry(index);
                    }}
                    onFocus={() => {
                      if (isInputLocked) return;
                      selectEntry(index);
                    }}
                    onClick={() => {
                      if (isInputLocked) return;
                      openEntry(entry, index);
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      minHeight: '5.8rem',
                      padding: `0.7rem 1.25rem 0.7rem ${contentLeft}`,
                      margin: '0 0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: COLORS.textPrimary,
                      textAlign: 'left',
                      cursor: 'pointer',
                      overflow: 'visible',
                    }}
                  >
                    {selected ? (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          left: splashLeft,
                          right: '-0.4rem',
                          background: `linear-gradient(90deg, ${accent} 0%, ${accent} 74%, ${accentSoft} 92%, ${accentTransparent} 100%)`,
                          boxShadow: `0 0 28px ${accentGlow}`,
                          clipPath: 'polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%)',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null}
                    <div
                      aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: dividerLeft,
                          top: '0.25rem',
                          bottom: '0.25rem',
                          width: '2px',
                        background: selected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(240, 232, 236, 0.16)',
                        pointerEvents: 'none',
                      }}
                    />
                    {unread ? (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: '0.1rem',
                          top: '50%',
                          transform: 'translateY(-50%) skewX(-18deg)',
                          background: 'linear-gradient(90deg, rgba(245, 242, 240, 0) 0%, rgba(245, 242, 240, 0.96) 22%, rgba(245, 242, 240, 0.96) 100%)',
                          color: 'rgba(217, 49, 70, 0.96)',
                          fontFamily: '"Cinzel", serif',
                          fontSize: 'var(--font-fluid-xs)',
                          fontWeight: 900,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          padding: '0.25rem 0.75rem 0.25rem 1rem',
                        }}
                      >
                        <span
                          key={`new-${currentColumn.id}-${entry.id}`}
                          style={{ animation: 'memorandum-new-pulse 1.8s ease-in-out infinite' }}
                        >
                          New
                        </span>
                      </div>
                    ) : null}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.28rem',
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: selected ? 'var(--font-fluid-xl)' : 'var(--font-fluid-lg)',
                          fontWeight: selected ? 700 : 600,
                          lineHeight: 1,
                          letterSpacing: '-0.05em',
                          color: selected ? 'rgba(255, 255, 255, 0.98)' : COLORS.textPrimary,
                          fontFamily: 'Cambria, "Times New Roman", serif',
                        }}
                      >
                        {entry.title}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          fontSize: 'var(--font-fluid-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.16em',
                          color: metadataColor,
                        }}
                      >
                        <span>{entry.subtitle}</span>
                        <span
                          style={{
                            color: dateColor,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatMemorandumDate(entry.date)}
                        </span>
                      </div>
                    </div>
                    {pinned ? (
                      <PinnedMarker color={pinColor} active={selected} />
                    ) : null}
                    <div
                      style={{
                        position: 'absolute',
                        left: contentLeft,
                        right: '1rem',
                        bottom: 0,
                        height: '1px',
                        background: 'rgba(240, 232, 236, 0.12)',
                      }}
                    />
                  </button>
                );
              }) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '100%',
                    padding: '2.5rem 2rem',
                    color: COLORS.textPrimary,
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Cinzel", serif',
                      fontSize: 'clamp(2rem, 4vw, 3rem)',
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      lineHeight: 0.95,
                      marginBottom: '0.8rem',
                    }}
                  >
                    {currentColumn.label}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-fluid-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: 'rgba(190, 228, 214, 0.72)',
                      marginBottom: '1rem',
                    }}
                  >
                    No entries yet
                  </div>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: '30rem',
                      fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
                      lineHeight: 1.45,
                      color: 'rgba(240, 232, 236, 0.78)',
                      fontFamily: 'Cambria, "Times New Roman", serif',
                    }}
                  >
                    No {currentColumn.label} entries have been filed yet. This shelf is
                    eagerly awaiting its first memorandum!
                  </p>
                </div>
              )}
            </ScrollViewport>
          </div>
        </div>

        <div
          data-memorandum-right-panel
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div
            data-memorandum-shelf-motion
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            <div
              data-memorandum-collection
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.5rem',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.42rem',
                padding: '0.65rem 1.3rem 0.65rem 1.2rem',
                background: 'linear-gradient(180deg, rgba(165, 123, 55, 0.96), rgba(110, 74, 18, 0.96))',
                boxShadow: 'inset 0 0 0 1px rgba(255, 239, 190, 0.42)',
              }}
            >
              <ViewedProgressOctagon percent={viewedPct} fillColor={accent} />
              <div
                style={{
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--font-fluid-sm)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  Viewed
                </div>
                <div
                  style={{
                    fontSize: 'clamp(3rem, 6vw, 4.7rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.08em',
                    lineHeight: 0.9,
                  }}
                >
                  {viewedPct}
                  <span style={{ fontSize: '0.4em', opacity: 0.8 }}>%</span>
                </div>
              </div>
            </div>

            <div
              data-memorandum-book-spines
              style={{
                position: 'absolute',
                inset: '12rem 0.5rem 0.75rem 8%',
                zIndex: 1,
                animation: bobAnim,
              }}
            >
              {MEMORANDUM_BOOK_SPINE_LAYOUT.map((spine) => (
                <BookSpine
                  key={spine.label}
                  index={spine.index}
                  label={spine.label}
                  left={spine.left}
                  top={spine.top}
                  height={spine.height}
                  fontFamily={spine.fontFamily}
                  fontWeight={spine.fontWeight}
                />
              ))}
            </div>

            <div
              style={{
                position: 'absolute',
                left: '16%',
                bottom: '7%',
                fontSize: 'clamp(5rem, 14vw, 10rem)',
                fontWeight: 900,
                letterSpacing: '-0.12em',
                color: 'rgba(240, 232, 236, 0.08)',
                pointerEvents: 'none',
              }}
            >
              {String(selectedColumnIndex + 1).padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      <div
        data-memorandum-trapezoids
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: '50%',
          zIndex: 2,
          opacity: isDetailOpen || isTrapezoidReentryPending ? 0 : 1,
          pointerEvents: 'none',
        }}
      >
        <MemorandumTrapezoids
          isActive={trapezoidsActive}
          animationsEnabled={animationsEnabled}
        />
      </div>
      </div>

      <div
        data-memorandum-detail-shell
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 8,
          opacity: hasDisplayedDetail ? 1 : 0,
          pointerEvents: isDetailOpen && !isInputLocked ? 'auto' : 'none',
        }}
      >
        {hasDisplayedDetail ? (
          <>
            <PageBackground />
            <div
              data-memorandum-detail-panel
              style={{
                position: 'absolute',
                inset: '6vh 4.5vw 6.5vh 5vw',
                boxShadow: '0 2rem 5rem rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
              }}
            >
              <div
                data-memorandum-detail-divider
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 'calc(50% - 1px)',
                  width: '2px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  zIndex: 5,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                }}
              >
                <div
                  data-memorandum-detail-left
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '50%',
                    minWidth: 0,
                    background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
                    overflow: 'hidden',
                    zIndex: 2,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderTop: '2px solid rgba(255, 255, 255, 0.5)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.5)',
                      borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
                      boxSizing: 'border-box',
                      pointerEvents: 'none',
                      zIndex: 4,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: '2.75rem 1.5rem 2.4rem 2.75rem',
                      display: 'grid',
                      gridTemplateRows: 'auto auto 1fr',
                      rowGap: '1.5rem',
                      minHeight: 0,
                    }}
                  >
                    <div style={{ position: 'relative', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--font-fluid-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.18em',
                          color: COLORS.textPrimaryFade,
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{displayedDetailMatch?.column.label ?? currentColumn.label}</span>
                        {displayedDetailEntry?.date ? (
                          <span style={{ color: 'rgba(203, 221, 214, 0.72)' }}>
                            {formatMemorandumDate(displayedDetailEntry.date)}
                          </span>
                        ) : null}
                        {displayedDetailEntry?.pinned ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: 'rgba(255, 231, 166, 0.9)',
                            }}
                          >
                            <PinnedMarker color="rgba(255, 231, 166, 0.9)" active />
                            <span>Pinned</span>
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-fluid-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.18em',
                          color: 'rgba(190, 228, 214, 0.8)',
                          marginBottom: '0.9rem',
                        }}
                      >
                        {displayedDetailEntry?.subtitle}
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
                          fontWeight: 700,
                          letterSpacing: '-0.08em',
                          lineHeight: 0.92,
                          fontFamily: 'Cambria, "Times New Roman", serif',
                        }}
                      >
                        {displayedDetailEntry?.title}
                      </h2>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '2px',
                        background: 'rgba(240, 232, 236, 0.4)',
                      }}
                    />

                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: 0,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: detailAnimationBleedLeftNegative,
                        }}
                      >
                        <ScrollViewport
                          ref={detailViewportRef}
                          style={detailBodyStyle}
                          viewportStyle={{
                            height: '100%',
                            minHeight: 0,
                            boxSizing: 'border-box',
                            paddingLeft: detailAnimationBleedLeft,
                          }}
                          thumbColor="rgba(214, 236, 226, 0.72)"
                          thumbHoverColor="rgba(176, 234, 206, 0.98)"
                        >
                          <div
                            data-memorandum-detail-body-motion
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.15rem',
                            }}
                          >
                            {displayedDetailPage?.body.map((paragraph, index) => (
                              <p key={`${paragraph}-${index}`} style={{ margin: 0 }}>
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </ScrollViewport>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  data-memorandum-detail-right
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: '50%',
                    minWidth: 0,
                    background: 'linear-gradient(140deg, rgba(25, 9, 13, 0.92), rgba(7, 4, 7, 0.86))',
                    overflow: 'hidden',
                    zIndex: 2,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderTop: '2px solid rgba(255, 255, 255, 0.5)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.5)',
                      borderRight: '2px solid rgba(255, 255, 255, 0.5)',
                      boxSizing: 'border-box',
                      pointerEvents: 'none',
                      zIndex: 4,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: '2.75rem 2.75rem 2.4rem 1.5rem',
                      display: 'grid',
                      gridTemplateRows: 'auto auto 1fr',
                      rowGap: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          paddingRight: '0.15rem',
                          fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                          fontWeight: 900,
                          letterSpacing: '-0.06em',
                          color: 'rgba(240, 232, 236, 0.58)',
                          lineHeight: 0.85,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {(displayedDetail?.pageIndex ?? 0) + 1}
                        <span
                          style={{
                            fontSize: '0.58em',
                          }}
                        >
                          {' / '}
                          {displayedDetailEntry?.pages.length ?? 1}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '2px',
                        background: 'rgba(240, 232, 236, 0.4)',
                      }}
                    />

                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        minWidth: 0,
                      }}
                    >
                      <div
                        data-memorandum-detail-image-motion
                        style={{
                          position: 'relative',
                          padding: '0.95rem',
                          background: 'rgba(12, 8, 10, 0.88)',
                          border: '2px solid rgba(255, 255, 255, 0.5)',
                          boxSizing: 'border-box',
                          clipPath: 'none',
                          borderRadius: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={displayedDetailPage?.imageSrc}
                          alt={displayedDetailPage?.imageAlt}
                          draggable={false}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 'clamp(20rem, 44vh, 28rem)',
                            objectFit: 'cover',
                            objectPosition: displayedDetailPage?.imagePosition ?? 'center',
                            transform: `scale(${displayedDetailPage?.imageZoom ?? 1}) rotate(${displayedDetailPage?.imageTilt ?? 0}deg)`,
                            transformOrigin: displayedDetailPage?.imagePosition ?? 'center',
                            filter: 'saturate(0.92) contrast(1.02)',
                            clipPath: 'none',
                            borderRadius: 0,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

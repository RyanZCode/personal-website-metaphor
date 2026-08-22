export type PerformanceDebugDetailValue = string | number | boolean | null;
export type PerformanceDebugDetails = Record<string, PerformanceDebugDetailValue>;

type PerformanceDebugSampleKind =
  | 'span'
  | 'mark'
  | 'long-task'
  | 'frame-stall'
  | 'layout-shift'
  | 'event'
  | 'resource'
  | 'paint';

interface PerformanceDebugContext {
  state: string;
  page: string;
  selected: string;
}

export interface PerformanceDebugSample extends PerformanceDebugContext {
  kind: PerformanceDebugSampleKind;
  name: string;
  startTime: number;
  duration: number;
  details: PerformanceDebugDetails;
}

interface PerformanceDebugSummary {
  recordingDurationMs: number;
  spans: number;
  longTasks: number;
  longTaskTimeMs: number;
  frameStalls: number;
  worstFrameMs: number;
  layoutShiftScore: number;
  slowEvents: number;
  worstEventMs: number;
  resources: number;
}

interface PerformanceDebugContextSummary {
  context: string;
  longTasks: number;
  longTaskTimeMs: number;
  frameStalls: number;
  worstFrameMs: number;
  slowEvents: number;
}

export interface PerformanceDebugReport {
  generatedAt: string;
  summary: PerformanceDebugSummary;
  contexts: PerformanceDebugContextSummary[];
  spans: PerformanceDebugSample[];
  worstIssues: PerformanceDebugSample[];
  resources: PerformanceDebugSample[];
  samples: PerformanceDebugSample[];
}

export interface PortfolioPerformanceDebug {
  readonly enabled: true;
  begin: (name: string, details?: PerformanceDebugDetails) => string;
  end: (token: string | null, details?: PerformanceDebugDetails) => void;
  mark: (name: string, details?: PerformanceDebugDetails) => void;
  print: () => PerformanceDebugReport;
  report: () => PerformanceDebugReport;
  reset: () => void;
  export: () => string;
  stop: () => void;
}

declare global {
  interface Window {
    __portfolioPerf?: PortfolioPerformanceDebug;
  }
}

interface ActiveSpan extends PerformanceDebugContext {
  name: string;
  startTime: number;
  details: PerformanceDebugDetails;
}

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

type EventTimingEntry = PerformanceEntry & {
  interactionId?: number;
  processingStart?: number;
  processingEnd?: number;
};

const FRAME_STALL_THRESHOLD_MS = 24;
const SLOW_EVENT_THRESHOLD_MS = 16;
const MAX_SAMPLES = 2000;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function readContext(): PerformanceDebugContext {
  const root = document.querySelector('[data-app-root]');
  return {
    state: root?.getAttribute('data-app-state') ?? 'unknown',
    page: root?.getAttribute('data-active-page') ?? 'none',
    selected: root?.getAttribute('data-selected-menu-item') ?? 'unknown',
  };
}

function getResourceName(url: string): string {
  try {
    const pathname = new URL(url, window.location.href).pathname;
    return pathname.split('/').filter(Boolean).at(-1) ?? pathname;
  } catch {
    return url;
  }
}

function getSupportedEntryTypes(): Set<string> {
  return new Set(PerformanceObserver.supportedEntryTypes ?? []);
}

export function startPerformanceDebug(): PortfolioPerformanceDebug {
  if (window.__portfolioPerf) return window.__portfolioPerf;

  let recordingStartedAt = performance.now();
  let tokenCounter = 0;
  let frameId: number | null = null;
  let previousFrameAt = performance.now();
  let stopped = false;
  const samples: PerformanceDebugSample[] = [];
  const activeSpans = new Map<string, ActiveSpan>();
  const observers: PerformanceObserver[] = [];

  const addSample = (sample: PerformanceDebugSample) => {
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) {
      samples.splice(0, samples.length - MAX_SAMPLES);
    }
  };

  const observe = (
    type: string,
    callback: (entry: PerformanceEntry) => void,
    options?: { durationThreshold?: number },
  ) => {
    if (!getSupportedEntryTypes().has(type)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(callback);
    });
    observer.observe({ type, buffered: true, ...options });
    observers.push(observer);
  };

  observe('longtask', (entry) => {
    addSample({
      kind: 'long-task',
      name: entry.name || 'long-task',
      startTime: entry.startTime,
      duration: entry.duration,
      details: {},
      ...readContext(),
    });
  });

  observe('layout-shift', (rawEntry) => {
    const entry = rawEntry as LayoutShiftEntry;
    addSample({
      kind: 'layout-shift',
      name: 'layout-shift',
      startTime: entry.startTime,
      duration: entry.duration,
      details: {
        score: entry.value ?? 0,
        hadRecentInput: entry.hadRecentInput ?? false,
      },
      ...readContext(),
    });
  });

  observe('event', (rawEntry) => {
    if (rawEntry.duration < SLOW_EVENT_THRESHOLD_MS) return;
    const entry = rawEntry as EventTimingEntry;
    addSample({
      kind: 'event',
      name: entry.name || 'event',
      startTime: entry.startTime,
      duration: entry.duration,
      details: {
        interactionId: entry.interactionId ?? 0,
        processingTime: entry.processingStart !== undefined && entry.processingEnd !== undefined
          ? entry.processingEnd - entry.processingStart
          : 0,
      },
      ...readContext(),
    });
  }, { durationThreshold: SLOW_EVENT_THRESHOLD_MS });

  observe('resource', (rawEntry) => {
    const entry = rawEntry as PerformanceResourceTiming;
    const isScript = entry.initiatorType === 'script';
    if (!isScript && entry.duration < 20) return;

    addSample({
      kind: 'resource',
      name: getResourceName(entry.name),
      startTime: entry.startTime,
      duration: entry.duration,
      details: {
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        decodedBodySize: entry.decodedBodySize,
      },
      ...readContext(),
    });
  });

  observe('largest-contentful-paint', (entry) => {
    addSample({
      kind: 'paint',
      name: 'largest-contentful-paint',
      startTime: entry.startTime,
      duration: entry.duration,
      details: {},
      ...readContext(),
    });
  });

  const sampleFrames = (now: number) => {
    if (stopped) return;
    const frameDuration = now - previousFrameAt;
    previousFrameAt = now;

    if (frameDuration >= FRAME_STALL_THRESHOLD_MS) {
      addSample({
        kind: 'frame-stall',
        name: 'frame-gap',
        startTime: now - frameDuration,
        duration: frameDuration,
        details: {
          missedFrames: Math.max(0, Math.round(frameDuration / (1000 / 60)) - 1),
        },
        ...readContext(),
      });
    }

    frameId = requestAnimationFrame(sampleFrames);
  };
  frameId = requestAnimationFrame(sampleFrames);

  const buildReport = (): PerformanceDebugReport => {
    const longTasks = samples.filter((sample) => sample.kind === 'long-task');
    const frameStalls = samples.filter((sample) => sample.kind === 'frame-stall');
    const layoutShifts = samples.filter((sample) => (
      sample.kind === 'layout-shift' && sample.details.hadRecentInput !== true
    ));
    const slowEvents = samples.filter((sample) => sample.kind === 'event');
    const spans = samples.filter((sample) => sample.kind === 'span');
    const resources = samples.filter((sample) => sample.kind === 'resource');
    const issues = [...longTasks, ...frameStalls, ...slowEvents]
      .sort((a, b) => b.duration - a.duration);

    const contexts = new Map<string, PerformanceDebugContextSummary>();
    issues.forEach((sample) => {
      const key = `${sample.state} / ${sample.page}`;
      const context = contexts.get(key) ?? {
        context: key,
        longTasks: 0,
        longTaskTimeMs: 0,
        frameStalls: 0,
        worstFrameMs: 0,
        slowEvents: 0,
      };

      if (sample.kind === 'long-task') {
        context.longTasks += 1;
        context.longTaskTimeMs += sample.duration;
      } else if (sample.kind === 'frame-stall') {
        context.frameStalls += 1;
        context.worstFrameMs = Math.max(context.worstFrameMs, sample.duration);
      } else if (sample.kind === 'event') {
        context.slowEvents += 1;
      }
      contexts.set(key, context);
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        recordingDurationMs: round(performance.now() - recordingStartedAt),
        spans: spans.length,
        longTasks: longTasks.length,
        longTaskTimeMs: round(longTasks.reduce((total, sample) => total + sample.duration, 0)),
        frameStalls: frameStalls.length,
        worstFrameMs: round(Math.max(0, ...frameStalls.map((sample) => sample.duration))),
        layoutShiftScore: round(layoutShifts.reduce(
          (total, sample) => total + Number(sample.details.score ?? 0),
          0,
        ), 4),
        slowEvents: slowEvents.length,
        worstEventMs: round(Math.max(0, ...slowEvents.map((sample) => sample.duration))),
        resources: resources.length,
      },
      contexts: [...contexts.values()]
        .map((context) => ({
          ...context,
          longTaskTimeMs: round(context.longTaskTimeMs),
          worstFrameMs: round(context.worstFrameMs),
        }))
        .sort((a, b) => b.longTaskTimeMs - a.longTaskTimeMs || b.worstFrameMs - a.worstFrameMs),
      spans: [...spans].sort((a, b) => a.startTime - b.startTime),
      worstIssues: issues.slice(0, 20),
      resources: [...resources].sort((a, b) => b.duration - a.duration),
      samples: [...samples],
    };
  };

  const api: PortfolioPerformanceDebug = {
    enabled: true,
    begin: (name, details = {}) => {
      const token = `${name}:${++tokenCounter}`;
      activeSpans.set(token, {
        name,
        startTime: performance.now(),
        details,
        ...readContext(),
      });
      return token;
    },
    end: (token, details = {}) => {
      if (!token) return;
      const span = activeSpans.get(token);
      if (!span) return;
      activeSpans.delete(token);
      const duration = performance.now() - span.startTime;
      addSample({
        kind: 'span',
        name: span.name,
        startTime: span.startTime,
        duration,
        details: { ...span.details, ...details },
        state: span.state,
        page: span.page,
        selected: span.selected,
      });
      console.debug(`[perf] ${span.name}: ${round(duration)}ms`, { ...span.details, ...details });
    },
    mark: (name, details = {}) => {
      addSample({
        kind: 'mark',
        name,
        startTime: performance.now(),
        duration: 0,
        details,
        ...readContext(),
      });
    },
    report: buildReport,
    print: () => {
      const report = buildReport();
      console.groupCollapsed(`[perf] ${report.summary.recordingDurationMs}ms recording`);
      console.table([report.summary]);
      if (report.contexts.length) console.table(report.contexts);
      if (report.spans.length) console.table(report.spans.map((sample) => ({
        name: sample.name,
        durationMs: round(sample.duration),
        state: sample.state,
        page: sample.page,
        ...sample.details,
      })));
      if (report.worstIssues.length) console.table(report.worstIssues.map((sample) => ({
        kind: sample.kind,
        name: sample.name,
        durationMs: round(sample.duration),
        state: sample.state,
        page: sample.page,
        ...sample.details,
      })));
      console.groupEnd();
      return report;
    },
    reset: () => {
      samples.length = 0;
      activeSpans.clear();
      recordingStartedAt = performance.now();
      previousFrameAt = performance.now();
      console.info('[perf] recording reset');
    },
    export: () => JSON.stringify(buildReport(), null, 2),
    stop: () => {
      if (stopped) return;
      stopped = true;
      observers.forEach((observer) => observer.disconnect());
      observers.length = 0;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    },
  };

  window.__portfolioPerf = api;
  api.mark('debug-enabled', {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: 'deviceMemory' in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0)
      : 0,
  });
  console.info('[perf] debugging enabled. Use __portfolioPerf.print() or __portfolioPerf.export().');
  return api;
}

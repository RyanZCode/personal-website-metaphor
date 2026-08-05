import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { createAssetPreloadManifest, preloadImages } from '../lib/assetPreload';
import { shouldReduceBootWork } from '../lib/deviceProfile';
import type { MemorandumData } from '../lib/memorandum';
import type { AppPageId } from '../lib/routes';

type AppState = 'preloading' | 'unsupported-screen' | 'entry' | 'idle' | 'entering-page' | 'page-active' | 'exiting-page';
type UnsupportedScreenResumeState = 'entry' | 'entering-page' | 'page-active';

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface InitialTargetRoute {
  pageId: AppPageId | null;
}

interface MainMenuBootPreloadOptions {
  animationsEnabled: boolean;
  appState: AppState;
  appStateRef: MutableRefObject<AppState>;
  activePageRef: MutableRefObject<AppPageId | null>;
  emptyMemorandumData: MemorandumData;
  effectiveMemorandumData: MemorandumData;
  initialNormalizedPathRef: MutableRefObject<string>;
  initialTargetRouteRef: MutableRefObject<InitialTargetRoute>;
  isCompactViewport: boolean;
  setAppState: Dispatch<SetStateAction<AppState>>;
  setMemorandumData: Dispatch<SetStateAction<MemorandumData | null>>;
  shouldMountPageDirectOnLoadRef: MutableRefObject<boolean>;
  unsupportedScreenDismissed: boolean;
  unsupportedScreenResumeStateRef: MutableRefObject<UnsupportedScreenResumeState>;
}

function getBootTargetAppState(
  shouldMountPageDirectOnLoad: boolean,
  shouldAnimateDirectPageEntry: boolean,
): AppState {
  if (shouldAnimateDirectPageEntry) return 'entering-page';
  if (shouldMountPageDirectOnLoad) return 'page-active';
  return 'entry';
}

export function useMainMenuBootPreload({
  animationsEnabled,
  appState,
  appStateRef,
  activePageRef,
  emptyMemorandumData,
  effectiveMemorandumData,
  initialNormalizedPathRef,
  initialTargetRouteRef,
  isCompactViewport,
  setAppState,
  setMemorandumData,
  shouldMountPageDirectOnLoadRef,
  unsupportedScreenDismissed,
  unsupportedScreenResumeStateRef,
}: MainMenuBootPreloadOptions): void {
  const memoFetchStartedRef = useRef(false);
  const memoFetchPromiseRef = useRef<Promise<MemorandumData | null>>(Promise.resolve(null));
  const deferredImageWarmupStartedRef = useRef(false);

  useEffect(() => {
    const isInitialMemoPage = initialNormalizedPathRef.current.startsWith('/memorandum');

    if (!memoFetchStartedRef.current) {
      memoFetchStartedRef.current = true;
      memoFetchPromiseRef.current = fetch('/memorandum-data.json')
        .then((r) => r.json() as Promise<MemorandumData>)
        .then((data) => {
          setMemorandumData(data);
          return data;
        })
        .catch(() => null);
    }

    const manifest = createAssetPreloadManifest(emptyMemorandumData, {
      initialPageId: initialTargetRouteRef.current.pageId,
    });
    const preloadController = new AbortController();
    const shouldReduceWork = shouldReduceBootWork();
    let cancelled = false;

    const preloadPromises: Promise<unknown>[] = [
      preloadImages(manifest.blockingImageSrcs, {
        concurrency: shouldReduceWork ? 1 : 2,
        signal: preloadController.signal,
      }),
      document.fonts.load('400 1em Cinzel'),
      document.fonts.load('700 1em Cinzel'),
      document.fonts.load('900 1em Cinzel'),
    ];

    if (isInitialMemoPage) {
      preloadPromises.push(memoFetchPromiseRef.current);
    }

    Promise.all(preloadPromises).catch(() => undefined).then(() => {
      if (cancelled) return;
      if (appStateRef.current !== 'preloading') return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const bootTargetState = getBootTargetAppState(
          shouldMountPageDirectOnLoadRef.current,
          shouldMountPageDirectOnLoadRef.current && animationsEnabled
        ) as UnsupportedScreenResumeState;
        const nextState = isCompactViewport && !unsupportedScreenDismissed
          ? 'unsupported-screen'
          : bootTargetState;
        if (nextState === 'unsupported-screen') {
          unsupportedScreenResumeStateRef.current = bootTargetState;
        }
        appStateRef.current = nextState;
        setAppState(nextState);
      }));
    });

    return () => {
      cancelled = true;
      preloadController.abort();
    };
  }, [animationsEnabled, emptyMemorandumData, initialNormalizedPathRef, initialTargetRouteRef, isCompactViewport, setAppState, setMemorandumData, shouldMountPageDirectOnLoadRef, unsupportedScreenDismissed, unsupportedScreenResumeStateRef, appStateRef]);

  useEffect(() => {
    if (appState === 'preloading' || deferredImageWarmupStartedRef.current) return;
    if (shouldReduceBootWork()) {
      deferredImageWarmupStartedRef.current = true;
      return;
    }

    const manifest = createAssetPreloadManifest(effectiveMemorandumData, {
      initialPageId: activePageRef.current,
    });
    if (!manifest.deferredImageSrcs.length) {
      deferredImageWarmupStartedRef.current = true;
      return;
    }

    deferredImageWarmupStartedRef.current = true;

    const preloadController = new AbortController();
    const idleWindow = window as IdleWindow;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const warmDeferredImages = () => {
      if (preloadController.signal.aborted) return;
      void preloadImages(manifest.deferredImageSrcs, {
        concurrency: 2,
        decode: false,
        signal: preloadController.signal,
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleCallbackId = idleWindow.requestIdleCallback(() => {
        warmDeferredImages();
      }, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(warmDeferredImages, 400);
    }

    return () => {
      preloadController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (idleCallbackId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [activePageRef, appState, effectiveMemorandumData]);
}

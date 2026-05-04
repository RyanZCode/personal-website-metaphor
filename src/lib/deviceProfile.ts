import { useEffect, useState } from 'react';

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithDeviceHints = Navigator & {
  connection?: NavigatorConnection;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

export type LayoutMode = 'desktop' | 'tablet' | 'compact';
export type ViewportOrientation = 'landscape' | 'portrait';

export interface ViewportProfile {
  layoutMode: LayoutMode;
  orientation: ViewportOrientation;
  isCoarsePointer: boolean;
  shouldReduceDecor: boolean;
  shouldUseTouchNav: boolean;
}

const DEFAULT_VIEWPORT_PROFILE: ViewportProfile = {
  layoutMode: 'desktop',
  orientation: 'landscape',
  isCoarsePointer: false,
  shouldReduceDecor: false,
  shouldUseTouchNav: false,
};

function getNavigatorHints(): NavigatorWithDeviceHints | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator as NavigatorWithDeviceHints;
}

export function readViewportProfile(): ViewportProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT_PROFILE;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = width / Math.max(height, 1);
  const orientation: ViewportOrientation = height > width ? 'portrait' : 'landscape';
  const isCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches;
  const isCompactWidth = width < 768;
  const isCompactPortrait = orientation === 'portrait' && width < 1024;
  const layoutMode: LayoutMode = isCompactWidth || isCompactPortrait
    ? 'compact'
    : ratio < 1.38 || (width < 1180 && ratio < 1.7) || orientation === 'portrait'
      ? 'tablet'
      : 'desktop';

  return {
    layoutMode,
    orientation,
    isCoarsePointer,
    shouldReduceDecor: layoutMode !== 'desktop',
    shouldUseTouchNav: isCoarsePointer || layoutMode === 'compact',
  };
}

export function useViewportProfile(): ViewportProfile {
  const [profile, setProfile] = useState<ViewportProfile>(DEFAULT_VIEWPORT_PROFILE);

  useEffect(() => {
    const updateProfile = () => {
      setProfile(readViewportProfile());
    };

    updateProfile();

    const coarsePointerQuery = window.matchMedia('(any-pointer: coarse)');
    const orientationQuery = window.matchMedia('(orientation: portrait)');

    window.addEventListener('resize', updateProfile);

    if (typeof coarsePointerQuery.addEventListener === 'function') {
      coarsePointerQuery.addEventListener('change', updateProfile);
      orientationQuery.addEventListener('change', updateProfile);

      return () => {
        window.removeEventListener('resize', updateProfile);
        coarsePointerQuery.removeEventListener('change', updateProfile);
        orientationQuery.removeEventListener('change', updateProfile);
      };
    }

    coarsePointerQuery.addListener(updateProfile);
    orientationQuery.addListener(updateProfile);

    return () => {
      window.removeEventListener('resize', updateProfile);
      coarsePointerQuery.removeListener(updateProfile);
      orientationQuery.removeListener(updateProfile);
    };
  }, []);

  return profile;
}

export function shouldReduceBootWork(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorHints = getNavigatorHints();
  const saveData = navigatorHints?.connection?.saveData === true;
  const effectiveType = navigatorHints?.connection?.effectiveType ?? '';
  const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
  const lowMemory = typeof navigatorHints?.deviceMemory === 'number' && navigatorHints.deviceMemory <= 4;
  const lowCpu = typeof navigatorHints?.hardwareConcurrency === 'number' && navigatorHints.hardwareConcurrency <= 4;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewportProfile = readViewportProfile();

  return saveData || slowConnection || lowMemory || lowCpu || reducedMotion ||
    (viewportProfile.isCoarsePointer && viewportProfile.layoutMode === 'compact');
}

export function shouldRenderDecorativeTextures(): boolean {
  return !shouldReduceBootWork();
}

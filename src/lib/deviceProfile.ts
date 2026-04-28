type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithDeviceHints = Navigator & {
  connection?: NavigatorConnection;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

function getNavigatorHints(): NavigatorWithDeviceHints | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator as NavigatorWithDeviceHints;
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
  const coarsePointer = window.matchMedia('(any-pointer: coarse)').matches;
  const narrowViewport = window.matchMedia('(max-width: 767px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return saveData || slowConnection || lowMemory || lowCpu || reducedMotion || (coarsePointer && narrowViewport);
}

export function shouldRenderDecorativeTextures(): boolean {
  return !shouldReduceBootWork();
}

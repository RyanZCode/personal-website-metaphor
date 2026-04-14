export interface RafThrottledCallback<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
}

export function rafThrottle<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
): RafThrottledCallback<TArgs> {
  let frameId = 0;
  let lastArgs: TArgs | null = null;

  const invoke = () => {
    frameId = 0;
    if (!lastArgs) return;
    const nextArgs = lastArgs;
    lastArgs = null;
    callback(...nextArgs);
  };

  const throttled = ((...args: TArgs) => {
    lastArgs = args;
    if (frameId) return;
    frameId = window.requestAnimationFrame(invoke);
  }) as RafThrottledCallback<TArgs>;

  throttled.cancel = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    lastArgs = null;
  };

  return throttled;
}

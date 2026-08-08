import { useCallback, useRef, type RefObject } from 'react';
import gsap from 'gsap';

export function usePageShellReveal(
  containerRef: RefObject<HTMLElement | null>,
) {
  const rafRef = useRef<number | null>(null);
  const nestedRafRef = useRef<number | null>(null);
  const tokenRef = useRef(0);

  const cancelPendingPageShellReveal = useCallback(() => {
    tokenRef.current += 1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (nestedRafRef.current !== null) {
      cancelAnimationFrame(nestedRafRef.current);
      nestedRafRef.current = null;
    }
  }, []);

  const revealPageShellSoon = useCallback(() => {
    cancelPendingPageShellReveal();
    const revealToken = tokenRef.current;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      nestedRafRef.current = requestAnimationFrame(() => {
        nestedRafRef.current = null;
        if (tokenRef.current !== revealToken) return;

        const shell = containerRef.current?.querySelector('[data-page-shell]');
        if (!shell) return;
        gsap.set(shell, { opacity: 1 });
      });
    });
  }, [cancelPendingPageShellReveal, containerRef]);

  return {
    cancelPendingPageShellReveal,
    revealPageShellSoon,
  };
}

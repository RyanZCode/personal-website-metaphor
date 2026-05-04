import type { LayoutMode } from './deviceProfile';

export function getMenuItemScaleFactor(layoutMode: LayoutMode) {
  if (layoutMode === 'compact') return 0.78;
  if (layoutMode === 'tablet') return 0.92;
  return 1;
}

export function getMenuArcFactor(layoutMode: LayoutMode) {
  return 0.72;
}

export function getMenuSplashScale(layoutMode: LayoutMode) {
  if (layoutMode === 'compact') return 0.7;
  if (layoutMode === 'tablet') return 0.84;
  return 1;
}

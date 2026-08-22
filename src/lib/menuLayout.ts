import type { LayoutMode } from './deviceProfile';
import { ARC_CURVE_X, ITEM_SCALES } from './constants';

export function getMenuItemScaleFactor(layoutMode: LayoutMode) {
  if (layoutMode === 'compact') return 0.78;
  if (layoutMode === 'tablet') return 0.92;
  return 1;
}

export function getMenuArcFactor(layoutMode: LayoutMode) {
  return 0.72;
}

export function getMenuItemTrajectory(index: number) {
  const scale = ITEM_SCALES[Math.min(index, ITEM_SCALES.length - 1)];
  return `rotate(${scale.rotate}deg) perspective(20vh) rotateY(${scale.rotateY}deg)`;
}

export function getMenuItemTransform(index: number, layoutMode: LayoutMode) {
  const arcX = ARC_CURVE_X[Math.min(index, ARC_CURVE_X.length - 1)];
  const translateX = ((arcX * 16 / 9) * getMenuArcFactor(layoutMode)).toFixed(2);
  return `translateX(${translateX}vh) ${getMenuItemTrajectory(index)}`;
}

export function getMenuSplashScale(layoutMode: LayoutMode) {
  if (layoutMode === 'compact') return 0.7;
  if (layoutMode === 'tablet') return 0.84;
  return 1;
}

export type VisualActivity = 'menu' | 'transition' | 'page' | 'off';
export type VisualQuality = 'full' | 'reduced';

export function getVisualActivity(
  appState: string,
  animationsEnabled: boolean,
): VisualActivity {
  if (!animationsEnabled) return 'off';
  if (appState === 'entering-page' || appState === 'exiting-page') return 'transition';
  if (appState === 'page-active') return 'page';
  if (appState === 'unsupported-screen') return 'off';
  return 'menu';
}

export function getVisualQuality(animationsEnabled: boolean): VisualQuality {
  return animationsEnabled ? 'full' : 'reduced';
}

export function shouldRunAmbientAnimations(activity: VisualActivity): boolean {
  return activity === 'menu';
}

export function shouldRunPageAmbientAnimations(activity: VisualActivity): boolean {
  return activity === 'page';
}

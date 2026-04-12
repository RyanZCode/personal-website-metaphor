export type PageNavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface PageNavigationInputContext {
  isRepeat: boolean;
}

export interface PageNavigationHandler {
  onDirection?: (direction: PageNavigationDirection, context?: PageNavigationInputContext) => boolean;
  onWheelDirection?: (direction: Extract<PageNavigationDirection, 'up' | 'down'>) => boolean;
  onConfirm?: () => boolean;
  onBack?: () => boolean;
  onActionKey?: (key: string) => boolean;
  hintVariant?: 'memorandum-detail';
  showScrollHint?: boolean;
  captureWheel?: boolean;
  inputLocked?: boolean;
}

export type RegisterPageNavigation = (handler: PageNavigationHandler | null) => void;

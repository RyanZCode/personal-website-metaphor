import { useCallback, useEffect, useRef } from 'react';
import {
  SOUND_EFFECT_SOURCES,
  type PlaySoundEffect,
  type SoundEffectId,
} from '../lib/soundEffects';

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function createSoundEffectAudio(src: string) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

export function useSoundEffects(
  soundEnabled: boolean,
  appState: string,
): PlaySoundEffect {
  const soundRefs = useRef<Record<SoundEffectId, HTMLAudioElement | null>>({
    switch: null,
    enter: null,
    exit: null,
    toggle: null,
  });
  const soundWarmupStartedRef = useRef(false);
  const pendingSoundWarmupPriorityRef = useRef<SoundEffectId | undefined>(undefined);
  const soundWarmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundWarmupIdleCallbackRef = useRef<number | null>(null);

  const ensureSoundEffect = useCallback((id: SoundEffectId) => {
    if (typeof Audio === 'undefined') return null;

    const existing = soundRefs.current[id];
    if (existing) return existing;

    const audio = createSoundEffectAudio(SOUND_EFFECT_SOURCES[id]);
    soundRefs.current[id] = audio;
    return audio;
  }, []);

  const scheduleSoundWarmup = useCallback((priorityId?: SoundEffectId) => {
    if (typeof Audio === 'undefined' || soundWarmupStartedRef.current) return;
    if (appState !== 'page-active') {
      pendingSoundWarmupPriorityRef.current = priorityId;
      return;
    }

    soundWarmupStartedRef.current = true;
    const idleWindow = window as IdleWindow;
    const warmRemainingEffects = () => {
      soundWarmupTimeoutRef.current = null;
      soundWarmupIdleCallbackRef.current = null;

      (Object.keys(SOUND_EFFECT_SOURCES) as SoundEffectId[]).forEach((soundId) => {
        if (soundId === priorityId) return;
        const audio = ensureSoundEffect(soundId);
        if (!audio) return;
        audio.load();
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      soundWarmupIdleCallbackRef.current = idleWindow.requestIdleCallback(warmRemainingEffects, { timeout: 1500 });
      return;
    }

    soundWarmupTimeoutRef.current = window.setTimeout(warmRemainingEffects, 200);
  }, [appState, ensureSoundEffect]);

  useEffect(() => {
    if (appState !== 'page-active') return;
    if (soundWarmupStartedRef.current) return;
    const priorityId = pendingSoundWarmupPriorityRef.current;
    pendingSoundWarmupPriorityRef.current = undefined;
    scheduleSoundWarmup(priorityId);
  }, [appState, scheduleSoundWarmup]);

  useEffect(() => {
    return () => {
      const idleWindow = window as IdleWindow;
      if (soundWarmupTimeoutRef.current) {
        clearTimeout(soundWarmupTimeoutRef.current);
      }
      if (
        soundWarmupIdleCallbackRef.current !== null &&
        typeof idleWindow.cancelIdleCallback === 'function'
      ) {
        idleWindow.cancelIdleCallback(soundWarmupIdleCallbackRef.current);
      }

      (Object.keys(soundRefs.current) as SoundEffectId[]).forEach((id) => {
        const audio = soundRefs.current[id];
        if (!audio) return;
        audio.pause();
        audio.src = '';
        soundRefs.current[id] = null;
      });
    };
  }, []);

  return useCallback<PlaySoundEffect>((id, options) => {
    if (!soundEnabled && !options?.force) return;

    const audio = ensureSoundEffect(id);
    if (!audio) return;
    scheduleSoundWarmup(id);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [ensureSoundEffect, scheduleSoundWarmup, soundEnabled]);
}

export type SoundEffectId = 'switch' | 'enter' | 'exit' | 'toggle';

export interface PlaySoundOptions {
  force?: boolean;
}

export type PlaySoundEffect = (id: SoundEffectId, options?: PlaySoundOptions) => void;

export const SOUND_EFFECT_SOURCES: Record<SoundEffectId, string> = {
  switch: '/assets/audio/selected-switch.wav',
  enter: '/assets/audio/selected-enter.wav',
  exit: '/assets/audio/selected-exit.wav',
  toggle: '/assets/audio/selected-toggle.wav',
};

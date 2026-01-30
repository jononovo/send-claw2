export const FORM_DEFAULTS = {
  autoAdvanceDelay: 400,
  animationDuration: 300,
  defaultSectionCredits: 50,
  allowSkip: false,
  showProgressBar: true,
  confettiOnSectionComplete: true,
  confettiOnFormComplete: true,
} as const;

export function resolveDefault<K extends keyof typeof FORM_DEFAULTS>(
  setting: typeof FORM_DEFAULTS[K] | undefined,
  defaultKey: K
): typeof FORM_DEFAULTS[K] {
  if (setting !== undefined) return setting;
  return FORM_DEFAULTS[defaultKey];
}

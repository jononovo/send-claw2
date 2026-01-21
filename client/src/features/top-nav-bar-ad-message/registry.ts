import { Offer } from './types';

const NEEDS_PASSWORD_SETUP_KEY = 'needsPasswordSetup';

export function setNeedsPasswordSetup(value: boolean): void {
  if (value) {
    localStorage.setItem(NEEDS_PASSWORD_SETUP_KEY, 'true');
  } else {
    localStorage.removeItem(NEEDS_PASSWORD_SETUP_KEY);
  }
}

export function getNeedsPasswordSetup(): boolean {
  return localStorage.getItem(NEEDS_PASSWORD_SETUP_KEY) === 'true';
}

export function createEmailVerificationOffer(onAction: () => void): Offer {
  return {
    id: 'email-verification-password-setup',
    source: 'registration',
    priority: 100,
    message: 'Verify your email to UNLOCK 200 Super Search Credits',
    ctaLabel: 'Complete Setup',
    onAction,
    isEligible: () => getNeedsPasswordSetup(),
    dismissible: true,
  };
}

export function createOffersRegistry(handlers: {
  onPasswordSetup: () => void;
}): Offer[] {
  return [
    createEmailVerificationOffer(handlers.onPasswordSetup),
  ];
}

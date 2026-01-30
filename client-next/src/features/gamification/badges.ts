export interface BadgeConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'milestone' | 'special';
  trigger: string;
  title: string;
  description: string;
  badge: string;
  emoji?: string;
  buttonText?: string;
}

export const BADGES: BadgeConfig[] = [
  {
    id: 0,
    type: 'welcome',
    trigger: 'registration_complete',
    title: 'Congrats Hatchling Level Unlocked!',
    description: 'You have unlocked **Email Search**.\n\nRun a NEW search now to see complete results including emails of ~2 Key Contacts per company.',
    badge: 'Hatchling',
    emoji: '🦆',
    buttonText: 'Chirp'
  }
];

export function getBadgeByTrigger(trigger: string): BadgeConfig | undefined {
  return BADGES.find(b => b.trigger === trigger);
}

export function getBadgeById(id: number): BadgeConfig | undefined {
  return BADGES.find(b => b.id === id);
}

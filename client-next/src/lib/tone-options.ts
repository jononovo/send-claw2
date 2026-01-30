/**
 * Email Tone Options
 * Frontend definitions for email generation tone selection
 */

export interface ToneOption {
  id: string;
  name: string;
  description: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'silly',
    name: 'Silly',
    description: 'Playful jokes and lighthearted humor'
  },
  {
    id: 'friendly', 
    name: 'Friendly',
    description: 'Really warm, overly friendly and enthusiastic'
  },
  {
    id: 'default',
    name: 'Casual',
    description: 'Not trying too hard and nonchalant'
  },
  {
    id: 'direct',
    name: 'Professional', 
    description: 'Direct but Professional - Confident and polite'
  },
  {
    id: 'abrupt',
    name: 'Abrupt',
    description: 'Sometimes effective in getting leadership attention'
  },
  {
    id: 'beast',
    name: 'BEAST',
    description: 'Impossible to ignore. Ranges wild to insane'
  },
  {
    id: 'genz',
    name: 'Gen-Z',
    description: 'Text-style messaging with smart business focus'
  }
];

export const DEFAULT_TONE = 'default';
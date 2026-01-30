/**
 * Email Offer Strategy Options
 * Frontend definitions for email generation offer strategy selection
 */

export interface OfferOption {
  id: string;
  name: string;
  description: string;
}

export const OFFER_OPTIONS: OfferOption[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No special offer strategy'
  },
  {
    id: 'hormozi',
    name: 'Hormozi',
    description: 'Benefit stacking that makes price negligible'
  },
  {
    id: 'oneOnOne',
    name: '1-on-1',
    description: '15 minutes personalized guidance and FREE setup'
  },
  {
    id: 'ifWeCant',
    name: 'Guarantee',
    description: 'Guarantee-based with compelling backup offer'
  },
  {
    id: 'shinyFree',
    name: 'Shiny',
    description: 'Free valuable resources like cheat sheets, API keys'
  },
  {
    id: 'caseStudy',
    name: 'Study',
    description: 'Social proof with specific company results'
  },
  {
    id: 'coldEmailFormula',
    name: 'Formula',
    description: '5-part proven framework with 37% open rate'
  }
];

export const DEFAULT_OFFER = 'none';
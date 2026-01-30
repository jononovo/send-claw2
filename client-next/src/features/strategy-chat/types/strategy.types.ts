// Strategy-related types and interfaces

export interface StrategicProfile {
  id: number;
  name: string;
  businessType: string;
  status: 'in_progress' | 'completed';
  productService: string;
  customerFeedback: string;
  website: string;
  createdAt: string;
  productAnalysisSummary?: string;
  strategyHighLevelBoundary?: string;
  exampleSprintPlanningPrompt?: string;
  dailySearchQueries?: string;
  reportSalesContextGuidance?: string;
  reportSalesTargetingGuidance?: string;
  productOfferStrategies?: string;
}

export type OverlayState = 'hidden' | 'minimized' | 'sidebar' | 'fullscreen';

export interface StrategyOverlayProps {
  state: OverlayState;
  onStateChange: (state: OverlayState) => void;
}

export interface StrategyReport {
  type: 'product_summary' | 'email_strategy' | 'sales_approach' | 'product_offers';
  title: string;
  content: string;
  data?: any;
}

export interface BoundaryOptions {
  type: 'boundary_options';
  title: string;
  content: string;
  step: number;
  totalSteps: number;
  needsSelection: boolean;
  description: string;
}

export interface StrategyGenerationState {
  boundary?: string;
  sprintPrompt?: string;
  dailyQueries?: string[];
  initialTarget?: string;
  refinedTarget?: string;
}
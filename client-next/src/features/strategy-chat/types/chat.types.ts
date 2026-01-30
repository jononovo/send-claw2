// Chat-related types and interfaces

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isHTML?: boolean;
  isLoading?: boolean;
}

export interface ConversationHistory {
  messages: Message[];
  currentPhase: ConversationPhase;
}

export type ConversationPhase = 
  | 'PRODUCT_SUMMARY'
  | 'TARGET_COLLECTION' 
  | 'TARGET_REFINEMENT'
  | 'EMAIL_STRATEGY'
  | 'SALES_APPROACH'
  | 'COMPLETE';

export interface BoundarySelectionContext {
  options: string[];
  productContext: any;
  initialTarget: string;
  refinedTarget: string;
}

export interface SalesApproachContext {
  boundary: string;
  sprintPrompt: string;
  dailyQueries: string[];
}
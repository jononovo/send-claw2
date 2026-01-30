// Central type exports for strategy chat module
export * from './chat.types';
export * from './strategy.types';
export * from './form.types';

// API Request/Response types for chat service
export interface OnboardingChatMessage {
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface OnboardingChatResponse {
  message?: string;
  userMessage?: string;
  aiResponse?: string;
  type?: string;
  data?: any;
}

export interface SaveFromChatRequest {
  profileId?: number;
  productService: string;
  customerFeedback: string;
  website: string;
  businessType: string;
}

export interface SaveFromChatResponse {
  success: boolean;
  profileId: number;
  message?: string;
}

export interface GenerateEmailContentRequest {
  recipientName: string;
  recipientRole: string;
  companyName: string;
  context?: string;
  tone?: string;
}

export interface GenerateEmailContentResponse {
  emailContent: string;
  subject?: string;
}

export type TEmailGenerationWorkflow = 
  | 'product_analysis'
  | 'target_refinement'
  | 'email_strategy'
  | 'complete';
import type { Contact, Company } from "@shared/schema";

export interface ProductContext {
  productService?: string;
  customerFeedback?: string;
  website?: string;
  reportSalesContextGuidance?: string;
}

export interface SenderProfilePayload {
  displayName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyPosition?: string;
  companyName?: string;
  companyWebsite?: string;
}

export interface EmailGenerationPayload {
  emailPrompt: string;
  contact: Contact | null;
  company: Company;
  toEmail?: string;
  emailSubject?: string;
  tone?: string;
  offerStrategy?: string;
  generateTemplate?: boolean; // Flag to generate template with merge fields
  productContext?: ProductContext; // Rich product context for AI
  senderProfile?: SenderProfilePayload; // Sender identity for email personalization
  targetAudienceQuery?: string; // Search query describing target audience for AI context
}

export interface EmailGenerationResponse {
  subject: string;
  content: string;
}

export interface EmailGenerationState {
  isGenerating: boolean;
  error: Error | null;
}
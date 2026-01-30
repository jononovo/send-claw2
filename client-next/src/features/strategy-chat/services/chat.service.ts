import { apiRequest } from "@/lib/queryClient";
import type { 
  OnboardingChatMessage,
  OnboardingChatResponse,
  SaveFromChatRequest,
  SaveFromChatResponse,
  GenerateEmailContentRequest,
  GenerateEmailContentResponse,
  TEmailGenerationWorkflow
} from "../types";

/**
 * Strategy Chat API Service
 * Handles all API interactions for the strategy chat/onboarding flow
 */

export const chatService = {
  /**
   * Send a message to the onboarding chat
   */
  async sendChatMessage(
    message: string,
    workflow: TEmailGenerationWorkflow,
    conversationHistory: OnboardingChatMessage[],
    boundaryContext?: any
  ): Promise<OnboardingChatResponse> {
    const response = await apiRequest("POST", "/api/onboarding/strategy-chat", {
      userMessage: message,
      workflow,
      conversationHistory,
      boundaryContext
    });
    return response.json();
  },

  /**
   * Save strategic profile from chat
   */
  async saveStrategicProfile(data: SaveFromChatRequest): Promise<SaveFromChatResponse> {
    const response = await apiRequest("POST", "/api/strategic-profiles/save-from-chat", data);
    return response.json();
  },

  /**
   * Generate email content
   */
  async generateEmailContent(data: GenerateEmailContentRequest): Promise<GenerateEmailContentResponse> {
    const response = await apiRequest("POST", "/api/email-generation/generate-content", data);
    return response.json();
  },

  /**
   * Get user chatbox state
   */
  async getChatboxState(userId: number) {
    const response = await apiRequest("GET", `/api/user-chatbox/${userId}`);
    return response.json();
  },

  /**
   * Update user chatbox state
   */
  async updateChatboxState(userId: number, state: any) {
    const response = await apiRequest("PUT", `/api/user-chatbox/${userId}`, state);
    return response.json();
  }
};

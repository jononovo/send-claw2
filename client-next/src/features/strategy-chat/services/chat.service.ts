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
    return apiRequest("/api/onboarding/strategy-chat", {
      method: "POST",
      body: JSON.stringify({
        userMessage: message,
        workflow,
        conversationHistory,
        boundaryContext
      })
    });
  },

  /**
   * Save strategic profile from chat
   */
  async saveStrategicProfile(data: SaveFromChatRequest): Promise<SaveFromChatResponse> {
    return apiRequest("/api/strategic-profiles/save-from-chat", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * Generate email content
   */
  async generateEmailContent(data: GenerateEmailContentRequest): Promise<GenerateEmailContentResponse> {
    return apiRequest("/api/email-generation/generate-content", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * Get user chatbox state
   */
  async getChatboxState(userId: number) {
    return apiRequest(`/api/user-chatbox/${userId}`);
  },

  /**
   * Update user chatbox state
   */
  async updateChatboxState(userId: number, state: any) {
    return apiRequest(`/api/user-chatbox/${userId}`, {
      method: "PUT",
      body: JSON.stringify(state)
    });
  }
};
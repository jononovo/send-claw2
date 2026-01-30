import { apiRequest } from "@/lib/queryClient";
import type { EmailGenerationPayload, EmailGenerationResponse } from "./types";

/**
 * Email Generation API Service
 * Handles communication with the email generation backend
 */

export async function generateEmailApi(payload: EmailGenerationPayload): Promise<EmailGenerationResponse> {
  const response = await apiRequest("POST", "/api/generate-email", payload);
  return response.json();
}
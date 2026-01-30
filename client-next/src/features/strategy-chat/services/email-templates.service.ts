import { apiRequest } from "@/lib/queryClient";

/**
 * Email Templates API Service
 * Handles API interactions for email templates
 */

interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  body: string;
  userId?: number;
  tone?: string;
  offer?: string;
}

export const emailTemplatesService = {
  /**
   * Get all email templates
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    return apiRequest("/api/email-templates");
  },

  /**
   * Get a single email template by ID
   */
  async getTemplate(id: number): Promise<EmailTemplate> {
    return apiRequest(`/api/email-templates/${id}`);
  },

  /**
   * Create a new email template
   */
  async createTemplate(data: EmailTemplate): Promise<EmailTemplate> {
    return apiRequest("/api/email-templates", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * Update an existing email template
   */
  async updateTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return apiRequest(`/api/email-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete an email template
   */
  async deleteTemplate(id: number): Promise<void> {
    return apiRequest(`/api/email-templates/${id}`, {
      method: "DELETE"
    });
  },

  /**
   * Get generated email content with variables
   */
  async getGeneratedContent(templateId: number, variables: Record<string, any>) {
    return apiRequest("/api/email-templates/generate", {
      method: "POST",
      body: JSON.stringify({ templateId, variables })
    });
  }
};
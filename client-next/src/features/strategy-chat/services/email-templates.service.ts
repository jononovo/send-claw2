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
    const response = await apiRequest("GET", "/api/email-templates");
    return response.json();
  },

  /**
   * Get a single email template by ID
   */
  async getTemplate(id: number): Promise<EmailTemplate> {
    const response = await apiRequest("GET", `/api/email-templates/${id}`);
    return response.json();
  },

  /**
   * Create a new email template
   */
  async createTemplate(data: EmailTemplate): Promise<EmailTemplate> {
    const response = await apiRequest("POST", "/api/email-templates", data);
    return response.json();
  },

  /**
   * Update an existing email template
   */
  async updateTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await apiRequest("PATCH", `/api/email-templates/${id}`, data);
    return response.json();
  },

  /**
   * Delete an email template
   */
  async deleteTemplate(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/email-templates/${id}`);
  },

  /**
   * Get generated email content with variables
   */
  async getGeneratedContent(templateId: number, variables: Record<string, any>) {
    const response = await apiRequest("POST", "/api/email-templates/generate", { templateId, variables });
    return response.json();
  }
};

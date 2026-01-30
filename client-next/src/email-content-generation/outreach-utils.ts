import type { Contact, Company } from "@shared/schema";
import type { MergeFieldContext } from "@/lib/merge-field-resolver";

/**
 * Email Generation Utilities
 * Pure functions for email generation logic
 */

export function createMergeFieldContext(
  contact: Contact | null,
  company: Company | null,
  senderFullName?: string,
  senderFirstName?: string,
  senderCompanyName?: string
): MergeFieldContext {
  return {
    contact: contact ? {
      name: contact.name,
      role: contact.role || undefined,
      email: contact.email || undefined,
    } : null,
    company: company ? {
      name: company.name,
    } : null,
    sender: {
      name: senderFullName || 'User',
      firstName: senderFirstName || senderFullName?.split(' ')[0] || 'User',
      companyName: senderCompanyName // Add sender company name to context
    }
  };
}

/**
 * Resolve sender names on the frontend using available user data
 * Priority: username > email prefix
 */
export function resolveFrontendSenderNames(user: any): { firstName: string; fullName: string } {
  if (!user) {
    return { firstName: 'User', fullName: 'User' };
  }

  // Use username if it's not just the email prefix
  const emailPrefix = user.email?.split('@')[0] || '';
  if (user.username && user.username !== emailPrefix && user.username.trim() !== '') {
    const fullName = user.username.trim();
    const firstName = fullName.split(' ')[0] || fullName;
    return { firstName, fullName };
  }

  // Fallback to email prefix
  return { firstName: emailPrefix, fullName: emailPrefix };
}

export function shouldAutoFillSubject(currentSubject: string): boolean {
  return !currentSubject || currentSubject.trim() === '';
}

export function shouldAutoFillEmail(contact: Contact | null, currentToEmail: string): boolean {
  return !!(contact?.email && (!currentToEmail || currentToEmail.trim() === ''));
}

export function formatGeneratedContent(newContent: string, existingContent: string): string {
  return newContent; // Always replace content instead of appending
}

export function validateEmailGenerationRequest(
  emailPrompt: string,
  company: Company | null
): { isValid: boolean; error?: string } {
  // This function is kept for backward compatibility but simplified
  // Company is no longer required - fallback to "your company" works for all cases
  
  if (!emailPrompt || emailPrompt.trim() === '') {
    return { isValid: false, error: "No Prompt Provided" };
  }

  return { isValid: true };
}

/**
 * Get available merge fields based on what data is present
 * This prevents including merge fields in prompts when data is not available
 */
export function getAvailableMergeFields(mergeFieldContext: MergeFieldContext): string[] {
  const available: string[] = [];
  const { contact, company, sender } = mergeFieldContext;
  
  // Always available sender fields
  if (sender?.name) {
    available.push('{{sender_full_name}}');
  }
  if (sender?.firstName) {
    available.push('{{sender_first_name}}');
  }
  
  // Conditionally available sender fields
  if (sender?.companyName) {
    available.push('{{sender_company_name}}');
  }
  
  // Contact fields
  if (contact?.name) {
    available.push('{{contact_name}}');
    available.push('{{first_name}}');
    available.push('{{last_name}}');
  }
  if (contact?.role) {
    available.push('{{contact_role}}');
  }
  if (contact?.email) {
    available.push('{{contact_email}}');
  }
  
  // Company fields
  if (company?.name) {
    available.push('{{contact_company_name}}');
  }
  
  return available;
}

/**
 * Build dynamic prompt including only available merge fields
 * This prevents the AI from using fields that will resolve to placeholder text
 */
export function buildDynamicPromptInstructions(mergeFieldContext: MergeFieldContext): string {
  const availableFields = getAvailableMergeFields(mergeFieldContext);
  
  if (availableFields.length === 0) {
    return '';
  }
  
  // Group fields by type for better organization
  const contactFields = availableFields.filter(f => 
    f.includes('contact') || f === '{{first_name}}' || f === '{{last_name}}'
  );
  const senderFields = availableFields.filter(f => f.includes('sender'));
  const companyFields = availableFields.filter(f => f.includes('company') && !f.includes('sender'));
  
  let instructions = '\n\nAvailable merge fields to personalize this email:';
  
  if (senderFields.length > 0) {
    instructions += '\nSender fields: ' + senderFields.join(', ');
  }
  if (contactFields.length > 0) {
    instructions += '\nContact fields: ' + contactFields.join(', ');
  }
  if (companyFields.length > 0) {
    instructions += '\nCompany fields: ' + companyFields.join(', ');
  }
  
  instructions += '\n\nUse these merge fields naturally in the email to personalize it.';
  
  return instructions;
}
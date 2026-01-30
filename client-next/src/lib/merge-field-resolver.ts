import { MERGE_FIELDS } from './merge-fields';

export interface MergeFieldContext {
  contact?: {
    name?: string;
    role?: string;
    email?: string;
  } | null;
  company?: {
    name?: string;
  } | null;
  sender?: {
    name?: string;
    firstName?: string;
    companyName?: string;
  };
}

// Default values for merge fields
const DEFAULT_VALUES: Record<string, string> = {
  '{{sender_full_name}}': 'User',
  '{{sender_first_name}}': 'User',
  '{{personal_intro}}': 'Personal introduction',
  '{{custom_proposal}}': 'Custom proposal',
  '{{product1_name}}': 'Product Name',
  '{{product1_description}}': 'Product description',
  '{{product2_name}}': 'Second Product',
  '{{product2_description}}': 'Second product description',
  '{{product3_name}}': 'Third Product',
  '{{product3_description}}': 'Third product description',
  '{{company_website}}': 'company-website.com',
  '{{company_linkedin}}': 'linkedin.com/company/name',
  '{{contact_linkedin}}': 'linkedin.com/in/contact',
  '{{contact_name}}': 'Contact Name',
  '{{customer_pain-point}}': 'Customer pain point or challenge'
};

export function resolveMergeField(field: string, context: MergeFieldContext): string {
  const { contact, company, sender } = context;
  
  switch (field) {
    case '{{company_name}}': // Backward compatibility
    case '{{contact_company_name}}':
      return company?.name || 'Company Name';
    
    case '{{contact_name}}':
      return contact?.name || DEFAULT_VALUES['{{contact_name}}'];
    
    case '{{contact_role}}':
      return contact?.role || 'Role';
    
    case '{{contact_email}}':
      return contact?.email || 'contact@email.com';
    
    case '{{first_name}}':
      return contact?.name?.split(' ')[0] || 'First';
    
    case '{{last_name}}':
      const nameParts = contact?.name?.split(' ') || [];
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Last';
    
    case '{{sender_full_name}}':
      return sender?.name || DEFAULT_VALUES['{{sender_full_name}}'];
    
    case '{{sender_first_name}}':
      return sender?.firstName || sender?.name?.split(' ')[0] || 'User';
    
    case '{{sender_company_name}}':
      return sender?.companyName || '[Your Company]';
    
    default:
      return DEFAULT_VALUES[field] || field;
  }
}

export function resolveAllMergeFields(content: string, context: MergeFieldContext): string {
  const mergeFieldPattern = /\{\{[^}]+\}\}/g;
  
  return content.replace(mergeFieldPattern, (match) => {
    return resolveMergeField(match, context);
  });
}

// Extract merge fields from content
export function extractMergeFields(content: string): string[] {
  const mergeFieldPattern = /\{\{[^}]+\}\}/g;
  const fields: string[] = [];
  let match;
  
  while ((match = mergeFieldPattern.exec(content)) !== null) {
    if (!fields.includes(match[0])) {
      fields.push(match[0]);
    }
  }
  
  return fields;
}

// Check if content contains merge fields
export function hasMergeFields(content: string): boolean {
  return /\{\{[^}]+\}\}/.test(content);
}
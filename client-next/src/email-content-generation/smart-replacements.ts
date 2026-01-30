import type { Contact, Company } from "@shared/schema";

/**
 * Smart replacement system for email generation
 * Intelligently replaces exact name matches with merge fields
 * while preserving creative variations and avoiding over-replacement
 */

interface ReplacementResult {
  content: string;
  subject: string;
}

/**
 * Apply smart replacements to generated email content
 * Replaces exact matches of contact first name and company name with merge fields
 * 
 * Rules:
 * 1. Only replace in first line and first paragraph
 * 2. Skip URLs and email addresses
 * 3. Maximum 2 replacements per field
 */
export function applySmartReplacements(
  content: string,
  subject: string,
  contact: Contact | null,
  company: Company | null
): ReplacementResult {
  // Process subject line (counts as first line)
  let processedSubject = subject;
  let firstNameCount = 0;
  let companyNameCount = 0;

  // Extract first name from contact
  const firstName = contact?.name?.split(' ')[0];
  
  // Replace in subject if exact match exists
  if (firstName && processedSubject.includes(firstName)) {
    processedSubject = replaceWithLimit(
      processedSubject, 
      firstName, 
      '{{first_name}}',
      2,
      firstNameCount
    );
    firstNameCount = countReplacements(processedSubject, '{{first_name}}');
  }

  if (company?.name && processedSubject.includes(company.name)) {
    processedSubject = replaceWithLimit(
      processedSubject,
      company.name,
      '{{contact_company_name}}',
      2,
      companyNameCount
    );
    companyNameCount = countReplacements(processedSubject, '{{contact_company_name}}');
  }

  // Process email body
  let processedContent = content;
  
  // Split content into lines
  const lines = content.split('\n');
  
  // Find first non-empty line and first paragraph
  let firstLineIndex = -1;
  let firstParagraphEnd = -1;
  
  // Find first non-empty line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      firstLineIndex = i;
      break;
    }
  }

  // Find end of first paragraph (double newline or end of content)
  let consecutiveEmpty = 0;
  for (let i = firstLineIndex; i < lines.length; i++) {
    if (!lines[i].trim()) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 2) {
        firstParagraphEnd = i - 1;
        break;
      }
    } else {
      consecutiveEmpty = 0;
    }
  }
  
  // If no double newline found, consider first 3-4 lines as first paragraph
  if (firstParagraphEnd === -1) {
    firstParagraphEnd = Math.min(firstLineIndex + 3, lines.length - 1);
  }

  // Apply replacements only to first line and first paragraph
  for (let i = 0; i < lines.length; i++) {
    // Only process if it's the first line or within first paragraph
    if (i === firstLineIndex || (i > firstLineIndex && i <= firstParagraphEnd)) {
      let processedLine = lines[i];
      
      // Replace first name if we haven't hit the limit
      if (firstName && firstNameCount < 2 && processedLine.includes(firstName)) {
        // Skip if it looks like an email or URL
        if (!isEmailOrUrl(processedLine, firstName)) {
          const beforeCount = countOccurrences(processedLine, firstName);
          processedLine = replaceWithLimit(
            processedLine,
            firstName,
            '{{first_name}}',
            2 - firstNameCount,
            0
          );
          const afterCount = countOccurrences(processedLine, '{{first_name}}');
          firstNameCount += afterCount;
        }
      }

      // Replace company name if we haven't hit the limit
      if (company?.name && companyNameCount < 2 && processedLine.includes(company.name)) {
        // Skip if it looks like an email or URL
        if (!isEmailOrUrl(processedLine, company.name)) {
          const beforeCount = countOccurrences(processedLine, company.name);
          processedLine = replaceWithLimit(
            processedLine,
            company.name,
            '{{contact_company_name}}',
            2 - companyNameCount,
            0
          );
          const afterCount = countOccurrences(processedLine, '{{contact_company_name}}');
          companyNameCount += afterCount;
        }
      }

      lines[i] = processedLine;
    }
  }

  processedContent = lines.join('\n');

  return {
    content: processedContent,
    subject: processedSubject
  };
}

/**
 * Replace text with limit on number of replacements
 */
function replaceWithLimit(
  text: string,
  searchStr: string,
  replaceStr: string,
  maxReplacements: number,
  currentCount: number
): string {
  let result = text;
  let replacements = 0;
  let index = 0;

  while (replacements < maxReplacements && index < result.length) {
    const foundIndex = result.indexOf(searchStr, index);
    if (foundIndex === -1) break;

    // Check if this occurrence is part of an email or URL
    const before = result.substring(Math.max(0, foundIndex - 20), foundIndex);
    const after = result.substring(foundIndex, Math.min(result.length, foundIndex + searchStr.length + 20));
    
    // Skip if it looks like part of email or URL
    if (before.includes('@') || before.includes('://') || 
        after.includes('@') || after.includes('.com') || after.includes('.org')) {
      index = foundIndex + searchStr.length;
      continue;
    }

    // Perform replacement
    result = result.substring(0, foundIndex) + replaceStr + result.substring(foundIndex + searchStr.length);
    replacements++;
    index = foundIndex + replaceStr.length;
  }

  return result;
}

/**
 * Check if a line contains an email or URL with the given text
 */
function isEmailOrUrl(line: string, text: string): boolean {
  // Check for email patterns
  const emailPattern = new RegExp(`[\\w.-]+@[\\w.-]*${text}[\\w.-]*`, 'i');
  if (emailPattern.test(line)) return true;

  // Check for URL patterns
  const urlPattern = new RegExp(`(https?://|www\\.).*${text}`, 'i');
  if (urlPattern.test(line)) return true;

  // Check if text is immediately followed by .com, .org, etc
  const domainPattern = new RegExp(`${text}\\.(com|org|net|io|co|app)`, 'i');
  if (domainPattern.test(line)) return true;

  return false;
}

/**
 * Count occurrences of a string
 */
function countOccurrences(text: string, searchStr: string): number {
  const matches = text.match(new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return matches ? matches.length : 0;
}

/**
 * Count how many times a replacement tag appears
 */
function countReplacements(text: string, tag: string): number {
  const matches = text.match(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'));
  return matches ? matches.length : 0;
}
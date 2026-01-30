/**
 * Email Link Generator Service
 * Generates properly encoded mailto links and web-based email compose URLs
 */

export interface EmailOptions {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

export class EmailLinkGenerator {
  private static readonly MAILTO_CHAR_LIMIT = 1900; // Safe limit for most browsers
  private static readonly LINE_BREAK = '\n';
  private static readonly ENCODED_LINE_BREAK = '%0A';
  private static readonly PARAGRAPH_BREAK = '\n\n';
  
  /**
   * Generate a mailto link with proper encoding
   * Respects character limits and encodes special characters
   */
  static generateMailtoLink(options: EmailOptions): string {
    // Build parameters manually with proper encoding for mailto links
    const params: string[] = [];
    
    if (options.cc) {
      params.push(`cc=${encodeURIComponent(options.cc)}`);
    }
    if (options.bcc) {
      params.push(`bcc=${encodeURIComponent(options.bcc)}`);
    }
    if (options.subject) {
      params.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.body) {
      // Ensure proper line breaks in body
      const formattedBody = this.formatEmailBody(options.body);
      params.push(`body=${encodeURIComponent(formattedBody)}`);
    }
    
    const queryString = params.join('&');
    const mailtoLink = `mailto:${options.to}${queryString ? '?' + queryString : ''}`;
    
    // Check character limit
    if (mailtoLink.length > this.MAILTO_CHAR_LIMIT) {
      console.warn(`Mailto link exceeds ${this.MAILTO_CHAR_LIMIT} characters. Some email clients may truncate.`);
      // Truncate body if necessary
      return this.truncateMailtoLink(options);
    }
    
    return mailtoLink;
  }
  
  /**
   * Generate Gmail compose URL
   * Opens Gmail in a new tab with pre-filled fields
   */
  static generateGmailUrl(options: EmailOptions): string {
    const params = new URLSearchParams();
    
    if (options.to) params.append('to', options.to);
    if (options.cc) params.append('cc', options.cc);
    if (options.bcc) params.append('bcc', options.bcc);
    if (options.subject) params.append('su', options.subject); // Gmail uses 'su' for subject
    if (options.body) {
      const formattedBody = this.formatEmailBody(options.body);
      params.append('body', formattedBody);
    }
    
    // tf=cm ensures compose mode
    params.append('tf', 'cm');
    
    return `https://mail.google.com/mail/u/0/?${params.toString()}`;
  }
  
  /**
   * Generate Outlook.com compose URL
   */
  static generateOutlookUrl(options: EmailOptions): string {
    const params = new URLSearchParams();
    
    params.append('path', '/mail/action/compose');
    if (options.to) params.append('to', options.to);
    if (options.cc) params.append('cc', options.cc);
    if (options.bcc) params.append('bcc', options.bcc);
    if (options.subject) params.append('subject', options.subject);
    if (options.body) {
      const formattedBody = this.formatEmailBody(options.body);
      params.append('body', formattedBody);
    }
    
    return `https://outlook.live.com/owa/?${params.toString()}`;
  }
  
  /**
   * Generate Yahoo Mail compose URL
   */
  static generateYahooUrl(options: EmailOptions): string {
    const params = new URLSearchParams();
    
    if (options.to) params.append('to', options.to);
    if (options.cc) params.append('cc', options.cc);
    if (options.bcc) params.append('bcc', options.bcc);
    if (options.subject) params.append('subject', options.subject);
    if (options.body) {
      const formattedBody = this.formatEmailBody(options.body);
      params.append('body', formattedBody);
    }
    
    return `https://compose.mail.yahoo.com/?${params.toString()}`;
  }
  
  /**
   * Format email body with proper line breaks
   * Preserves paragraph spacing and formatting
   */
  private static formatEmailBody(body: string): string {
    // Normalize line endings
    let formatted = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Preserve double line breaks as paragraph breaks
    formatted = formatted.replace(/\n\n+/g, this.PARAGRAPH_BREAK);
    
    return formatted;
  }
  
  /**
   * Truncate mailto link to fit within character limit
   * Prioritizes keeping subject and truncating body
   */
  private static truncateMailtoLink(options: EmailOptions): string {
    const baseLength = `mailto:${options.to}?`.length;
    const subjectLength = options.subject ? 
      `subject=${encodeURIComponent(options.subject)}&`.length : 0;
    const ccLength = options.cc ? 
      `cc=${encodeURIComponent(options.cc)}&`.length : 0;
    const bccLength = options.bcc ? 
      `bcc=${encodeURIComponent(options.bcc)}&`.length : 0;
    
    const availableForBody = this.MAILTO_CHAR_LIMIT - baseLength - 
      subjectLength - ccLength - bccLength - 'body='.length - 50; // Buffer
    
    if (options.body && availableForBody > 100) {
      // Truncate body to fit
      const truncatedBody = options.body.substring(0, availableForBody / 3); // Account for encoding
      const truncatedOptions = { ...options, body: truncatedBody + '...' };
      
      // Build params manually with proper encoding
      const params: string[] = [];
      if (truncatedOptions.cc) params.push(`cc=${encodeURIComponent(truncatedOptions.cc)}`);
      if (truncatedOptions.bcc) params.push(`bcc=${encodeURIComponent(truncatedOptions.bcc)}`);
      if (truncatedOptions.subject) params.push(`subject=${encodeURIComponent(truncatedOptions.subject)}`);
      
      const formattedBody = this.formatEmailBody(truncatedOptions.body);
      params.push(`body=${encodeURIComponent(formattedBody)}`);
      
      return `mailto:${truncatedOptions.to}?${params.join('&')}`;
    }
    
    // If still too long, just include recipient and subject
    const minimalParams: string[] = [];
    if (options.subject) minimalParams.push(`subject=${encodeURIComponent(options.subject)}`);
    return `mailto:${options.to}${minimalParams.length > 0 ? '?' + minimalParams.join('&') : ''}`;
  }
  
  /**
   * Generate a copy-to-clipboard friendly email format
   */
  static generateClipboardText(options: EmailOptions): string {
    const parts: string[] = [];
    
    parts.push(`To: ${options.to}`);
    if (options.cc) parts.push(`CC: ${options.cc}`);
    if (options.bcc) parts.push(`BCC: ${options.bcc}`);
    if (options.subject) parts.push(`Subject: ${options.subject}`);
    
    if (options.body) {
      parts.push(''); // Empty line before body
      parts.push('Message:');
      parts.push('---');
      parts.push(options.body);
    }
    
    return parts.join('\n');
  }
  
  /**
   * Open email link in appropriate way based on method
   */
  static openEmailLink(
    method: 'mailto' | 'gmail' | 'outlook' | 'yahoo',
    options: EmailOptions,
    newTab = true
  ): void {
    let url: string;
    
    switch (method) {
      case 'mailto':
        url = this.generateMailtoLink(options);
        // Mailto should open in same window to trigger email client
        window.location.href = url;
        return;
      
      case 'gmail':
        url = this.generateGmailUrl(options);
        break;
      
      case 'outlook':
        url = this.generateOutlookUrl(options);
        break;
      
      case 'yahoo':
        url = this.generateYahooUrl(options);
        break;
      
      default:
        console.error(`Unknown email method: ${method}`);
        return;
    }
    
    // Web-based email services open in new tab
    if (newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }
  
  /**
   * Copy email details to clipboard
   */
  static async copyToClipboard(options: EmailOptions): Promise<boolean> {
    const text = this.generateClipboardText(options);
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}
/**
 * Email Masking Utility
 * 
 * Masks email addresses for unauthenticated users while indicating an email exists.
 * Example: "john.doe@acme.com" -> "j***@acme.com"
 */

export function maskEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return '***@***.com';
  }

  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  if (localPart.length <= 1) {
    return `${localPart}***${domain}`;
  }

  return `${localPart[0]}***${domain}`;
}

export function maskEmails(emails: string[] | null | undefined): string[] | null {
  if (!emails || !Array.isArray(emails)) {
    return null;
  }
  return emails.map(email => maskEmail(email)).filter((e): e is string => e !== null);
}

export interface ContactWithEmail {
  email?: string | null;
  alternativeEmails?: string[] | null;
  [key: string]: any;
}

export function maskContactEmails<T extends ContactWithEmail>(contact: T): T {
  return {
    ...contact,
    email: maskEmail(contact.email),
    alternativeEmails: maskEmails(contact.alternativeEmails)
  };
}

export function maskContactsEmails<T extends ContactWithEmail>(contacts: T[]): T[] {
  return contacts.map(contact => maskContactEmails(contact));
}

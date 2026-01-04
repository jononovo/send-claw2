import type { Company, Contact } from "@shared/schema";

export function getCompanyUrl(company: { id: number; slug?: string | null; name: string }): string {
  const slug = company.slug || generateSlug(company.name);
  return `/company/${slug}/${company.id}`;
}

export function getContactUrl(contact: { id: number; slug?: string | null; name: string }): string {
  const slug = contact.slug || generateSlug(contact.name);
  return `/p/${slug}/${contact.id}`;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .substring(0, 50)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

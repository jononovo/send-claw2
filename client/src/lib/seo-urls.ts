import type { Company, Contact } from "@shared/schema";

export function getCompanyUrl(company: { id: number; slug?: string | null; name: string }): string {
  const slug = company.slug || generateSlug(company.name);
  return `/company/${slug}/${company.id}`;
}

export function getContactUrl(contact: { id: number; slug?: string | null; name: string }): string {
  // Use stored slug (contains name+company+role) or generate from name as fallback
  const slug = contact.slug || generateContactSlug(contact.name);
  return `/p/${slug}/${contact.id}`;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .substring(0, 50)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateContactSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

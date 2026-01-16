/**
 * Sitemap Generator Module
 * 
 * Generates XML sitemaps for SEO purposes
 * Uses a sitemap index pattern with separate sitemaps for:
 * - Static pages
 * - Companies
 * - Contacts
 */

import { db } from "../../db";
import { companies, contacts, searchLists } from "@shared/schema";
import { generateCompanySlug, generateContactSlug } from "../../utils/slug-generator";

/**
 * Generate a URL-friendly slug from a search prompt
 */
function generateSearchSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

const BASE_URL = 'https://5ducks.ai';

interface SitemapUrl {
  loc: string;
  changefreq: string;
  priority: number;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUrlElements(urls: SitemapUrl[]): string {
  return urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');
}

function wrapInUrlset(urlElements: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Generate the sitemap index pointing to all child sitemaps
 */
export function generateSitemapIndex(): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-companies.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-contacts.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-searches.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Generate sitemap for static pages
 */
export function generatePagesSitemap(): string {
  const staticUrls: SitemapUrl[] = [
    { loc: BASE_URL, changefreq: 'monthly', priority: 1.0 },
    { loc: `${BASE_URL}/pricing`, changefreq: 'monthly', priority: 0.9 },
    { loc: `${BASE_URL}/blog`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/contact`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/login`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE_URL}/signup`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/terms`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${BASE_URL}/privacy`, changefreq: 'monthly', priority: 0.5 },
  ];

  return wrapInUrlset(generateUrlElements(staticUrls));
}

/**
 * Generate sitemap for all companies
 */
export async function generateCompaniesSitemap(): Promise<string> {
  const allCompanies = await db.select({
    id: companies.id,
    name: companies.name,
    slug: companies.slug
  }).from(companies);

  const companyUrls: SitemapUrl[] = allCompanies.map(company => {
    const slug = company.slug || generateCompanySlug(company.name);
    return {
      loc: `${BASE_URL}/company/${escapeXml(slug)}/${company.id}`,
      changefreq: 'weekly',
      priority: 0.7
    };
  });

  return wrapInUrlset(generateUrlElements(companyUrls));
}

/**
 * Generate sitemap for all contacts
 */
export async function generateContactsSitemap(): Promise<string> {
  const allContacts = await db.select({
    id: contacts.id,
    name: contacts.name,
    slug: contacts.slug
  }).from(contacts);

  const contactUrls: SitemapUrl[] = allContacts.map(contact => {
    const slug = contact.slug || generateContactSlug(contact.name);
    return {
      loc: `${BASE_URL}/p/${escapeXml(slug)}/${contact.id}`,
      changefreq: 'weekly',
      priority: 0.6
    };
  });

  return wrapInUrlset(generateUrlElements(contactUrls));
}

/**
 * Generate sitemap for all search lists
 */
export async function generateSearchesSitemap(): Promise<string> {
  const allLists = await db.select({
    listId: searchLists.listId,
    prompt: searchLists.prompt
  }).from(searchLists);

  const searchUrls: SitemapUrl[] = allLists.map(list => {
    const slug = generateSearchSlug(list.prompt);
    return {
      loc: `${BASE_URL}/search/${escapeXml(slug)}/${list.listId}`,
      changefreq: 'weekly',
      priority: 0.6
    };
  });

  return wrapInUrlset(generateUrlElements(searchUrls));
}

/**
 * @deprecated Use generateSitemapIndex() instead
 * Kept for backwards compatibility - now returns the sitemap index
 */
export async function generateSitemapXML(): Promise<string> {
  return generateSitemapIndex();
}

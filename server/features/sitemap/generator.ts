/**
 * Sitemap Generator Module
 * 
 * Generates XML sitemap for SEO purposes
 * Includes dynamic company and contact pages with SEO-friendly URLs
 */

import { db } from "../../db";
import { companies, contacts } from "@shared/schema";
import { generateCompanySlug, generateContactSlug } from "../../utils/slug-generator";

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

/**
 * Generate the sitemap XML content with all public pages
 */
export async function generateSitemapXML(): Promise<string> {
  const baseUrl = 'https://5ducks.ai';
  
  const staticUrls: SitemapUrl[] = [
    { loc: baseUrl, changefreq: 'monthly', priority: 1.0 },
    { loc: `${baseUrl}/pricing`, changefreq: 'monthly', priority: 0.9 },
    { loc: `${baseUrl}/blog`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${baseUrl}/login`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${baseUrl}/signup`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${baseUrl}/terms`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/privacy`, changefreq: 'monthly', priority: 0.5 },
  ];

  const allCompanies = await db.select({
    id: companies.id,
    name: companies.name,
    slug: companies.slug
  }).from(companies);

  const companyUrls: SitemapUrl[] = allCompanies.map(company => {
    const slug = company.slug || generateCompanySlug(company.name);
    return {
      loc: `${baseUrl}/company/${escapeXml(slug)}/${company.id}`,
      changefreq: 'weekly',
      priority: 0.7
    };
  });

  const allContacts = await db.select({
    id: contacts.id,
    name: contacts.name,
    slug: contacts.slug
  }).from(contacts);

  const contactUrls: SitemapUrl[] = allContacts.map(contact => {
    const slug = contact.slug || generateContactSlug(contact.name);
    return {
      loc: `${baseUrl}/p/${escapeXml(slug)}/${contact.id}`,
      changefreq: 'weekly',
      priority: 0.6
    };
  });

  const allUrls = [...staticUrls, ...companyUrls, ...contactUrls];

  const urlElements = allUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}


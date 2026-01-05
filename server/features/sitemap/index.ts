/**
 * Sitemap Feature Module
 * 
 * Handles XML sitemap generation for SEO
 * Uses sitemap index pattern with separate sitemaps for pages, companies, and contacts
 */

export { registerSitemapRoutes } from "./routes";
export { 
  generateSitemapIndex,
  generatePagesSitemap,
  generateCompaniesSitemap,
  generateContactsSitemap,
  generateSitemapXML 
} from "./generator";

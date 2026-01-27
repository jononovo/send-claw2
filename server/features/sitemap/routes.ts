/**
 * Sitemap Routes Module
 * 
 * Handles HTTP endpoints for sitemap generation and robots.txt
 * Uses sitemap index pattern with separate sitemaps for pages, companies, and contacts
 */

import { Express, Request, Response } from "express";
import { 
  generateSitemapIndex, 
  generatePagesSitemap, 
  generateCompaniesSitemap, 
  generateContactsSitemap,
  generateSearchesSitemap
} from "./generator";

/**
 * Register sitemap routes
 */
export function registerSitemapRoutes(app: Express): void {
  app.get('/sitemap.xml', handleSitemapIndexRequest);
  app.get('/sitemap-pages.xml', handlePagesSitemapRequest);
  app.get('/sitemap-companies.xml', handleCompaniesSitemapRequest);
  app.get('/sitemap-contacts.xml', handleContactsSitemapRequest);
  app.get('/sitemap-searches.xml', handleSearchesSitemapRequest);
  app.get('/robots.txt', handleRobotsRequest);
}

/**
 * Handle robots.txt request
 */
function handleRobotsRequest(req: Request, res: Response): void {
  const robotsTxt = `# 5Ducks Robots.txt

# Default rules for all bots
User-agent: *
Allow: /
Allow: /pricing
Allow: /contact
Allow: /blog
Allow: /terms
Allow: /privacy
Allow: /company/
Allow: /p/
Allow: /search/
Disallow: /app
Disallow: /lists
Disallow: /campaigns
Disallow: /api
Disallow: /outreach
Disallow: /home
Disallow: /admin
Disallow: /login
Disallow: /signup
Disallow: /auth

# Search engine crawlers - explicitly allowed
User-agent: Googlebot
Allow: /company/
Allow: /p/
Allow: /search/

User-agent: Bingbot
Allow: /company/
Allow: /p/
Allow: /search/

User-agent: DuckDuckBot
Allow: /company/
Allow: /p/
Allow: /search/

# AI bots - allowed to index public content
User-agent: GPTBot
Allow: /company/
Allow: /p/
Allow: /search/
Disallow: /app
Disallow: /api

User-agent: Claude-Web
Allow: /company/
Allow: /p/
Allow: /search/
Disallow: /app
Disallow: /api

User-agent: Anthropic-AI
Allow: /company/
Allow: /p/
Allow: /search/
Disallow: /app
Disallow: /api

# SEO tool bots - blocked (competitive scraping)
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

# Scraper bots - blocked
User-agent: MegaIndex
Disallow: /

User-agent: SeznamBot
Disallow: /

User-agent: YandexBot
Disallow: /

Sitemap: https://5ducks.ai/sitemap.xml
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
}

/**
 * Handle sitemap index request - main entry point
 */
function handleSitemapIndexRequest(req: Request, res: Response): void {
  try {
    const xml = generateSitemapIndex();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Handle static pages sitemap request
 */
function handlePagesSitemapRequest(req: Request, res: Response): void {
  try {
    const xml = generatePagesSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating pages sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Handle companies sitemap request
 */
async function handleCompaniesSitemapRequest(req: Request, res: Response): Promise<void> {
  try {
    const xml = await generateCompaniesSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating companies sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Handle contacts sitemap request
 */
async function handleContactsSitemapRequest(req: Request, res: Response): Promise<void> {
  try {
    const xml = await generateContactsSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating contacts sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Handle searches sitemap request
 */
async function handleSearchesSitemapRequest(req: Request, res: Response): Promise<void> {
  try {
    const xml = await generateSearchesSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating searches sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

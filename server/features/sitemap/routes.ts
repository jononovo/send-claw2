/**
 * Sitemap Routes Module
 * 
 * Handles HTTP endpoints for sitemap generation and robots.txt
 */

import { Express, Request, Response } from "express";
import { generateSitemapXML } from "./generator";

/**
 * Register sitemap routes
 */
export function registerSitemapRoutes(app: Express): void {
  app.get('/sitemap.xml', handleSitemapRequest);
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
Allow: /login
Allow: /signup
Allow: /terms
Allow: /privacy
Allow: /company/
Allow: /p/
Disallow: /app
Disallow: /lists
Disallow: /campaigns
Disallow: /api
Disallow: /outreach
Disallow: /home
Disallow: /admin

# Search engine crawlers - explicitly allowed
User-agent: Googlebot
Allow: /company/
Allow: /p/

User-agent: Bingbot
Allow: /company/
Allow: /p/

User-agent: DuckDuckBot
Allow: /company/
Allow: /p/

# AI bots - allowed to index public content
User-agent: GPTBot
Allow: /company/
Allow: /p/
Disallow: /app
Disallow: /api

User-agent: Claude-Web
Allow: /company/
Allow: /p/
Disallow: /app
Disallow: /api

User-agent: Anthropic-AI
Allow: /company/
Allow: /p/
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
 * Handle sitemap generation request
 */
async function handleSitemapRequest(req: Request, res: Response): Promise<void> {
  try {
    const xml = await generateSitemapXML();
    
    // Set appropriate headers for XML response
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}
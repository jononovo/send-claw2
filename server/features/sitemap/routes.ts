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
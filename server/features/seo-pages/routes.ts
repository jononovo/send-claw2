import { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { db } from "../../db";
import { companies, contacts, searchLists } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateCompanySlug, generateContactSlug } from "../../utils/slug-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://5ducks.ai";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 10000;

interface CacheEntry {
  slug: string;
  expires: number;
}

const slugCache = new Map<string, CacheEntry>();

function pruneCache(): void {
  if (slugCache.size <= MAX_CACHE_SIZE) return;

  const now = Date.now();
  const entries = Array.from(slugCache.entries());

  for (const [key, entry] of entries) {
    if (entry.expires < now) {
      slugCache.delete(key);
    }
  }

  if (slugCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries.sort((a, b) => a[1].expires - b[1].expires);
    const toDelete = sortedEntries.slice(0, slugCache.size - MAX_CACHE_SIZE + 1000);
    for (const [key] of toDelete) {
      slugCache.delete(key);
    }
  }
}

function generateSearchSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function getCompanySlug(id: number): Promise<string | null> {
  const cacheKey = `company:${id}`;
  const now = Date.now();

  const cached = slugCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.slug;
  }

  try {
    const result = await db
      .select({ slug: companies.slug, name: companies.name })
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const slug = result[0].slug || generateCompanySlug(result[0].name);
    pruneCache();
    slugCache.set(cacheKey, { slug, expires: now + CACHE_TTL_MS });
    return slug;
  } catch (error) {
    console.error(`Error fetching company slug for id ${id}:`, error);
    return null;
  }
}

async function getContactSlug(id: number): Promise<string | null> {
  const cacheKey = `contact:${id}`;
  const now = Date.now();

  const cached = slugCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.slug;
  }

  try {
    const result = await db
      .select({
        slug: contacts.slug,
        name: contacts.name,
        companyId: contacts.companyId,
      })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (result.length === 0) return null;

    let slug = result[0].slug;
    if (!slug) {
      let companyName: string | null = null;
      if (result[0].companyId) {
        const companyResult = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, result[0].companyId))
          .limit(1);
        if (companyResult.length > 0) {
          companyName = companyResult[0].name;
        }
      }
      slug = generateContactSlug(result[0].name, companyName);
    }

    pruneCache();
    slugCache.set(cacheKey, { slug, expires: now + CACHE_TTL_MS });
    return slug;
  } catch (error) {
    console.error(`Error fetching contact slug for id ${id}:`, error);
    return null;
  }
}

async function getSearchSlug(listId: number): Promise<string | null> {
  const cacheKey = `search:${listId}`;
  const now = Date.now();

  const cached = slugCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.slug;
  }

  try {
    const result = await db
      .select({ prompt: searchLists.prompt })
      .from(searchLists)
      .where(eq(searchLists.listId, listId))
      .limit(1);

    if (result.length === 0) return null;

    const slug = generateSearchSlug(result[0].prompt);
    pruneCache();
    slugCache.set(cacheKey, { slug, expires: now + CACHE_TTL_MS });
    return slug;
  } catch (error) {
    console.error(`Error fetching search slug for listId ${listId}:`, error);
    return null;
  }
}

function injectCanonicalTag(html: string, canonicalUrl: string): string {
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;

  if (html.includes('rel="canonical"')) {
    return html.replace(/<link[^>]*rel="canonical"[^>]*>/i, canonicalTag);
  }

  return html.replace("</head>", `  ${canonicalTag}\n  </head>`);
}

async function getHtmlTemplate(): Promise<string> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const clientTemplate = path.resolve(__dirname, "..", "..", "..", "client", "index.html");
    return await fs.promises.readFile(clientTemplate, "utf-8");
  } else {
    const distPath = path.resolve(__dirname, "..", "public", "index.html");
    return await fs.promises.readFile(distPath, "utf-8");
  }
}

export function registerSeoPageRoutes(app: Express): void {
  app.get("/company/:slug/:id", async (req: Request, res: Response, next) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return next();
    }

    try {
      const slug = await getCompanySlug(id);
      if (!slug) {
        return next();
      }

      const canonicalUrl = `${BASE_URL}/company/${slug}/${id}`;
      let html = await getHtmlTemplate();
      html = injectCanonicalTag(html, canonicalUrl);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("Error serving company SEO page:", error);
      next();
    }
  });

  app.get("/p/:slug/:id", async (req: Request, res: Response, next) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return next();
    }

    try {
      const slug = await getContactSlug(id);
      if (!slug) {
        return next();
      }

      const canonicalUrl = `${BASE_URL}/p/${slug}/${id}`;
      let html = await getHtmlTemplate();
      html = injectCanonicalTag(html, canonicalUrl);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("Error serving contact SEO page:", error);
      next();
    }
  });

  app.get("/search/:slug/:listId", async (req: Request, res: Response, next) => {
    const listId = parseInt(req.params.listId, 10);

    if (isNaN(listId)) {
      return next();
    }

    try {
      const slug = await getSearchSlug(listId);
      if (!slug) {
        return next();
      }

      const canonicalUrl = `${BASE_URL}/search/${slug}/${listId}`;
      let html = await getHtmlTemplate();
      html = injectCanonicalTag(html, canonicalUrl);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("Error serving search SEO page:", error);
      next();
    }
  });
}

export function clearSeoPageCache(): void {
  slugCache.clear();
}

export function getSeoPageCacheStats(): { size: number; maxSize: number } {
  return {
    size: slugCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

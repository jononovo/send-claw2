import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { db } from "./db";
import { companies, contacts, searchLists } from "@shared/schema";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viteLogger = createLogger();

const BASE_URL = "https://5ducks.ai";

// Canonical URL cache with 1-hour TTL
const canonicalCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Generate a URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Get canonical URL for SEO pages (with caching)
 */
async function getCanonicalUrl(url: string): Promise<string | null> {
  // Check cache first
  const cached = canonicalCache.get(url);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }

  try {
    let canonicalUrl: string | null = null;

    // Match /company/:slug/:id
    const companyMatch = url.match(/^\/company\/[^/]+\/(\d+)/);
    if (companyMatch) {
      const id = parseInt(companyMatch[1], 10);
      const [company] = await db
        .select({ slug: companies.slug, name: companies.name })
        .from(companies)
        .where(eq(companies.id, id))
        .limit(1);
      if (company) {
        const slug = company.slug || generateSlug(company.name);
        canonicalUrl = `${BASE_URL}/company/${slug}/${id}`;
      }
    }

    // Match /p/:slug/:id (contacts)
    const contactMatch = url.match(/^\/p\/[^/]+\/(\d+)/);
    if (contactMatch) {
      const id = parseInt(contactMatch[1], 10);
      const [contact] = await db
        .select({ slug: contacts.slug, name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
      if (contact) {
        const slug = contact.slug || generateSlug(contact.name);
        canonicalUrl = `${BASE_URL}/p/${slug}/${id}`;
      }
    }

    // Match /search/:slug/:listId
    const searchMatch = url.match(/^\/search\/[^/]+\/(\d+)/);
    if (searchMatch) {
      const listId = parseInt(searchMatch[1], 10);
      const [list] = await db
        .select({ prompt: searchLists.prompt })
        .from(searchLists)
        .where(eq(searchLists.listId, listId))
        .limit(1);
      if (list) {
        const slug = generateSlug(list.prompt);
        canonicalUrl = `${BASE_URL}/search/${slug}/${listId}`;
      }
    }

    // Cache the result
    if (canonicalUrl) {
      canonicalCache.set(url, { url: canonicalUrl, expires: Date.now() + CACHE_TTL });
    }

    return canonicalUrl;
  } catch (error) {
    console.error("Error fetching canonical URL:", error);
    return null;
  }
}

/**
 * Inject canonical tag into HTML
 */
function injectCanonical(html: string, canonicalUrl: string): string {
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;

  // Replace existing canonical if present, otherwise insert before </head>
  if (html.includes('rel="canonical"')) {
    return html.replace(/<link[^>]*rel="canonical"[^>]*>/i, canonicalTag);
  }
  return html.replace("</head>", `  ${canonicalTag}\n  </head>`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      let page = await vite.transformIndexHtml(url, template);

      // Inject canonical tag for SEO pages
      const canonicalUrl = await getCanonicalUrl(url);
      if (canonicalUrl) {
        page = injectCanonical(page, canonicalUrl);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    try {
      let html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");

      // Inject canonical tag for SEO pages
      const canonicalUrl = await getCanonicalUrl(req.originalUrl);
      if (canonicalUrl) {
        html = injectCanonical(html, canonicalUrl);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("Error serving static HTML:", error);
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
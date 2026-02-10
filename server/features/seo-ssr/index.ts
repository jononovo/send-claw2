import { Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "../../db";
import { companies, contacts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { seoRateLimiter } from "../../middleware/seo-rate-limiter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_URL = "https://5ducks.ai";

const seoCache = new Map<string, { html: string; expires: number }>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface SEOData {
  canonicalUrl: string;
  title: string;
  description: string;
  jsonLd: Record<string, any>;
  serverHtml: string;
}

function injectSEO(html: string, seo: SEOData): string {
  const headTags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}" />`,
    `<link rel="canonical" href="${seo.canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeAttr(seo.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}" />`,
    `<meta property="og:url" content="${seo.canonicalUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:image" content="https://5ducks.ai/images/og-image.webp" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`,
    `<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n  ");

  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta\s+name="description"[^>]*>/i, "");
  html = html.replace(/<meta\s+property="og:title"[^>]*>/i, "");
  html = html.replace(/<meta\s+property="og:description"[^>]*>/i, "");
  html = html.replace(/<meta\s+property="og:url"[^>]*>/i, "");
  html = html.replace(/<meta\s+property="og:type"[^>]*>/i, "");
  html = html.replace(/<meta\s+property="og:image"[^>]*>/gi, "");
  html = html.replace(/<meta\s+property="og:image:width"[^>]*>/gi, "");
  html = html.replace(/<meta\s+property="og:image:height"[^>]*>/gi, "");
  html = html.replace(/<meta\s+property="og:site_name"[^>]*>/gi, "");
  html = html.replace(/<meta\s+name="twitter:card"[^>]*>/i, "");
  html = html.replace(/<meta\s+name="twitter:title"[^>]*>/i, "");
  html = html.replace(/<meta\s+name="twitter:description"[^>]*>/i, "");
  html = html.replace(/<meta\s+name="twitter:image"[^>]*>/i, "");
  html = html.replace(/<link[^>]*rel="canonical"[^>]*>/i, "");

  html = html.replace("</head>", `  ${headTags}\n  </head>`);

  if (seo.serverHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${seo.serverHtml}`);
  }

  return html;
}

async function getCompanySEO(id: number): Promise<SEOData | null> {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) return null;

  const companyContacts = await db.select().from(contacts).where(eq(contacts.companyId, id));
  const slug = company.slug || generateSlug(company.name);
  const canonicalUrl = `${BASE_URL}/company/${slug}/${id}`;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": company.name,
    "description": company.description || `${company.name} company profile`,
    "url": company.website || canonicalUrl,
  };
  if (company.size) {
    jsonLd.numberOfEmployees = { "@type": "QuantitativeValue", "value": company.size };
  }

  let html = `<div id="seo-server-content" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true">`;
  html += `<h1>${escapeHtml(company.name)} - Company Profile</h1>`;
  if (company.description) html += `<p>${escapeHtml(company.description)}</p>`;
  if (company.website) html += `<p>Website: ${escapeHtml(company.website)}</p>`;
  if (company.size) html += `<p>Company Size: ${company.size} employees</p>`;
  if (company.services && company.services.length > 0) {
    html += `<h2>Services</h2><ul>${company.services.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
  }
  if (company.validationPoints && company.validationPoints.length > 0) {
    html += `<h2>Validation Points</h2><ul>${company.validationPoints.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`;
  }
  if (companyContacts.length > 0) {
    html += `<h2>Key Contacts at ${escapeHtml(company.name)}</h2>`;
    html += `<table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th>Location</th></tr></thead><tbody>`;
    for (const c of companyContacts) {
      html += `<tr>`;
      html += `<td>${escapeHtml(c.name)}</td>`;
      html += `<td>${escapeHtml(c.role || "")}</td>`;
      html += `<td>${c.email ? escapeHtml(c.email) : ""}</td>`;
      html += `<td>${escapeHtml(c.department || "")}</td>`;
      html += `<td>${escapeHtml(c.location || "")}</td>`;
      html += `</tr>`;
    }
    html += `</tbody></table>`;
  }
  if (company.alternativeProfileUrl) {
    html += `<p>Profile: ${escapeHtml(company.alternativeProfileUrl)}</p>`;
  }
  if (company.age) {
    html += `<p>Company Age: ${company.age} years</p>`;
  }
  html += `</div>`;

  const descParts = [company.name];
  if (company.size) descParts.push(`${company.size} employees`);
  if (company.services && company.services.length > 0) descParts.push(company.services.slice(0, 3).join(", "));
  if (companyContacts.length > 0) descParts.push(`${companyContacts.length} key contacts`);
  const metaDesc = descParts.join(" - ") + ". View full company profile on 5Ducks.";

  return {
    canonicalUrl,
    title: `${company.name} - Company Profile | 5Ducks`,
    description: metaDesc.substring(0, 160),
    jsonLd,
    serverHtml: html,
  };
}

async function getContactSEO(id: number): Promise<SEOData | null> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) return null;

  let company: any = null;
  if (contact.companyId) {
    const [c] = await db.select().from(companies).where(eq(companies.id, contact.companyId)).limit(1);
    company = c || null;
  }

  const slug = contact.slug || generateSlug(contact.name + (company ? `-${company.name}` : ""));
  const canonicalUrl = `${BASE_URL}/p/${slug}/${id}`;
  const roleAtCompany = `${contact.role || "Professional"}${company ? ` at ${company.name}` : ""}`;
  const title = `${contact.name} - ${roleAtCompany}`;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": contact.name,
  };
  if (contact.role) jsonLd.jobTitle = contact.role;
  if (company) jsonLd.worksFor = { "@type": "Organization", "name": company.name };

  let html = `<div id="seo-server-content" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true">`;
  html += `<h1>${escapeHtml(contact.name)}</h1>`;
  html += `<p>${escapeHtml(roleAtCompany)}</p>`;
  if (contact.email) html += `<p>Email: ${escapeHtml(contact.email)}</p>`;
  if (contact.phoneNumber) html += `<p>Phone: ${escapeHtml(contact.phoneNumber)}</p>`;
  if (contact.department) html += `<p>Department: ${escapeHtml(contact.department)}</p>`;
  if (contact.location) html += `<p>Location: ${escapeHtml(contact.location)}</p>`;
  if (contact.linkedinUrl) html += `<p>LinkedIn: ${escapeHtml(contact.linkedinUrl)}</p>`;
  if (contact.twitterHandle) html += `<p>Twitter: @${escapeHtml(contact.twitterHandle)}</p>`;
  if (company) {
    html += `<h2>Company: ${escapeHtml(company.name)}</h2>`;
    if (company.description) html += `<p>${escapeHtml(company.description)}</p>`;
    if (company.size) html += `<p>${company.size} employees</p>`;
    if (company.website) html += `<p>Website: ${escapeHtml(company.website)}</p>`;
    if (company.services && company.services.length > 0) {
      html += `<p>Services: ${company.services.map((s: string) => escapeHtml(s)).join(", ")}</p>`;
    }
  }
  html += `</div>`;

  const descParts = [`Contact profile for ${contact.name}`, roleAtCompany];
  if (contact.email) descParts.push(contact.email);
  if (contact.location) descParts.push(contact.location);
  const metaDesc = descParts.join(". ") + ". Find professional contact information on 5Ducks.";

  return {
    canonicalUrl,
    title: `${title} | 5Ducks`,
    description: metaDesc.substring(0, 160),
    jsonLd,
    serverHtml: html,
  };
}

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

async function getTemplate(): Promise<string> {
  const templatePath = path.resolve(PROJECT_ROOT, "client", "index.html");
  return fs.promises.readFile(templatePath, "utf-8");
}

export function registerSEOSSRMiddleware(app: Express): void {
  app.get("/company/:slug/:id", seoRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return next();

      const cacheKey = `/company/${id}`;
      const cached = seoCache.get(cacheKey);
      if (cached && Date.now() < cached.expires) {
        res.status(200).set({ "Content-Type": "text/html" }).end(cached.html);
        return;
      }

      const seo = await getCompanySEO(id);
      if (!seo) return next();

      const template = await getTemplate();
      const page = injectSEO(template, seo);

      seoCache.set(cacheKey, { html: page, expires: Date.now() + CACHE_TTL });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      console.error("[SEO-SSR] Error serving company page:", error);
      next();
    }
  });

  app.get("/p/:slug/:id", seoRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return next();

      const cacheKey = `/p/${id}`;
      const cached = seoCache.get(cacheKey);
      if (cached && Date.now() < cached.expires) {
        res.status(200).set({ "Content-Type": "text/html" }).end(cached.html);
        return;
      }

      const seo = await getContactSEO(id);
      if (!seo) return next();

      const template = await getTemplate();
      const page = injectSEO(template, seo);

      seoCache.set(cacheKey, { html: page, expires: Date.now() + CACHE_TTL });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      console.error("[SEO-SSR] Error serving contact page:", error);
      next();
    }
  });

  console.log("[SEO-SSR] Server-side rendering middleware registered for /company/:slug/:id and /p/:slug/:id");
}

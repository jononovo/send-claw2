# Technical Recommendation: SEO Page Structure & Sitemap Rebuild

## Executive Summary

This document outlines the recommended changes to 5Ducks' URL structure and sitemap to enable SEO indexing of company and contact data. The goal is to create SEO-friendly URLs that can be crawled by search engines while gating sensitive data (emails) behind authentication.

**Key Decision:** Same URLs serve both public (logged out) and private (logged in) views — no separate routes needed.

---

## Current State Analysis

### Sitemap (`server/features/sitemap/generator.ts`)
- **Static only**: Hard-coded list of 11 pages
- **No database integration**: Doesn't query companies/contacts
- **No individual pages**: Only lists route shells like `/contacts`, not individual records

### Routes (`client/src/App.tsx`)
| Route | Current URL | Auth | SEO Indexable |
|-------|-------------|------|---------------|
| Company detail | `/companies/:id` | Semi-protected | ❌ No (numeric ID only) |
| Contact detail | `/contacts/:id` | Protected | ❌ No (requires login) |

### Database Schema (`shared/schema.ts`)
- **No slug fields**: Companies and contacts identified only by numeric `id`
- **Duplicates exist**: Same company/contact can exist multiple times across different searches
- **User-scoped data**: All records tied to `userId`

---

## Recommended Architecture

### URL Structure

```
/company/{slug}/{id}
/p/{slug}/{id}
```

**Examples:**
```
/company/acme-corp/4521
/company/stripe-payments/892
/p/john-smith-acme-ceo/12847
/p/jane-doe-stripe-cto/9283
```

### Full Site Structure

```
5ducks.ai/
├── /                                    # Homepage
├── /pricing                             # Pricing
├── /blog                                # Blog
│
├── /company/{slug}/{id}                 # Individual company page
│   ├── /company/acme-corp/4521
│   ├── /company/stripe-payments/892
│   └── ...
│
├── /p/{slug}/{id}                       # Individual person/contact page
│   ├── /p/john-smith-acme-ceo/12847
│   ├── /p/jane-doe-stripe-cto/9283
│   └── ...
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separate public/private routes? | **No** | Same URL, different view based on auth state |
| Prefix like `/directory/`? | **No** | Direct paths are cleaner and shorter |
| Company path | `/company/` | Singular, clear |
| Contact path | `/p/` | Short, like ZoomInfo |
| Include ID in URL? | **Yes** | Required — duplicates exist in database |
| ID position | **End** | Clean separation: `/company/slug/id` |
| Slug purpose | **SEO only** | ID is source of truth for lookups |

### Why ID is Required

The database allows duplicate companies/contacts:
- User A searches "AI startups" → Creates "Acme Corp" (id: 1)
- User A searches again → Creates "Acme Corp" (id: 2)  
- User B searches → Creates "Acme Corp" (id: 3)

Without ID, we'd have:
```
/company/acme-corp
/company/acme-corp-2
/company/acme-corp-47   ← Ridiculous
```

With ID:
```
/company/acme-corp/1
/company/acme-corp/2
/company/acme-corp/3    ← All valid, all unique
```

### Slug is Cosmetic (ID is Source of Truth)

Following Stack Overflow's pattern:
```
/company/acme-corp/123     ← Canonical URL
/company/anything/123      ← Still works (ID is what matters)
/company/123               ← Optional: redirect to canonical
```

---

## Implementation Plan

### Phase 1: Database Schema Updates

**File: `shared/schema.ts`**

Add slug field to companies and contacts:

```typescript
export const companies = pgTable("companies", {
  // ... existing fields ...
  
  // NEW: SEO field
  slug: text("slug"),  // e.g., "acme-corp" (not unique - ID handles uniqueness)
}, (table) => [
  // ... existing indexes ...
  index('idx_companies_slug').on(table.slug),
]);

export const contacts = pgTable("contacts", {
  // ... existing fields ...
  
  // NEW: SEO field
  slug: text("slug"),  // e.g., "john-smith-acme-ceo"
}, (table) => [
  // ... existing indexes ...
  index('idx_contacts_slug').on(table.slug),
]);
```

**Note:** Slug is NOT unique — the ID guarantees uniqueness. Slug is purely for SEO/readability.

### Phase 2: Slug Generation Utility

**File: `server/utils/slug-generator.ts`**

```typescript
/**
 * Generate URL-safe slug from company name
 * Example: "Acme Corp, Inc." → "acme-corp-inc"
 */
export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/-+/g, '-')          // Collapse multiple dashes
    .replace(/^-|-$/g, '')        // Trim leading/trailing dashes
    .substring(0, 50);            // Limit length
}

/**
 * Generate URL-safe slug for contact
 * Format: "firstname-lastname-company-role"
 * Example: "John Smith" at "Acme Corp" as "CEO" → "john-smith-acme-ceo"
 */
export function generateContactSlug(
  name: string, 
  companyName?: string, 
  role?: string
): string {
  const parts = [name];
  
  if (companyName) {
    // Just first word of company to keep it short
    const companyShort = companyName.split(/\s+/)[0];
    parts.push(companyShort);
  }
  
  if (role) {
    // Simplify role: "Chief Executive Officer" → "ceo"
    const roleShort = role.replace(/chief\s*/i, '').replace(/officer\s*/i, '');
    parts.push(roleShort);
  }
  
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
```

### Phase 3: Backend Routes

**File: `server/features/seo-pages/routes.ts`**

```typescript
import { Express, Request, Response } from "express";
import { db } from "../../db";
import { companies, contacts } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerSeoPageRoutes(app: Express): void {
  
  /**
   * GET /api/company/:slug/:id
   * Public company data - works for logged in and logged out users
   */
  app.get('/api/company/:slug/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check if slug matches, redirect if not (for SEO canonical URLs)
    const expectedSlug = company.slug || generateCompanySlug(company.name);
    if (req.params.slug !== expectedSlug) {
      return res.redirect(301, `/company/${expectedSlug}/${id}`);
    }
    
    // Get contacts for this company
    const companyContacts = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        role: contacts.role,
        slug: contacts.slug,
        // Conditionally include email based on auth
        ...(req.isAuthenticated() ? { email: contacts.email } : {}),
      })
      .from(contacts)
      .where(eq(contacts.companyId, id));
    
    // Return different data based on auth state
    const isLoggedIn = req.isAuthenticated();
    
    res.json({
      id: company.id,
      name: company.name,
      slug: expectedSlug,
      description: company.description,
      website: company.website,
      size: company.size,
      contacts: companyContacts.map(c => ({
        id: c.id,
        name: c.name,
        role: c.role,
        slug: c.slug || generateContactSlug(c.name, company.name, c.role),
        email: isLoggedIn ? c.email : null,  // Gated
        emailTeaser: !isLoggedIn && c.email ? maskEmail(c.email) : null,
      })),
      isLoggedIn,
    });
  });
  
  /**
   * GET /api/p/:slug/:id
   * Public contact/person data
   */
  app.get('/api/p/:slug/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get company info
    let company = null;
    if (contact.companyId) {
      [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, contact.companyId))
        .limit(1);
    }
    
    const expectedSlug = contact.slug || generateContactSlug(
      contact.name, 
      company?.name, 
      contact.role
    );
    
    // Redirect to canonical URL if slug doesn't match
    if (req.params.slug !== expectedSlug) {
      return res.redirect(301, `/p/${expectedSlug}/${id}`);
    }
    
    const isLoggedIn = req.isAuthenticated();
    
    res.json({
      id: contact.id,
      name: contact.name,
      slug: expectedSlug,
      role: contact.role,
      department: contact.department,
      location: contact.location,
      linkedinUrl: isLoggedIn ? contact.linkedinUrl : null,
      email: isLoggedIn ? contact.email : null,
      emailTeaser: !isLoggedIn && contact.email ? maskEmail(contact.email) : null,
      company: company ? {
        id: company.id,
        name: company.name,
        slug: company.slug || generateCompanySlug(company.name),
      } : null,
      isLoggedIn,
    });
  });
}

/**
 * Mask email for teaser display
 * "john.smith@acme.com" → "j***@acme.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain}`;
}
```

### Phase 4: Frontend Routes & Pages

**File: `client/src/App.tsx`** — Add new routes:

```tsx
{/* SEO-friendly company and contact pages */}
<Route path="/company/:slug/:id" component={() => 
  <Suspense fallback={<LoadingScreen message="Loading company..." />}>
    <CompanyPage />
  </Suspense>
} />
<Route path="/p/:slug/:id" component={() => 
  <Suspense fallback={<LoadingScreen message="Loading contact..." />}>
    <PersonPage />
  </Suspense>
} />
```

**File: `client/src/pages/CompanyPage.tsx`**

```tsx
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";

export default function CompanyPage() {
  const [, params] = useRoute("/company/:slug/:id");
  const { slug, id } = params || {};
  
  const { data: company, isLoading } = useQuery({
    queryKey: [`/api/company/${slug}/${id}`],
    enabled: !!id,
  });
  
  if (isLoading) return <LoadingScreen />;
  if (!company) return <NotFound />;
  
  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{company.name} - Company Profile | 5Ducks</title>
        <meta name="description" content={
          company.description?.substring(0, 155) || 
          `Find contacts and emails for ${company.name}. Connect with decision makers.`
        } />
        <link rel="canonical" href={`https://5ducks.ai/company/${company.slug}/${company.id}`} />
      </Helmet>
      
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold">{company.name}</h1>
        
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener noreferrer">
            {company.website}
          </a>
        )}
        
        {company.description && (
          <p className="mt-4 text-gray-600">{company.description}</p>
        )}
        
        {/* Contacts Section */}
        <h2 className="text-2xl font-semibold mt-8">Key Contacts</h2>
        
        <div className="grid gap-4 mt-4">
          {company.contacts?.map(contact => (
            <div key={contact.id} className="border rounded p-4">
              <Link href={`/p/${contact.slug}/${contact.id}`}>
                <h3 className="font-medium">{contact.name}</h3>
              </Link>
              <p className="text-gray-500">{contact.role}</p>
              
              {/* Email: Show full if logged in, teaser if not */}
              {company.isLoggedIn ? (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{contact.emailTeaser}</span>
                  <Button size="sm" onClick={openSignupModal}>
                    Sign up to reveal
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

**File: `client/src/pages/PersonPage.tsx`**

```tsx
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";

export default function PersonPage() {
  const [, params] = useRoute("/p/:slug/:id");
  const { slug, id } = params || {};
  
  const { data: person, isLoading } = useQuery({
    queryKey: [`/api/p/${slug}/${id}`],
    enabled: !!id,
  });
  
  if (isLoading) return <LoadingScreen />;
  if (!person) return <NotFound />;
  
  const title = person.company 
    ? `${person.name} - ${person.role} at ${person.company.name}`
    : `${person.name} - ${person.role}`;
  
  return (
    <>
      <Helmet>
        <title>{title} | 5Ducks</title>
        <meta name="description" content={
          `Contact ${person.name}, ${person.role}${person.company ? ` at ${person.company.name}` : ''}. Find verified email and connect.`
        } />
        <link rel="canonical" href={`https://5ducks.ai/p/${person.slug}/${person.id}`} />
      </Helmet>
      
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold">{person.name}</h1>
        <p className="text-xl text-gray-600">{person.role}</p>
        
        {person.company && (
          <Link href={`/company/${person.company.slug}/${person.company.id}`}>
            <p className="text-blue-600 hover:underline">
              {person.company.name}
            </p>
          </Link>
        )}
        
        {/* Email Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Contact Information</h2>
          
          {person.isLoggedIn ? (
            <>
              {person.email && (
                <p>
                  <span className="text-gray-500">Email:</span>{' '}
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                </p>
              )}
              {person.linkedinUrl && (
                <p>
                  <span className="text-gray-500">LinkedIn:</span>{' '}
                  <a href={person.linkedinUrl} target="_blank">View Profile</a>
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-2">
                Email: {person.emailTeaser || '***@***.com'}
              </p>
              <Button onClick={openSignupModal}>
                Sign up free to reveal contact info
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

### Phase 5: Dynamic Sitemap

**File: `server/features/sitemap/generator.ts`**

```typescript
import { db } from "../../db";
import { companies, contacts } from "@shared/schema";
import { generateCompanySlug, generateContactSlug } from "../../utils/slug-generator";

export async function generateSitemapXML(): Promise<string> {
  const baseUrl = 'https://5ducks.ai';
  
  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'monthly' },
    { loc: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
  ];
  
  // Dynamic: All companies
  const allCompanies = await db
    .select({ 
      id: companies.id, 
      name: companies.name, 
      slug: companies.slug 
    })
    .from(companies);
  
  const companyPages = allCompanies.map(c => ({
    loc: `/company/${c.slug || generateCompanySlug(c.name)}/${c.id}`,
    priority: '0.6',
    changefreq: 'weekly'
  }));
  
  // Dynamic: All contacts with email (higher value for SEO)
  const allContacts = await db
    .select({ 
      id: contacts.id, 
      name: contacts.name, 
      role: contacts.role,
      slug: contacts.slug,
      companyId: contacts.companyId,
    })
    .from(contacts);
  
  // Get company names for slug generation
  const companyMap = new Map(
    allCompanies.map(c => [c.id, c.name])
  );
  
  const contactPages = allContacts.map(c => {
    const companyName = c.companyId ? companyMap.get(c.companyId) : undefined;
    const slug = c.slug || generateContactSlug(c.name, companyName, c.role);
    return {
      loc: `/p/${slug}/${c.id}`,
      priority: '0.5',
      changefreq: 'weekly'
    };
  });
  
  // Combine all URLs
  const allUrls = [...staticPages, ...companyPages, ...contactPages];
  
  // Generate XML
  const urlEntries = allUrls.map(u => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}
```

### Phase 6: Sitemap Index (For Large Datasets)

If you have >50,000 URLs, split into multiple sitemaps:

**File: `server/features/sitemap/index-generator.ts`**

```typescript
export async function generateSitemapIndex(): Promise<string> {
  const baseUrl = 'https://5ducks.ai';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-companies.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-contacts.xml</loc>
  </sitemap>
</sitemapindex>`;
}
```

---

## Updated robots.txt

```txt
User-agent: *
Allow: /
Allow: /company/
Allow: /p/

Disallow: /api/
Disallow: /app/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /account/
Disallow: /streak/
Disallow: /campaigns/
Disallow: /outreach/
Disallow: /companies/
Disallow: /contacts/

Sitemap: https://5ducks.ai/sitemap.xml
```

**Note:** We block `/companies/` and `/contacts/` (old routes with numeric IDs) and allow `/company/` and `/p/` (new SEO-friendly routes).

---

## Migration: Old Routes to New Routes

Add redirects from old URLs to new SEO-friendly URLs:

**File: `server/routes.ts`**

```typescript
// Redirect old numeric routes to new SEO routes
app.get('/companies/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('Not found');
  
  const [company] = await db
    .select({ name: companies.name, slug: companies.slug })
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  
  if (!company) return res.status(404).send('Not found');
  
  const slug = company.slug || generateCompanySlug(company.name);
  res.redirect(301, `/company/${slug}/${id}`);
});

app.get('/contacts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('Not found');
  
  const [contact] = await db
    .select({ 
      name: contacts.name, 
      slug: contacts.slug,
      role: contacts.role,
      companyId: contacts.companyId 
    })
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  
  if (!contact) return res.status(404).send('Not found');
  
  // Get company name for slug
  let companyName;
  if (contact.companyId) {
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, contact.companyId))
      .limit(1);
    companyName = company?.name;
  }
  
  const slug = contact.slug || generateContactSlug(contact.name, companyName, contact.role);
  res.redirect(301, `/p/${slug}/${id}`);
});
```

---

## Data Migration: Generate Slugs for Existing Records

**File: `scripts/generate-slugs.ts`**

```typescript
import { db } from "../server/db";
import { companies, contacts } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateCompanySlug, generateContactSlug } from "../server/utils/slug-generator";

async function generateSlugsForExistingRecords() {
  console.log("Starting slug generation...");
  
  // Generate slugs for companies
  const allCompanies = await db.select().from(companies);
  console.log(`Processing ${allCompanies.length} companies...`);
  
  for (const company of allCompanies) {
    if (!company.slug) {
      const slug = generateCompanySlug(company.name);
      await db
        .update(companies)
        .set({ slug })
        .where(eq(companies.id, company.id));
    }
  }
  
  // Generate slugs for contacts
  const allContacts = await db.select().from(contacts);
  console.log(`Processing ${allContacts.length} contacts...`);
  
  // Build company name map
  const companyMap = new Map(
    allCompanies.map(c => [c.id, c.name])
  );
  
  for (const contact of allContacts) {
    if (!contact.slug) {
      const companyName = contact.companyId ? companyMap.get(contact.companyId) : undefined;
      const slug = generateContactSlug(contact.name, companyName, contact.role);
      await db
        .update(contacts)
        .set({ slug })
        .where(eq(contacts.id, contact.id));
    }
  }
  
  console.log("Slug generation complete!");
}

generateSlugsForExistingRecords().catch(console.error);
```

Run with: `npx tsx scripts/generate-slugs.ts`

---

## Implementation Priority

| Phase | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Add `slug` field to schema | Low | Foundation |
| 2 | Create slug generator utility | Low | Foundation |
| 3 | Add `/api/company/:slug/:id` and `/api/p/:slug/:id` routes | Medium | Enables SEO pages |
| 4 | Create frontend `CompanyPage` and `PersonPage` components | Medium | User-facing |
| 5 | Update sitemap to include dynamic URLs | Low | Discoverability |
| 6 | Update robots.txt | Low | Crawl control |
| 7 | Add redirects from old routes | Low | Preserve any existing links |
| 8 | Run slug migration script | Low | Populate existing data |

---

## Success Metrics

After implementation, monitor:

1. **Google Search Console**
   - Pages indexed at `/company/` and `/p/`
   - Impressions for company/contact name searches
   - Click-through rates

2. **Traffic**
   - Organic traffic to company/person pages
   - Conversion rate (visitor → signup)

3. **Crawl Stats**
   - Sitemap submission status
   - Crawl frequency

---

## Security Considerations

1. **Email Gating**: Never expose full email addresses to logged-out users
2. **Rate Limiting**: Add rate limits to public API endpoints
3. **Canonical URLs**: Redirect incorrect slugs to correct ones (ID is source of truth)
4. **User Privacy**: Consider GDPR/CCPA — may need opt-out mechanism for contacts

---

## Future Enhancements

1. **JSON-LD Schema Markup**: Add structured data for rich snippets
2. **Industry Landing Pages**: Create `/industry/saas` aggregation pages
3. **Location Landing Pages**: Create `/location/new-york` for local SEO
4. **Search/Browse Pages**: Add `/company` and `/p` index pages with pagination
5. **Backlink Outreach**: Contact listed companies to link to their profile

# Next.js Migration Plan (Hybrid Approach)

> **Estimated Time:** 1-2 weeks (single developer)  
> **Risk Level:** Low-Medium (keeping Express backend, but many provider/routing changes)  
> **Approach:** File-based routing with existing React components as Client Components

---

## Executive Summary

This migration keeps the Express backend running separately and migrates only the frontend from Vite+Wouter to Next.js App Router. The vast majority of code (components, hooks, features, queries) remains unchanged, but runs as **Client Components** since the app is heavily interactive.

### Key Architectural Decision
Since this app uses:
- 8 nested React context providers
- Client-side auth with Firebase
- TanStack Query for all data fetching
- Heavy client interactivity

The migration will use Next.js App Router with **Client Components** for the app shell. Server Components will only be used for truly static marketing pages.

---

## Phase 1: Project Setup (1-2 hours)

### 1.1 Create Next.js Project
```bash
npx create-next-app@latest client-next --typescript --tailwind --eslint --app --src-dir
```

### 1.2 Copy Configuration Files
| From | To | Notes |
|------|-----|-------|
| `tailwind.config.ts` | `client-next/tailwind.config.ts` | Keep existing config |
| `postcss.config.js` | `client-next/postcss.config.js` | Keep existing |
| `client/src/index.css` | `client-next/src/app/globals.css` | Theme variables |
| `theme.json` | `client-next/theme.json` | Shadcn theme |

### 1.3 Configure Path Aliases
Update `client-next/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Update `client-next/next.config.js`:
```js
const path = require('path');

module.exports = {
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.resolve(__dirname, '../shared');
    return config;
  },
  // Proxy API requests to Express backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};
```

### 1.4 Install Dependencies
```bash
cd client-next
npm install @tanstack/react-query @hookform/resolvers zod react-hook-form
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
# ... (all other dependencies from package.json)
npm install lucide-react framer-motion date-fns
npm install firebase
npm install class-variance-authority clsx tailwind-merge
```

---

## Phase 2: Copy Existing Code (2-3 hours)

### 2.1 Copy Directories (No Changes Needed)
These directories copy directly with no modifications:

```bash
# UI Components (Shadcn)
cp -r client/src/components/ui/ client-next/src/components/ui/

# Custom Components
cp -r client/src/components/*.tsx client-next/src/components/

# Features
cp -r client/src/features/ client-next/src/features/

# Hooks (except use-auth.tsx - see Phase 3)
cp client/src/hooks/use-toast.ts client-next/src/hooks/
cp client/src/hooks/use-mobile.tsx client-next/src/hooks/
cp client/src/hooks/use-theme.tsx client-next/src/hooks/
# ... all other hooks

# Contexts
cp -r client/src/contexts/ client-next/src/contexts/

# Lib utilities
cp -r client/src/lib/ client-next/src/lib/

# Services
cp -r client/src/services/ client-next/src/services/

# Shared schema
# Already aliased via tsconfig
```

### 2.2 Files Requiring Modifications
| File | Change Required |
|------|-----------------|
| `lib/firebase.ts` | Change `import.meta.env` → `process.env` |
| `hooks/use-auth.tsx` | Change `import.meta.env` → `process.env` |
| `lib/queryClient.ts` | Works as-is |
| `lib/protected-route.tsx` | Rewrite for Next.js middleware |

---

## Phase 3: Environment Variable Migration (30 mins)

### 3.1 Create Environment File
Create `client-next/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### 3.2 Update 2 Files

**File: `lib/firebase.ts`**
```typescript
// Before
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// After
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
```

**File: `hooks/use-auth.tsx`**
```typescript
// Before
environment: import.meta.env.MODE

// After
environment: process.env.NODE_ENV
```

---

## Phase 4: Route Migration (1 day)

### 4.1 Route Structure
Create the following file structure in `client-next/src/app/`:

```
app/
├── layout.tsx                 # Root layout (providers)
├── page.tsx                   # / (LandingSimple3)
├── loading.tsx                # Global loading state
│
├── (marketing)/               # Group: pages with full footer
│   ├── layout.tsx             # Marketing layout with MainNav + Footer
│   ├── pricing/page.tsx
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   ├── blog/page.tsx
│   ├── blog/[slug]/page.tsx
│   ├── support/page.tsx
│   ├── changelog/page.tsx
│   └── levels/page.tsx
│
├── (landing)/                 # Group: landing page variants
│   ├── react-landing/page.tsx
│   ├── landing2/page.tsx
│   ├── landing-simple/page.tsx
│   ├── simple/page.tsx
│   ├── landing-simple2/page.tsx
│   ├── simple2/page.tsx
│   ├── landing-simple3/page.tsx
│   ├── simple3/page.tsx
│   ├── landing-stealth/page.tsx
│   ├── stealth/page.tsx
│   ├── s/page.tsx
│   └── planning/page.tsx
│
├── (app)/                     # Group: app pages with mini footer
│   ├── layout.tsx             # App layout with MainNav + MiniFooter
│   ├── app/page.tsx           # Home component
│   ├── app/new-search/page.tsx
│   ├── auth/page.tsx
│   ├── auth/complete/page.tsx
│   ├── account/page.tsx
│   ├── streak/page.tsx
│   ├── campaigns/page.tsx
│   ├── campaigns/[id]/page.tsx
│   ├── contacts/page.tsx
│   ├── contacts/all-contacts/page.tsx
│   ├── contacts/lists/[id]/page.tsx
│   ├── contact-lists/[id]/page.tsx
│   ├── replies/page.tsx
│   ├── strategy/page.tsx
│   ├── testing/page.tsx
│   ├── subscription-success/page.tsx
│   ├── quests/page.tsx
│   │
│   ├── company/[slug]/[id]/page.tsx
│   ├── p/[slug]/[id]/page.tsx
│   ├── search/[slug]/[listId]/page.tsx
│   │
│   └── admin/
│       ├── page.tsx
│       ├── users/page.tsx
│       ├── email/page.tsx
│       ├── testing/page.tsx
│       ├── templates/page.tsx
│       └── attribution/page.tsx
│
├── outreach/
│   ├── page.tsx
│   └── daily/[token]/page.tsx
│
└── not-found.tsx              # 404 page
```

### 4.2 Root Layout
**File: `app/layout.tsx`**
```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { InsufficientCreditsProvider } from "@/contexts/insufficient-credits-context";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata = {
  title: "5Ducks - Find Your Ideal Customers",
  description: "AI-powered lead generation and outreach platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <InsufficientCreditsProvider>
              <AuthProvider>
                <RegistrationModalProvider>
                  {children}
                  <Toaster />
                </RegistrationModalProvider>
              </AuthProvider>
            </InsufficientCreditsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 4.3 Example Page Migration

**Before (in App.tsx):**
```tsx
<ProtectedRoute path="/campaigns/:id" component={() => 
  <Suspense fallback={null}>
    <CampaignDetail />
  </Suspense>
} />
```

**After (`app/(app)/campaigns/[id]/page.tsx`):**
```tsx
import CampaignDetail from "@/pages/CampaignDetail";

export default function CampaignDetailPage() {
  return <CampaignDetail />;
}
```

### 4.4 Dynamic Route Parameters

**Before (wouter):**
```tsx
import { useRoute } from 'wouter';
const [, params] = useRoute('/company/:slug/:id');
const { slug, id } = params;
```

**After (Next.js):**
```tsx
import { useParams } from 'next/navigation';
const params = useParams();
const { slug, id } = params;
```

---

## Phase 5: Navigation Updates (1 day)

### 5.1 Files to Update (24 total - navigation usage)
Files using `setLocation` for navigation (need `useRouter`):

| File | Change |
|------|--------|
| `features/onboarding/OnboardingFlowOrchestrator.tsx` | `setLocation` → `router.push` |
| `components/left-menu-drawer.tsx` | `setLocation` → `router.push` |
| `components/company-cards.tsx` | `setLocation` → `router.push` |
| `components/layout.tsx` | `setLocation` → `router.push` |
| `components/main-nav.tsx` | `setLocation` → `router.push` |
| `components/company-table.tsx` | `setLocation` → `router.push` |
| `features/campaigns/components/CampaignsPage.tsx` | `setLocation` → `router.push` |
| `pages/outreach.tsx` | `setLocation` → `router.push` |
| `pages/auth-complete.tsx` | `setLocation` → `router.push` |
| `pages/home.tsx` | `setLocation` → `router.push` |
| `pages/subscription-success.tsx` | `setLocation` → `router.push` |
| `pages/Streak.tsx` | `setLocation` → `router.push` |
| `pages/landing2.tsx` | `setLocation` → `router.push` |
| `pages/landing.tsx` | `setLocation` → `router.push` |
| `pages/auth.tsx` | `setLocation` → `router.push` |
| `pages/planning.tsx` | `setLocation` → `router.push` |
| `pages/admin/Dashboard.tsx` | `setLocation` → `router.push` |
| `pages/admin/Attribution.tsx` | `setLocation` → `router.push` |
| `pages/admin/Users.tsx` | `setLocation` → `router.push` |
| `pages/admin/Templates.tsx` | `setLocation` → `router.push` |
| `pages/admin/EmailTesting.tsx` | `setLocation` → `router.push` |
| `pages/admin/ApiTesting.tsx` | `setLocation` → `router.push` |
| `pages/CampaignDetail.tsx` | `setLocation` → `router.push` |
| `pages/AllContacts.tsx` | `setLocation` → `router.push` |

Files using `useLocation` for reading current path only:
| `hooks/use-analytics.tsx` | `useLocation` → `usePathname` |
| `hooks/use-meta-pixel.tsx` | `useLocation` → `usePathname` |

### 5.2 Pattern Replacement

```typescript
// Before
import { useLocation } from 'wouter';
const [location] = useLocation();

// After
import { usePathname } from 'next/navigation';
const location = usePathname();
```

```typescript
// Before (navigation)
import { useLocation } from 'wouter';
const [, setLocation] = useLocation();
setLocation('/app');

// After
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/app');
```

```typescript
// Before
import { Link } from 'wouter';
<Link href="/pricing">Pricing</Link>

// After
import Link from 'next/link';
<Link href="/pricing">Pricing</Link>
```

---

## Phase 6: Protected Routes (2-3 hours)

### 6.1 Middleware Approach
Create `client-next/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = [
  '/account',
  '/streak',
  '/campaigns',
  '/contacts',
  '/replies',
  '/testing',
  '/strategy',
  '/admin',
];

const semiProtectedPaths = [
  '/app',
  '/search',
  '/company',
  '/p',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));
  const isSemiProtected = semiProtectedPaths.some(p => pathname.startsWith(p));
  
  // For now, let client-side auth handle it
  // Middleware can check for auth cookie if using session-based auth
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 6.2 Client-Side Auth Wrapper
Keep existing `ProtectedRoute` logic but as a client component wrapper:

```tsx
'use client';

import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { openForProtectedRoute } = useRegistrationModal();

  useEffect(() => {
    if (!isLoading && !user) {
      openForProtectedRoute();
    }
  }, [user, isLoading, openForProtectedRoute]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
```

---

## Phase 7: Lazy Loading → Next.js Dynamic (Optional)

### 7.1 Convert Lazy Imports
The 51 `lazy()` calls can become `dynamic()`:

```typescript
// Before
const EmailDrawer = lazy(() => 
  import("@/features/email-drawer").then(m => ({ default: m.EmailDrawer }))
);

// After
import dynamic from 'next/dynamic';
const EmailDrawer = dynamic(
  () => import("@/features/email-drawer").then(m => m.EmailDrawer),
  { ssr: false }
);
```

**Note:** Most of these are optional. Next.js automatically code-splits per route.

---

## Phase 8: Testing & Validation (2-3 days)

### 8.1 Test Checklist
- [ ] Landing pages render correctly
- [ ] Authentication flow works
- [ ] Protected routes redirect properly
- [ ] API calls reach Express backend
- [ ] All forms submit correctly
- [ ] Navigation between pages works
- [ ] Dynamic routes ([id], [slug]) resolve correctly
- [ ] Search functionality works
- [ ] Email composer works
- [ ] Campaign pages work
- [ ] Admin pages work

### 8.2 Known Edge Cases
1. **Firebase SSR:** Ensure Firebase is only initialized on client
2. **localStorage:** Wrap in `typeof window !== 'undefined'` checks
3. **Query Client:** May need to be a client component or use React Context

---

## Deployment Options

### Option A: Keep Separate (Recommended)
- Express runs on port 5000
- Next.js runs on port 3000
- Nginx/reverse proxy routes requests

### Option B: Single Deploy
- Build Next.js as static export
- Serve from Express as static files

---

---

## Phase 9: SEO & Metadata Migration (Half day)

### 9.1 Current SEO Implementation
The app uses `react-helmet` via a custom `SEOHead` component in 8 files:
- `pages/home.tsx`
- `pages/company-details.tsx`
- `pages/contact-details.tsx`
- `pages/landing2.tsx`
- `pages/landing.tsx`
- `pages/changelog.tsx`
- `components/ui/seo-head.tsx`
- `features/strategy-chat/components/StrategyDashboard.tsx`

### 9.2 Next.js Metadata Approach
**Option A: Keep react-helmet (fastest)**
- react-helmet works in Next.js client components
- No changes needed to existing SEOHead usage
- Just add `'use client'` to seo-head.tsx

**Option B: Convert to Next.js Metadata API (recommended for SEO)**
For pages where SEO matters (landing, company, contact details):

```tsx
// app/(marketing)/page.tsx
export const metadata = {
  title: '5Ducks - Sales Gamified | Find Prospects in 5 Minutes a Day',
  description: 'Sales Gamified. Find prospects, craft emails, and close deals...',
  openGraph: {
    title: '5Ducks - Sales Gamified',
    description: 'Sales Gamified...',
    images: ['/images/og-image.webp'],
  },
  twitter: {
    card: 'summary',
    title: '5Ducks - Sales Gamified',
    description: 'Sales Gamified...',
  },
};
```

For dynamic pages (company/contact):
```tsx
// app/company/[slug]/[id]/page.tsx
export async function generateMetadata({ params }) {
  // Fetch company data for dynamic SEO
  const company = await fetch(`/api/companies/${params.id}`).then(r => r.json());
  return {
    title: `${company.name} | 5Ducks`,
    description: company.description,
  };
}
```

---

## Phase 10: Static Assets Migration (30 mins)

### 10.1 Public Directory
Copy `client/public/` to `client-next/public/`:

```bash
cp -r client/public/* client-next/public/
```

Contents:
- `favicon.ico`
- `images/logo.png`, `logo.webp`
- `images/og-image.png`, `og-image.webp`
- `images/og-image2.png`, `og-image2.webp`

### 10.2 Asset Imports
No `@assets` imports found in the codebase - no changes needed.

---

## Phase 11: Provider Architecture (Half day)

### 11.1 Current Provider Stack (8 levels deep)
```tsx
<QueryClientProvider>      // TanStack Query
  <ThemeProvider>          // Theme context
    <InsufficientCreditsProvider>
      <AuthProvider>       // Firebase auth
        <RegistrationModalProvider>
          <StrategyOverlayProvider>
            <TopNavAdProvider>
              <Router />
              <DeferredGuidance />
              <RegistrationModalContainer />
              <PasswordSetupModal />
            </TopNavAdProvider>
          </StrategyOverlayProvider>
          <Toaster />
        </RegistrationModalProvider>
        <InsufficientCreditsModal />
        <InsufficientCreditsHandlerSetup />
      </AuthProvider>
    </InsufficientCreditsProvider>
  </ThemeProvider>
</QueryClientProvider>
```

### 11.2 Next.js Provider Strategy
Create a single client-side Providers wrapper:

**File: `app/providers.tsx`**
```tsx
'use client';

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { StrategyOverlayProvider } from "@/features/strategy-chat";
import { TopNavAdProvider, PasswordSetupModal } from "@/features/top-nav-bar-ad-message";
import { InsufficientCreditsProvider } from "@/contexts/insufficient-credits-context";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { InsufficientCreditsHandlerSetup } from "@/components/insufficient-credits-handler-setup";
import { RegistrationModalContainer } from "@/components/registration-modal-container";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <InsufficientCreditsProvider>
          <AuthProvider>
            <RegistrationModalProvider>
              <StrategyOverlayProvider>
                <TopNavAdProvider>
                  {children}
                  <RegistrationModalContainer />
                  <PasswordSetupModal />
                </TopNavAdProvider>
              </StrategyOverlayProvider>
              <Toaster />
            </RegistrationModalProvider>
            <InsufficientCreditsModal />
            <InsufficientCreditsHandlerSetup />
          </AuthProvider>
        </InsufficientCreditsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

**File: `app/layout.tsx`**
```tsx
import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: '5Ducks - Sales Gamified',
  description: 'Find prospects in 5 minutes a day',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 11.3 DeferredGuidance Component
The `DeferredGuidance` component that lazy-loads the guidance engine based on route:

```tsx
// Add to providers.tsx or create app/deferred-guidance.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

const GUIDANCE_ENABLED_ROUTES = ["/app", "/app/new-search", "/search", "/quests", "/contacts", "/campaigns", "/replies", "/account", "/strategy", "/companies", "/admin"];

function isGuidanceRoute(path: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => path === route || path.startsWith(route + "/"));
}

export function DeferredGuidance() {
  const [GuidanceProvider, setGuidanceProvider] = useState<React.ComponentType<{ children: ReactNode; autoStartForNewUsers?: boolean }> | null>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isGuidanceRoute(pathname)) return;
    if (GuidanceProvider) return;
    
    const load = () => {
      import("@/features/guidance-engine").then(module => {
        setGuidanceProvider(() => module.GuidanceProvider);
      }).catch(err => {
        console.error("Failed to load guidance engine:", err);
      });
    };
    
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(load, { timeout: 5000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(load, 3000);
      return () => clearTimeout(timer);
    }
  }, [pathname, GuidanceProvider]);
  
  if (!GuidanceProvider) return null;
  
  return (
    <GuidanceProvider autoStartForNewUsers={true}>
      <></>
    </GuidanceProvider>
  );
}
```

---

## Phase 12: Semi-Protected Routes (2 hours)

### 12.1 Current SemiProtectedRoute
Shows loading spinner during auth check, but allows access even if not logged in.

### 12.2 Next.js Implementation
Create a client component wrapper:

**File: `components/semi-protected-page.tsx`**
```tsx
'use client';

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function SemiProtectedPage({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return <>{children}</>;
}
```

Usage in pages:
```tsx
// app/(app)/app/page.tsx
import { SemiProtectedPage } from "@/components/semi-protected-page";
import Home from "@/pages/home";

export default function AppPage() {
  return (
    <SemiProtectedPage>
      <Home />
    </SemiProtectedPage>
  );
}
```

---

## Phase 13: Complete Route Inventory

### 13.1 Missing Routes from Original Plan
Additional routes found in App.tsx and pages directory:

| Route | Page Component | Protection |
|-------|---------------|------------|
| `/database` | Database | Protected |
| `/lists` | Lists | Protected |
| `/list-details` | ListDetails | Protected |
| `/testing-new` | TestingNew | Protected |
| `/testing-temp` | TestingTemp | Protected |

### 13.2 Full Route Map

**Landing Variants (public):**
- `/` → LandingSimple3
- `/react-landing` → Landing
- `/landing2` → Landing2
- `/landing-simple`, `/simple` → LandingSimple
- `/landing-simple2`, `/simple2` → LandingSimple2
- `/landing-simple3`, `/simple3` → LandingSimple3
- `/landing-stealth`, `/stealth`, `/s` → LandingStealth
- `/planning` → Planning
- `/outreach` → Outreach

**Marketing (public, with footer):**
- `/terms` → Terms
- `/privacy` → Privacy
- `/blog` → Blog
- `/blog/:slug` → BlogPost
- `/support` → Support
- `/changelog` → Changelog
- `/levels` → Levels
- `/pricing` → PricingNew
- `/quests` → QuestsPage

**App (semi-protected):**
- `/app` → Home
- `/app/new-search` → Home (isNewSearch=true)
- `/search/:slug/:listId` → Home
- `/company/:slug/:id` → CompanyDetails
- `/p/:slug/:id` → ContactDetails

**App (fully protected):**
- `/auth` → Auth
- `/auth/complete` → AuthComplete
- `/account` → Account
- `/streak` → Streak
- `/campaigns` → Campaigns
- `/campaigns/:id` → CampaignDetail
- `/contacts` → Contacts
- `/contacts/all-contacts` → AllContacts
- `/contacts/lists/:id` → ContactListDetail
- `/contact-lists/:id` → ContactListDetail
- `/replies` → Replies
- `/strategy` → StrategyDashboard
- `/testing` → Testing
- `/subscription-success` → SubscriptionSuccess

**Admin (protected + admin check):**
- `/admin` → AdminDashboard
- `/admin/users` → AdminUsers
- `/admin/email` → AdminEmailTesting
- `/admin/testing` → AdminApiTesting
- `/admin/templates` → AdminTemplates
- `/admin/attribution` → AdminAttribution

**Special:**
- `/outreach/daily/:token` → DailyOutreach (token auth, no session)
- `*` → NotFound

---

## Revised Summary of Changes

| Category | Files Changed | Effort |
|----------|---------------|--------|
| Environment variables | 2 files | 30 mins |
| Navigation (routing) imports | 24 files | 1 day |
| Route structure | ~50 new files | 1-2 days |
| Protected routes wrappers | 3 files | 2 hours |
| SEO/Metadata | 8 files (or keep as-is) | Half day |
| Provider consolidation | 2 files | Half day |
| DeferredGuidance migration | 1 file | 1 hour |
| Static assets | Copy only | 30 mins |
| Lazy → Dynamic (optional) | 51 files | Half day |
| Testing & bug fixes | - | 2-3 days |
| **Total** | | **1-2 weeks** |

---

## Files That Need NO Changes
- All 70+ UI components ✅
- All TanStack Query hooks ✅
- All form logic ✅
- All business logic ✅
- Most feature modules ✅
- All lib utilities (except queryClient minor tweak) ✅
- Express backend (100% unchanged) ✅
- Shared schema ✅
- All styles/Tailwind ✅

---

## Risk Mitigation

### High-Risk Areas
1. **Firebase SSR** - Ensure all Firebase calls are in `'use client'` components
2. **localStorage/sessionStorage** - Wrap in `typeof window !== 'undefined'` checks
3. **window object references** - Same as above
4. **Analytics hooks** - Must run client-side only

### Testing Priority
1. Auth flow (login, logout, protected routes)
2. Search functionality
3. Campaign creation and management
4. Email composer
5. Stripe checkout
6. Admin pages

---

## Rollback Plan
Keep the current Vite setup running in parallel until migration is validated. Simply point DNS back to original if issues arise.

---

## Alternative: Incremental Migration
Instead of big-bang migration, you could:
1. Start new pages in Next.js
2. Proxy old routes to Vite during transition
3. Migrate one section at a time (admin first, then marketing, then app)

This reduces risk but extends timeline to 3-4 weeks.

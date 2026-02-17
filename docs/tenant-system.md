# Tenant System — Technical Reference

This application supports multiple product brands (tenants) from a single codebase. Each tenant gets its own domain, branding, theme, feature flags, landing page, and static assets while sharing the same backend, database, and user pool.

**Current tenants:** `5ducks` (fiveducks.ai) and `sendclaw` (sendclaw.com).

---

## Architecture Overview

```
Request arrives at domain
       │
       ▼
  ┌─────────────────────────────────┐
  │  Server: getTenantFromHost()    │  ← hostname → tenant ID mapping
  │  (server/tenants/index.ts)      │
  └──────────┬──────────────────────┘
             │
  ┌──────────▼──────────────────────┐
  │  Client: TenantProvider         │  ← React context, loads config.json
  │  (client/src/lib/tenant-       │     from /tenants/{id}/config.json
  │   context.tsx)                  │
  └──────────┬──────────────────────┘
             │
  ┌──────────▼──────────────────────┐
  │  useTenant() hook               │  ← consumed by components for
  │  Returns: branding, theme,      │     branding, routing, features
  │  routes, features               │
  └─────────────────────────────────┘
```

The system is split into three layers: **server-side resolution**, **client-side context**, and **static config/assets**.

---

## 1. Server-Side Tenant Resolution

**File:** `server/tenants/index.ts`

The server reads tenant domain lists directly from the same `config.json` files used by the client (`client/public/tenants/{id}/config.json`). This ensures a single source of truth for domain-to-tenant mapping.

```ts
const TENANTS_DIR = path.join(process.cwd(), "client", "public", "tenants");
const TENANT_IDS = ['5ducks', 'sendclaw'] as const;
const DEFAULT_TENANT = '5ducks';

function loadTenantConfigs(): TenantConfig[] {
  if (tenantConfigs) return tenantConfigs;
  tenantConfigs = TENANT_IDS.map(id => {
    const configPath = path.join(TENANTS_DIR, id, "config.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return { id: config.id, domains: config.domains };
  });
  return tenantConfigs;
}

export function getTenantFromHost(hostname: string): string {
  const configs = loadTenantConfigs();
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  for (const tenant of configs) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant.id;
      }
    }
  }
  return DEFAULT_TENANT;
}
```

Domain matching uses exact match or subdomain suffix match (e.g., `app.fiveducks.ai` matches the `fiveducks.ai` domain entry). Configs are loaded lazily on first call and cached in-memory.

**Where it's used server-side:**

- **User creation (auth.ts):** Every registration path (`/api/register`, `/api/google-auth`, and the Firebase token fallback) calls `getTenantFromHost(req.hostname)` and stores the result in `users.signup_tenant`. This is a write-once attribution field — it records which brand the user originally signed up under.

```ts
// server/auth.ts — all three user creation paths do this:
user = await storage.createUser({
  email,
  password: hashedPassword,
  signupTenant: getTenantFromHost(req.hostname || ''),
});
```

- **Tenant asset routes (server/tenants/routes.ts):** Serves tenant-specific static files (`skill.md`, `heartbeat.md`, `skill.json`) by resolving the tenant from the request hostname and reading from `client/public/tenants/{tenantId}/`.

---

## 2. Client-Side Tenant Context

### Config Loading (`client/src/lib/tenants/index.ts`)

Configs are JSON files served as static assets from `/tenants/{id}/config.json`. They are fetched at app boot and cached in-memory.

```ts
const TENANT_IDS = ['5ducks', 'sendclaw'] as const;
const DEFAULT_TENANT_ID = 'sendclaw';

async function loadAllTenants(): Promise<TenantConfig[]> {
  if (tenantsCache) return tenantsCache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = Promise.all(TENANT_IDS.map(loadTenantConfig))
    .then(configs => { tenantsCache = configs; return configs; });
  return loadingPromise;
}
```

Domain matching on the client uses exact match or subdomain suffix match:

```ts
export function getTenantByDomain(hostname: string, tenants: TenantConfig[]): TenantConfig {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  for (const tenant of tenants) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant;
      }
    }
  }
  return tenants.find(t => t.id === DEFAULT_TENANT_ID) || tenants[0];
}
```

### React Context (`client/src/lib/tenant-context.tsx`)

`TenantProvider` wraps the entire app (outermost provider after QueryClient). On mount it:

1. Calls `detectCurrentTenant()` — fetches all configs, matches `window.location.hostname`
2. Applies CSS custom properties for theming: `--primary`, `--primary-foreground`, `--accent`
3. Sets `document.title`, favicon (emoji-based SVG), and OG/Twitter meta tags
4. Renders a loading spinner until complete

```ts
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>          {/* ← outermost app-level provider */}
        <ThemeProvider>
          <AuthProvider>
            ...
          </AuthProvider>
        </ThemeProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
```

The `useTenant()` hook throws if called outside the provider or before loading completes. Every component that needs branding/routing/features uses this hook.

---

## 3. TenantConfig Shape

Each tenant's `config.json` (in `client/public/tenants/{id}/config.json`) defines:

```ts
interface TenantConfig {
  id: string;
  domains: string[];

  branding: {
    name: string;        // "5Ducks" | "SendClaw"
    tagline: string;
    logo: string;        // path to logo image
    logoEmoji: string;   // "🐥" | "🦞"
    favicon: string;
    supportEmail: string;
  };

  meta: { title, description, ogImage, twitterImage, url };

  theme: {
    primaryColor: string;          // HSL values, e.g. "45 93% 47%"
    primaryForeground: string;
    accentColor: string;
  };

  routes: {
    guestLanding: string;   // "/" route for unauthenticated users
    authLanding: string;    // redirect target after login
  };

  features: {
    showSendClaw: boolean;
    showProspecting: boolean;
    showCredits: boolean;
  };
}
```

### Current tenant configs at a glance:

| Property | 5ducks | sendclaw |
|---|---|---|
| `domains` | fiveducks.ai, www, app.fiveducks.ai | sendclaw.com, www.sendclaw.com |
| `logoEmoji` | 🐥 | 🦞 |
| `guestLanding` | `/landing-simple3` | `/lobster` |
| `authLanding` | `/app` | `/dashboard` |
| `showProspecting` | true | false |
| `showCredits` | true | false |

---

## 4. Tenant-Driven Routing

The root route (`/`) uses tenants to decide what unauthenticated users see:

```ts
function RootRoute() {
  const { user, isLoading } = useAuth();
  const { tenant } = useTenant();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation(tenant.routes.authLanding); // /app or /dashboard
    }
  }, [user, isLoading]);

  if (user) return null;
  return <TenantGuestLanding />;
}

function TenantGuestLanding() {
  const { tenant } = useTenant();
  const landingComponents: Record<string, ...> = {
    '/lobster': SendclawLanding,
    '/landing-simple3': LandingSimple3,
    // ... other variants
  };
  const LandingComponent = landingComponents[tenant.routes.guestLanding] || SendclawLanding;
  return <LandingComponent />;
}
```

Authenticated users are redirected to `tenant.routes.authLanding` — `/app` for 5ducks (prospecting dashboard), `/dashboard` for sendclaw (email dashboard).

---

## 5. Component-Level Tenant Usage

Components consume tenants via `useTenant()`:

- **Logo component** (`client/src/components/logo.tsx`): renders `tenant.branding.logoEmoji` and `tenant.branding.name`, links to `tenant.routes.authLanding`.
- **Meta/SEO:** set dynamically in `TenantProvider` via DOM manipulation.
- **Feature gating:** components can check `tenant.features.showProspecting`, `tenant.features.showCredits`, etc. to conditionally render tenant-specific UI.
- **Mascot images:** tenant-specific mascot images are stored under each tenant's `images/` directory (e.g., `/tenants/5ducks/duckling-mascot.png`, `/tenants/sendclaw/images/sendclaw-mascot.png`).

---

## 6. Static Assets Per Tenant

```
client/public/tenants/
├── 5ducks/
│   ├── config.json          ← TenantConfig
│   ├── images/              ← logos, og-images, favicons, mascots
│   └── skill.md             ← served via /skill.md route
└── sendclaw/
    ├── config.json
    ├── images/
    ├── skill.md
    ├── skill.json
    ├── heartbeat.md
    └── advice-for-skills.md
```

The server tenant routes (`server/tenants/routes.ts`) serve `skill.md`, `heartbeat.md`, and `skill.json` dynamically based on the requesting hostname — no tenant prefix in the URL.

---

## 7. Database — User Signup Tenant

The `users` table has a `signup_tenant` column:

```ts
export const users = pgTable("users", {
  // ...
  signupTenant: text("signup_tenant"), // 'sendclaw', '5ducks', or null
});
```

This is set once at user creation and never updated. It records which brand domain the user originally registered through, useful for analytics and attribution. Users are not scoped by tenant — all users share the same data pool and can access either domain.

---

## Adding a New Tenant

To add a new tenant:

1. **Client config (single source of truth):** Create `client/public/tenants/{id}/config.json` with the full `TenantConfig` shape, including the `domains` array. Both the server and client read from this file.
2. **Register the tenant ID:** Add the tenant ID to `TENANT_IDS` in both `client/src/lib/tenants/index.ts` and `server/tenants/index.ts`.
3. **Static assets:** Create `client/public/tenants/{id}/images/` with logo, favicon, og-image, and mascot assets.
4. **Landing page:** Either reuse an existing landing component or create a new one and map it in `TenantGuestLanding` in `client/src/App.tsx`.
5. **Tenant documents (optional):** Add `skill.md`, `skill.json`, `heartbeat.md` under the tenant's public directory if needed for the tenant asset routes.

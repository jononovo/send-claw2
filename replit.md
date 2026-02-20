# 5Ducks B2B Prospecting Platform

## Overview
5Ducks is an AI-powered B2B lead generation platform that transforms simple queries into comprehensive prospect lists. It provides verified contacts, personalized outreach campaigns, and automated email campaign management with intelligent scheduling and spam prevention. The platform's core purpose is to streamline lead generation, enhance outreach effectiveness, and scale business development efforts for B2B sales teams.

The platform includes **SendClaw**, an add-on email service that provides AI agents with autonomous `@sendclaw.com` email addresses for programmatic communication.

## User Preferences
- **Default Email Tone**: Professional with personalized intros
- **Campaign Defaults**: Batch size 10, daily limit 50
- **UI Preferences**: Dark mode support, mobile-first responsive design
- **Navigation Flow**: Search → Save List → Compose Email (via drawer) → Launch Campaign

## System Architecture
The platform comprises a React SPA frontend (TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query) and an Express.js backend (TypeScript) using PostgreSQL for data persistence. Authentication is managed by Firebase and Passport.js.

**UI/UX Decisions:**
- **Consolidated Email Workflow**: All email composition is integrated into the /app page via an email drawer.
- **Historic Searches Drawer**: Positioned in the header for easy access.
- **Mobile Optimization**: Drawers are 80% width with tap-outside-to-close functionality.
- **Improved Navigation**: Utilizes event-based communication between components.
- **SEO-Friendly URLs**: Company and contact pages use slug-based URLs (`/company/:slug/:id`, `/p/:slug/:id`) where `id` is the primary lookup key and `slug` is for SEO.
- **SEO Content Gating**: Public company/contact pages mask emails for unauthenticated users (e.g., `j***@acme.com`) via server-side processing, with other contact details visible. A CTA banner encourages sign-ups.

**Technical Implementations:**
- **Search System**: A progressive pipeline for companies, contacts, and emails orchestrated by `SearchOrchestrator` and processed by `JobProcessor`.
- **Contact Discovery**: Multi-stage fallback with validation scoring via `ContactSearchService`.
- **Email Enrichment**: Tiered provider approach (`parallelTieredEmailSearch`) integrating multiple services.
- **Email Campaign System**: Supports custom email creation, merge fields, templates, and AI-powered generation. Includes **Human Review Mode** and **Auto-Send Mode**, with an `Autopilot Modal` for intelligent scheduling and rate limiting.
- **Individual Search**: Uses Perplexity Search API and Claude for precise extraction.
- **OAuth Token Storage**: Gmail OAuth tokens are stored encrypted in a PostgreSQL table (`oauth_tokens`).
- **Drip Email Engine**: Handles system-to-user transactional emails (e.g., access confirmations) via SendGrid, with scheduled sequences and immediate send capabilities.
- **Credit System**: A generic system (`CreditService`) manages credit checks, deductions, and top-ups, with defined costs for various actions (e.g., `company_search`: 10 credits, `email_search`: 160 credits).
- **Credit Reward & Progress Tracking System**: Uses a `user_progress` table and `CreditRewardService` for awarding credits based on user milestones across different namespaces (e.g., registration, onboarding, challenges).
- **Daily Check-in Rewards**: Users can claim daily credits (10-20 based on streak). Tables: `daily_checkins`. Streak bonus: 3+ days = 15 credits, 7+ days = 20 credits max. Endpoints: `GET/POST /api/rewards/daily-checkin`.
- **Social Sharing Rewards**: One-time credits for sharing on social platforms. Tables: `social_share_rewards`. Credits: Twitter/LinkedIn 50, Facebook 30. Endpoints: `GET/POST /api/rewards/share`.
- **Attribution Tracking System**: Captures first-touch UTM parameters and click IDs, storing them in `user_attribution` to track user acquisition sources and conversion events (e.g., `registration_complete`, `search_performed`).
- **SendClaw Email Service**: Autonomous email for AI agents. Bots register via API, receive `@sendclaw.com` handles, and send/receive emails programmatically. Humans can claim bots via tokens for dashboard access. Supports optional **webhook notifications** — bots provide a `webhookUrl` at registration (or via `PATCH /api/bots/webhook`) and receive instant POST callbacks when emails arrive (fire-and-forget, 1 retry after 3s, 5s timeout). Heartbeat polling (15min) serves as fallback. Routes in `server/sendclaw/`, webhook notifier in `server/sendclaw/common/webhook-notifier.ts`, frontend in `client/src/features/sendclaw/` (authenticated) and `client/src/features/sendclaw-public/` (landing). Agent docs in `skill.md`.
- **Bot Email Security System**: AI-powered daily review of bot emails for security threats. Uses Anthropic Claude to scan outbound emails for scams, crypto schemes, and suspicious content. Status changes are suggested only — admin must manually apply/reject via per-flag buttons on the BotSecurity page. Status escalation: 2 flags → `flagged` (2/day limit), 3 flags → `under_review` (0/day limit). Daily reports emailed to admin. Tables: `email_flags`, `security_reports`. Module: `server/features/bot-email-security/`. Admin API: `/api/bot-security/*`.
- **Bulk Signup Detection System**: Detects coordinated bot registration patterns across multiple IPs. Runs every 12 hours (production only), scanning recent registrations for shared name/sender prefixes, temporal clustering, and multi-IP distribution. Generates alerts with one-click approval via email or admin panel. Approval suspends flagged bots, removes their handles, and blocks associated IPs for 14 days. Checks claimed status as a red flag indicator. Tables: `security_bulk_signup_alerts`, `security_ip_blocks`. Module: `server/features/bot-email-security/bulk-signup/`. Admin pages: `/admin/bulk-signups` (list) and `/admin/bulk-signups/:id` (detail). API: `/api/bot-security/bulk-signups/*`.
- **SEO Server-Side Rendering**: Express middleware (`server/features/seo-ssr/`) intercepts `/company/:slug/:id` and `/p/:slug/:id` routes BEFORE Vite/static serving. Injects page-specific `<title>`, `<meta>`, Open Graph, Twitter Card, and JSON-LD tags plus hidden server-rendered HTML with full entity data (including unmasked emails). Uses 30-day in-memory cache keyed by entity ID (resets on server restart). Rate limited via seoRateLimiter. Public API endpoints (`/api/contacts/:id`, `/api/companies/:companyId/contacts`) return unmasked emails for all users. Unauthenticated company page requests use `listContactsByCompanyPublic()` (no userId filter) to show all contacts.

**System Design Choices:**
- **Data Architecture**: PostgreSQL is the primary database for all core entities, credits, subscriptions, and tokens. A database-persistent job queue handles background tasks.
- **Authentication**: Firebase for authentication, Passport.js for session management.
- **Concurrency & Rate Limits**: Limits apply to simultaneous company processing (7), parallel email sends (10), demo user searches (10/hour), and campaign emails (500/day with 30s spacing).
- **Modular Code Architecture**: Features are organized into modules (`server/features/[name]`, `client/src/features/[name]`) for maintainability.
- **Multi-Tenancy Architecture**: Client-side tenant detection based on hostname. Each tenant has a self-contained folder in `client/public/tenants/{id}/` containing:
  - `config.json` - Branding (name, emoji, tagline), theme (colors), routes (guestLanding, authLanding), feature flags, optional pricing plans
  - `images/` - Logo, favicon, og-image, and other tenant-specific assets
  
  Current tenants: `5ducks` (fiveducks.ai) and `sendclaw` (sendclaw.com). TenantProvider in `client/src/lib/tenant-context.tsx` fetches config at runtime, applies theme CSS variables, updates meta tags, and manages favicon. Signup tenant is tracked server-side via `signup_tenant` column in users table. Note: Tenant isolation is cosmetic/branding only; server-side enforcement would be needed for true data isolation.
- **Per-Tenant Pricing**: Pricing display data lives in tenant `config.json` (optional); Stripe price IDs stay server-side via `getStripePriceId()` in `server/features/billing/stripe/types.ts`. The pricing API (`/api/pricing/config`) resolves tenant from hostname and applies promo overrides. Tenants without a pricing section fall back to the default tenant's pricing. Pricing page and success page use data-driven plan selection (price, comingSoon flags) rather than hardcoded plan IDs. See `docs/260216_tenant-system.md` section 8 for full details.

## External Dependencies
- **Perplexity**: For company and contact discovery.
- **Hunter.io**: For email verification.
- **Apollo.io**: For contact database lookups.
- **OpenAI**: For AI-driven email content generation.
- **SendGrid**: For transactional email delivery and tracking.
- **Firebase**: For user authentication.
- **PostgreSQL**: The primary relational database.
- **Replit Object Storage**: GCS-backed storage for persistent file storage, used for guidance video uploads.
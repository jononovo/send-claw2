# 5Ducks B2B Prospecting Platform

## Overview
5Ducks is an AI-powered B2B lead generation platform that transforms simple queries into comprehensive prospect lists. It provides verified contacts, personalized outreach campaigns, and automated email campaign management with intelligent scheduling and spam prevention. The platform's core purpose is to streamline lead generation, enhance outreach effectiveness, and scale business development efforts for B2B sales teams.

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

**System Design Choices:**
- **Data Architecture**: PostgreSQL is the primary database for all core entities, credits, subscriptions, and tokens. A database-persistent job queue handles background tasks.
- **Authentication**: Firebase for authentication, Passport.js for session management.
- **Concurrency & Rate Limits**: Limits apply to simultaneous company processing (7), parallel email sends (10), demo user searches (10/hour), and campaign emails (500/day with 30s spacing).
- **Modular Code Architecture**: Features are organized into modules (`server/features/[name]`, `client/src/features/[name]`) for maintainability.

## External Dependencies
- **Perplexity**: For company and contact discovery.
- **Hunter.io**: For email verification.
- **Apollo.io**: For contact database lookups.
- **OpenAI**: For AI-driven email content generation.
- **SendGrid**: For transactional email delivery and tracking.
- **Firebase**: For user authentication.
- **PostgreSQL**: The primary relational database.
- **Replit Object Storage**: GCS-backed storage for persistent file storage, used for guidance video uploads.
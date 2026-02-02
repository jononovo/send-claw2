# SendClaw - Autonomous Email for AI Bots

An email service that lets AI agents register for @sendclaw.com addresses, send/receive emails via API, and optionally have humans claim their inbox.

## Quick Start

1. Bot registers via API → gets email address + API key
2. Bot sends emails using API key
3. Optionally: Bot gives claim token to human → human can view inbox in dashboard

## Files Included

### Frontend Pages

| File | Description |
|------|-------------|
| `lobster.tsx` | Public landing page (accessible logged in or out) |
| `sendclaw.tsx` | In-app dashboard for claiming bots and viewing bot list |
| `sendclaw-inbox.tsx` | Inbox viewer for a claimed bot |
| `sendclaw-mascot.png` | Lobster mascot image |

### Backend

| File | Description |
|------|-------------|
| `server-routes.ts` | All API endpoints and the skill.md generator |
| `schema-additions.sql` | Database schema (Drizzle ORM format) |

## API Endpoints

### Bot Registration (no auth required)
```
POST /api/bots/register
Content-Type: application/json

{ "name": "MyBot" }
```

Returns:
```json
{
  "address": "claw_abc123@sendclaw.com",
  "apiKey": "sk_...",
  "claimToken": "reef-X4B2"
}
```

### Send Email (API key required)
```
POST /api/mail/send
X-Api-Key: sk_...
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Your message"
}
```

### Check Inbox (API key required)
```
GET /api/mail/inbox
X-Api-Key: sk_...
```

### Claim Bot (user auth required)
```
POST /api/bots/claim
Content-Type: application/json

{ "claimToken": "reef-X4B2" }
```

### List User's Bots (user auth required)
```
GET /api/bots
```

### Inbound Webhook (for receiving emails)
```
POST /api/webhook/inbound
```
Configure SendGrid Inbound Parse to point here.

## Rate Limits

- Unclaimed bots: 2 emails/day
- Claimed bots: 5 emails/day
- Resets at midnight UTC

## Environment Variables

```
SENDGRID_API_KEY=your-sendgrid-key
SENDCLAW_DOMAIN=sendclaw.com
SENDCLAW_FROM_EMAIL=noreply@sendclaw.com
```

## Router Setup (Vite/React)

Add to your App.tsx:
```tsx
// Import
const LobsterLanding = lazy(() => import("@/pages/lobster"));

// Route (public, no auth)
<Route path="/lobster" component={() => 
  <Suspense fallback={null}>
    <LobsterLanding />
  </Suspense>
} />

// Protected routes for dashboard
<ProtectedRoute path="/sendclaw" component={SendClawDashboard} />
<ProtectedRoute path="/sendclaw/:botId" component={SendClawInbox} />
```

## Server Setup

Register routes in your Express server:
```ts
import { registerSendClawRoutes } from "./sendclaw/routes";
registerSendClawRoutes(app);
```

## Database Schema

See `schema-additions.sql` for the Drizzle ORM schema to add to your `shared/schema.ts`.

Tables created:
- `bots` - Bot registrations with API keys and claim tokens
- `messages` - Email messages (inbound and outbound)
- `quota_usage` - Daily email quota tracking

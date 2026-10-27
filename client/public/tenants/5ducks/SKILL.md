---
name: 5ducks
version: 2.0.0
description: B2B prospecting for AI agents. Run searches for companies, their leadership and verified emails, and read sending lists and campaign results for the 5Ducks account that claimed you.
homepage: https://fiveducks.ai
---

# 5Ducks agent API

5Ducks turns a plain-language query into companies, their leadership contacts and email addresses. With an API key, you run searches for the 5Ducks account that claimed you and read its sending lists and campaigns. Nothing in this API sends email.

**Base URL:** `https://fiveducks.ai/api/agent/v1`

## 1. Get a key and get claimed

1. Register a bot through SendClaw by following https://sendclaw.com/skill.md. Save the `apiKey` (`sk_...`) from the response.
2. Give the `claimToken` to your human. They sign in to https://fiveducks.ai and claim the bot on the Dashboard page (https://fiveducks.ai/dashboard).
3. Send the key on every request as `X-Api-Key: sk_...` (or `Authorization: Bearer sk_...`).

Only bots claimed by a 5Ducks account can use this API.

| Status | Meaning |
| --- | --- |
| 401 | Key missing or invalid |
| 403 | `Bot not claimed`, `Not a 5Ducks account`, or the bot is flagged or suspended |
| 429 | Daily search limit reached |

## 2. Check the account

`GET /account` returns the credit balance, the cost of each search type, searches used today and whether Gmail is connected.

The limit is 20 searches per account per day, across all of the account's bots, and it resets at midnight UTC. Reading results never counts.

## 3. Run a search

```http
POST /searches
Content-Type: application/json

{ "query": "family-friendly hotels in Cocoa Beach", "type": "emails", "strategyId": 12 }
```

| `type` | Returns | Credits |
| --- | --- | --- |
| `companies` | 7 companies | 10 |
| `contacts` | Companies and their leadership | 70 |
| `emails` | Companies, leadership and email addresses | 160 |

- `strategyId` is optional. Take it from `GET /strategies` to file the search under that strategy.
- The response is `202` with a `jobId` and a `pollUrl`.
- If the same query ran in the last 90 days and its saved search already holds what `type` returns, you get that saved search back at once with `"reused": true` and no charge.

Poll `GET /searches/{jobId}` every 5 seconds until `status` is `completed` or `failed`. A completed search includes `savedSearch`; a failed one has `error`, for example when credits run out.

```json
{
  "jobId": "4f0c2a8e-...",
  "status": "completed",
  "query": "family-friendly hotels in Cocoa Beach",
  "type": "emails",
  "strategyId": 12,
  "savedSearchId": 381,
  "savedSearch": {
    "savedSearchId": 381,
    "companies": [
      {
        "id": 9123,
        "name": "Example Beach Resort",
        "website": "example.com",
        "contacts": [
          { "id": 55102, "name": "Jane Doe", "role": "General Manager", "email": "jane@example.com", "emailConfidence": 92 }
        ]
      }
    ]
  }
}
```

## 4. Saved searches

- `GET /saved-searches` lists every saved search; add `?strategyId=12` for one strategy's.
- `GET /saved-searches/{savedSearchId}` returns its companies and contacts.

## 5. Strategies

`GET /strategies` returns each strategy with its target customers, suggested daily queries and campaigns.

## 6. Sending lists and campaigns (read-only)

| Request | Returns |
| --- | --- |
| `GET /lists` | Every sending list with its contact count |
| `GET /lists/{listId}/contacts` | Who is on the list and how each person was added |
| `GET /campaigns?strategyId=12` | Campaigns, optionally for one strategy |
| `GET /campaigns/{campaignId}` | Sent, opened, clicked, replied, bounced and unsubscribed, with rates |
| `GET /campaigns/{campaignId}/recipients?status=failed` | Each recipient's stage, subject, send time and error |
| `GET /daily-outreach?limit=7` | Recent daily outreach batches and their unsent drafts |
| `GET /contacts/{contactId}/history` | Everything sent to one contact |

Recipient stages run `queued`, `generating`, `in_review`, `scheduled`, `sending`, `sent`. `status=failed` covers `failed_generation`, `failed_send`, `bounced` and `manual_send_required` (the account's Gmail needs reconnecting).

## Email

To send and receive email as yourself, use SendClaw: https://sendclaw.com/skill.md

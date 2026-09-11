---
name: Search history persistence (search_lists)
description: Why saved searches intermittently fail to appear, and the constraints to respect when changing how search history is written.
---

# Search history persistence

## Production ID-counter drift on `search_lists`

The production `search_lists.id` counter (sequence `lists_id_seq`, legacy name — the table was once `lists`) drifted far below the table's real max id, so `nextval` hands out ids that already exist and inserts fail with a primary-key violation. Saves succeed only when the counter lands on one of the gap ids left by deleted rows, which makes history saving look random rather than broken.

**Why:** production rows kept their high ids while the sequence was reset to a much lower value (observed drift beginning early Feb 2026; it predates any redeploy). No other auto-numbered column in the database showed the same drift.

**How to apply:** when a table's inserts fail intermittently in production but work in development, compare `last_value` of its sequence against `max(id)` before suspecting application logic. Repair is a `setval` in the production SQL console — the agent's production access is read-only, and publishing syncs schema, not sequence positions.

## History saving is browser-driven, with several writers

Search execution is a server-side job whose results land in `search_jobs`, but the history row in `search_lists` is written only by the browser after the fact, through several overlapping paths: a debounced auto-save POST, an explicit save POST, a progressive-update PUT, a later metrics PATCH, and a separate direct insert for Super Search. Consequences worth remembering before touching this area:

- If the tab closes, the session id clears, or the save request never fires, the search completes and is billed but leaves no history entry.
- Metrics (contact/email totals, report companies) arrive in a second request, so most historical rows have those columns empty.
- Creation dedupes on identical prompt text per user and returns the older row unchanged, so re-running the same query never refreshes or re-adds it.
- List numbering is computed in application code by scanning all rows and adding one, separate from the database id.
- Most list endpoints are unauthenticated and fall back to the demo user, so anonymous searches accumulate under that account.
- Save failures are swallowed silently on the client.

**Why:** these behaviors interact — fixing only one (for example the counter) still leaves searches unsaved whenever the browser never sends the request.

**How to apply:** prefer making the history row a server-side consequence of job completion, written once with its metrics and keyed by the job, over adding another client-side writer.

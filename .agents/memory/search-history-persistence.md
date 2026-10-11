---
name: Search history persistence (search_lists)
description: Why saved searches intermittently failed to appear (resolved), and the constraints to respect when changing how search history is written.
---

# Search history persistence

## Production ID-counter drift on `search_lists` — diagnosed and repaired

The production `search_lists.id` counter (sequence `lists_id_seq`, legacy name — the table was once `lists`) sat far below the table's real max id, so `nextval` handed out ids that already existed and inserts failed with a primary-key violation. Saves succeeded only when the counter landed on one of the gap ids left by deleted rows, which made history saving look random rather than broken. Repaired by `setval` to `max(id)`; the next save landed correctly, complete with its metrics.

**Why:** production rows kept their high ids while the sequence was reset to a much lower value (drift began early Feb 2026; it predated the autoscale→VM redeploy that prompted the investigation). No other auto-numbered column in the database showed the same drift, and development was healthy throughout. The root cause of the reset itself was never identified, so treat recurrence as possible.

**How to apply:** when inserts fail intermittently in production but work in development, compare the sequence's `last_value` against `max(id)` before suspecting application logic. Repair is a `setval` the user runs in the production SQL console — the agent's production role is read-only, and publishing syncs schema, not sequence positions. Verify the fix survives deploys by confirming dev and prod agree on the column's style: the Drizzle schema declares this id as `generatedAlwaysAsIdentity` while both databases hold it as an old-style serial, so a `drizzle-kit push` (not run by the deploy, which is build + start only) is the one operation that could disturb it.

**Diagnostic caution learned here:** absence of a request in deployment logs was read as "the client never attempted the save," which pointed at a client-side bug that turned out not to be the cause. Deployment log windows do not necessarily cover the period in question — do not treat a gap in them as proof of absence.

## History saving is browser-driven, with several writers

Search execution is a server-side job whose results land in `search_jobs`, but the history row in `search_lists` is written only by the browser after the fact, through several overlapping paths: a debounced auto-save POST, an explicit save POST, a progressive-update PUT, a later metrics PATCH, and a separate direct insert for Super Search.

The split is mostly deliberate, not accidental duplication: results stream in over ~20s so the row is created early from partial results and updated as more arrive, and the report metrics are only computed at completion, after the row exists. Do not treat "unify the writers" as an obvious improvement — the user pushed back on that framing and was right to.

Constraints worth remembering before touching this area:

- Row creation only triggers while a search session is active during result polling. The completion path can only *update* an existing row; if none exists it parks the metrics in a ref and discards them.
- Creation dedupes on identical prompt text per user and returns the older row unchanged, so re-running the same query never refreshes or re-adds it. Use a fresh prompt when testing saves.
- List numbering (`list_id`, distinct from the primary key) is computed in application code by scanning all rows and adding one, with only a non-unique index behind it. Production already holds duplicate `list_id` values, some spanning different users.
- Most list endpoints are unauthenticated and fall back to the demo user, so anonymous searches accumulate under that account.
- Save failures are swallowed silently on the client, which is why the counter drift went unnoticed for roughly seven months.

**How to apply:** when a save-path symptom appears, check the database-level explanation before rewriting client logic. Comparing completed `search_jobs` against matching `search_lists` rows (by user and prompt) is a quick way to measure the real save rate, but it undercounts — prompts can be edited and `companies`-type searches intentionally do not save.

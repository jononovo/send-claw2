/**
 * Verifies the strategies Phase 1 code against a LOCAL database, without calling the paid search
 * APIs: the shared saved-search pieces, the search queue runner, and the strategy routes.
 *
 * Run from the repo root:  npx tsx --env-file=.env scripts/verify-strategies-phase1.ts
 * It creates its own users and removes them (cascade) at the end. It refuses any database that is
 * not on localhost. Exit code 1 when a check fails.
 */
import express from "express";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL ?? "";
const host = (() => { try { return new URL(databaseUrl).hostname; } catch { return ""; } })();
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  console.error(`Refusing to run: DATABASE_URL must point at a local database (host is "${host || "unset"}")`);
  process.exit(1);
}
// Paid providers stay unreachable from this script, whatever .env holds
for (const key of ["PERPLEXITY_API_KEY", "APOLLO_API_KEY", "HUNTER_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]) delete process.env[key];

const { db, pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { SearchListsService } = await import("../server/features/lists/service");
const { SearchJobService } = await import("../server/search/services/search-job-service");
const { jobProcessor } = await import("../server/search/services/job-processor");
const { searchQueueService, searchQueueRunner } = await import("../server/features/search-queues");
const { registerSearchQueueRoutes } = await import("../server/features/search-queues/routes");
const { registerStrategiesRoutes } = await import("../server/features/strategies");
const { users, strategicProfiles, userCredits, contactListMembers, searchQueues, searchQueueItems, searchJobs } = await import("../shared/schema");

// Never reach the paid search APIs from this script.
(jobProcessor as any).processJobImmediately = async () => { throw new Error("blocked in test: would call the search APIs"); };

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}
const until = async (done: () => boolean, ms = 20000) => {
  const end = Date.now() + ms;
  while (!done() && Date.now() < end) await new Promise((r) => setTimeout(r, 100));
  return done();
};
async function withUser<T>(username: string, balance: number, run: (userId: number, strategyId: number) => Promise<T>): Promise<T> {
  const [user] = await db.insert(users).values({ username, password: "x", email: `${username}@example.test` }).returning();
  const [strategy] = await db.insert(strategicProfiles).values({ userId: user.id, title: "Verify strategy", businessType: "service", businessDescription: "Sponsorship packages", targetCustomers: "verify" }).returning();
  await db.insert(userCredits).values({ userId: user.id, balance });
  try {
    return await run(user.id, strategy.id);
  } finally {
    await db.delete(users).where(eq(users.id, user.id)); // cascades to profile, credits, jobs, companies, contacts, saved searches, lists, queues
  }
}

async function sharedPieces() {
  console.log("\n# Shared pieces: list-number sequence, saved search from a job, contact loader");
  await withUser("verify-shared", 1000, async (userId, strategyId) => {
    const a = await storage.getNextSearchListId();
    const b = await storage.getNextSearchListId();
    check("sequence hands out increasing numbers from 1001 up", a >= 1001 && b === a + 1, { a, b });

    const jobId = await SearchJobService.createJob({ userId, query: "verify query", searchType: "contacts", source: "strategy", metadata: { saveResultsAsSearchList: true, strategyId } });
    const job = (await storage.getSearchJobByJobId(jobId))!;
    const reserved = (job.metadata as any).listId;
    check("createJob reserved the next list number when flagged", typeof reserved === "number" && reserved === b + 1, { reserved });

    const c1 = await storage.createCompany({ name: "Verify Co 1", userId, listId: reserved } as any);
    const c2 = await storage.createCompany({ name: "Verify Co 2", userId, listId: reserved } as any);
    const ct = await storage.createContact({ name: "Jane Verify", email: "jane@verify.test", role: "CEO", companyId: c1.id, userId } as any);
    const saved = await SearchListsService.createSearchListFromCompletedJob(job, {
      companies: [{ id: c1.id, name: c1.name, contacts: [{ id: ct.id, name: ct.name, role: ct.role, email: ct.email, probability: 80 }] }, { id: c2.id, name: c2.name, contacts: [] }],
      totalCompanies: 2, totalContacts: 1, sourceBreakdown: { Perplexity: 1, Apollo: 0, Hunter: 0 },
    });
    check("saved search uses the reserved number and the strategy tag", saved.listId === reserved && saved.strategyId === strategyId);
    check("totals, source breakdown and report written", saved.resultCount === 2 && saved.totalContacts === 1 && saved.totalEmails === 1 && (saved.reportCompanies as any[])?.length === 2 && saved.sourceBreakdown?.Perplexity === 1);
    check("companies are linked to the saved search", (await storage.listCompaniesBySearchList(reserved, userId)).length === 2);
    const viaIds = await storage.listContactsByCompanyIds([c1.id, c2.id], userId);
    check("listContactsByCompanyIds returns the contact in one query", viaIds.length === 1 && viaIds[0].id === ct.id);
    check("listContactsByCompanyIds with no ids returns empty", (await storage.listContactsByCompanyIds([], userId)).length === 0);

    const job2Id = await SearchJobService.createJob({ userId, query: "verify query 2", searchType: "companies", source: "api", metadata: {} });
    const job2 = (await storage.getSearchJobByJobId(job2Id))!;
    check("an unflagged job reserves no list number", (job2.metadata as any).listId === undefined);
    const c3 = await storage.createCompany({ name: "Verify Co 3", userId } as any);
    const saved2 = await SearchListsService.createSearchListFromCompletedJob(job2, { companies: [{ id: c3.id, name: c3.name, contacts: [] }], totalCompanies: 1, totalContacts: 0 });
    check("without a reserved number the function reserves one and links the companies", saved2.listId === reserved + 1 && (await storage.listCompaniesBySearchList(saved2.listId, userId))[0]?.id === c3.id && saved2.strategyId === null);

    let duplicateRejected = false;
    try { await storage.createSearchList({ listId: reserved, userId, prompt: "dup", resultCount: 0, customSearchTargets: null }); } catch { duplicateRejected = true; }
    check("a duplicate list number is rejected by the unique index", duplicateRejected);

    // One person found by two searches is two contact rows with one email; a list keeps one
    const list = await storage.createContactList({ userId, name: "Verify dedup", contactCount: 0, isDefault: false });
    const sameA = await storage.createContact({ name: "Sam Same", email: "sam@same.test", companyId: c1.id, userId } as any);
    const sameB = await storage.createContact({ name: "Sam Same", email: "sam@same.test", companyId: c2.id, userId } as any);
    const first = await storage.addContactsToList(list.id, [sameA.id, sameB.id], "search_list", userId);
    check("a list takes one of two contacts that share an email", first.addedCount === 1 && first.duplicateCount === 1, first);
    const sameC = await storage.createContact({ name: "Sam Same", email: "SAM@same.test", companyId: c2.id, userId } as any);
    const second = await storage.addContactsToList(list.id, [sameC.id], "search_list", userId);
    check("a later contact with that email, in other case, is skipped too", second.addedCount === 0 && second.duplicateCount === 1, second);
  });
}

async function queueRunner() {
  console.log("\n# Search queue runner");
  await withUser("verify-runner", 1000, async (userId, strategyId) => {
    const list = await storage.createContactList({ userId, name: "Verify strategy: group A", contactCount: 0, isDefault: false });
    const queue = await searchQueueService.createQueue({ userId, name: "Group A", strategyId, contactListId: list.id, searchType: "companies", delayBetweenSearches: 0, continueOnFailure: true });
    check("queue created with strategy, list and search type", queue.strategyId === strategyId && queue.contactListId === list.id && queue.searchType === "companies");

    const repeatNumber = await storage.getNextSearchListId();
    const repeatSaved = await storage.createSearchList({ listId: repeatNumber, userId, prompt: "verify repeat query", resultCount: 1, customSearchTargets: null });
    const companyA = await storage.createCompany({ name: "Repeat Co", userId, listId: repeatNumber } as any);
    const contactA = await storage.createContact({ name: "Rita Repeat", email: "rita@repeat.test", role: "CEO", companyId: companyA.id, userId } as any);
    await storage.createContact({ name: "No Email", role: "COO", companyId: companyA.id, userId } as any);

    const earlierNumber = await storage.getNextSearchListId();
    const earlierSaved = await storage.createSearchList({ listId: earlierNumber, userId, prompt: "verify earlier job", resultCount: 3, customSearchTargets: null });
    const earlierJob = await storage.createSearchJob({ userId, query: "verify earlier job", searchType: "companies", source: "strategy", metadata: {} } as any);
    await storage.updateSearchJob(earlierJob.id, { status: "completed", completedAt: new Date(), resultCount: 3, results: { companies: [], savedSearchId: earlierNumber } as any });

    const [itemA, itemB, itemE] = await searchQueueService.addItemsToQueue(queue.id, ["verify repeat query", "verify earlier job", "verify brand new query"]);
    await searchQueueService.updateQueueItem(itemB.id, { searchJobId: earlierJob.id });

    check("run starts", (await searchQueueRunner.start(queue.id, userId)).started === true);
    check("run finishes", await until(() => !searchQueueRunner.isRunning(queue.id)));

    const after = (await searchQueueService.getQueueWithItems(queue.id, userId))!;
    const a = after.items.find((i) => i.id === itemA.id)!, b = after.items.find((i) => i.id === itemB.id)!, e = after.items.find((i) => i.id === itemE.id)!;
    check("repeat: reused the saved search without a job", a.status === "completed" && a.listId === repeatSaved.id && a.savedSearchNumber === repeatNumber && a.searchJobId === null && (a.metadata as any)?.reusedSavedSearch === repeatNumber);
    const members = await db.select().from(contactListMembers).where(eq(contactListMembers.listId, list.id));
    check("repeat: the contact with an email joined the group's list, the one without did not", members.length === 1 && members[0].contactId === contactA.id);
    const meta = members[0]?.sourceMetadata as any;
    check("repeat: list membership records search, group and strategy", meta?.searchListId === repeatNumber && meta?.searchQueueId === queue.id && meta?.strategyId === strategyId);
    check("restart: item finished from its earlier completed job", b.status === "completed" && b.listId === earlierSaved.id && b.resultCount === 3);
    check("new query: job created, failed at the blocked call, run went on", e.status === "failed" && e.searchJobId !== null && /blocked in test/.test(e.errorMessage ?? ""));
    const [eJob] = await db.select().from(searchJobs).where(eq(searchJobs.id, e.searchJobId!));
    const m = eJob.metadata as any;
    check("new query: job carries source strategy, the save flag, a reserved number and the tags", eJob.source === "strategy" && m.saveResultsAsSearchList === true && typeof m.listId === "number" && m.strategyId === strategyId && m.searchQueueId === queue.id);
    check("queue completed when no queries were left", after.status === "completed");

    await db.update(userCredits).set({ balance: 5 }).where(eq(userCredits.userId, userId));
    const queue2 = await searchQueueService.createQueue({ userId, name: "Group B", strategyId, contactListId: list.id, searchType: "emails", delayBetweenSearches: 0 });
    const [itemC] = await searchQueueService.addItemsToQueue(queue2.id, ["verify credits query"]);
    check("credits: run starts", (await searchQueueRunner.start(queue2.id, userId)).started === true);
    check("credits: run finishes", await until(() => !searchQueueRunner.isRunning(queue2.id)));
    const after2 = (await searchQueueService.getQueueWithItems(queue2.id, userId))!;
    check("credits: with 5 credits an emails query is held back and the queue pauses", after2.status === "paused" && after2.items[0].status === "pending" && /Not enough credits: this search needs 160/.test(after2.items[0].errorMessage ?? "") && after2.items[0].searchJobId === null);
    check("a queue with nothing pending refuses to start", (await searchQueueRunner.start(queue.id, userId)).started === false);

    await db.update(searchQueueItems).set({ status: "running" }).where(eq(searchQueueItems.id, itemC.id));
    await db.update(searchQueues).set({ status: "active" }).where(eq(searchQueues.id, queue2.id));
    const recovered = await searchQueueRunner.recoverInterruptedRuns();
    const after3 = (await searchQueueService.getQueueWithItems(queue2.id, userId))!;
    check("recovery: running items go back to pending and active queues pause", recovered.items >= 1 && recovered.queues >= 1 && after3.status === "paused" && after3.items[0].status === "pending");
    check("getUserQueues returns queues with their items", (await searchQueueService.getUserQueues(userId)).find((q) => q.id === queue.id)!.items.length === 3);
    check("getQueuesForStrategy returns the strategy's two groups", (await searchQueueService.getQueuesForStrategy(strategyId, userId)).length === 2);

    // Completing a query adds the run's counts to its metadata and keeps what was there
    const [tagged] = await searchQueueService.addItemsToQueue(queue2.id, ["verify tagged query"]);
    await searchQueueService.mergeItemMetadata(tagged.id, { addedByBotId: 7 });
    await searchQueueService.markItemCompleted(tagged.id, 1, undefined, { addedCount: 2 });
    const taggedAfter = (await searchQueueService.getQueueWithItems(queue2.id, userId))!.items.find((i) => i.id === tagged.id)!;
    check("completing a query merges into its metadata instead of replacing it", (taggedAfter.metadata as any)?.addedByBotId === 7 && (taggedAfter.metadata as any)?.addedCount === 2, taggedAfter.metadata);
  });
}

async function strategyRoutes() {
  console.log("\n# Strategy and query-group routes over HTTP");
  await withUser("verify-routes", 5, async (userId) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { (req as any).user = { id: userId }; (req as any).isAuthenticated = () => true; next(); });
    const passThrough = (_req: any, _res: any, next: any) => next();
    registerStrategiesRoutes(app, passThrough);
    registerSearchQueueRoutes(app as any, passThrough);
    const server = app.listen(0);
    const port = (server.address() as any).port;
    const api = async (method: string, path: string, body?: unknown) => {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, json: await res.json().catch(() => null) };
    };
    try {
      const created = await api("POST", "/api/strategies", { businessType: "service", productService: "Sponsorship packages", customerFeedback: "great", title: "Sponsor outreach" });
      check("POST /api/strategies creates a strategy with a display name", created.status === 200 && created.json.name === "Sponsorship packages");
      const strategyId = created.json.id;
      check("GET /api/strategies lists it", (await api("GET", "/api/strategies")).json.some((s: any) => s.id === strategyId));
      check("GET /api/strategies/:id returns it", (await api("GET", `/api/strategies/${strategyId}`)).json?.id === strategyId);
      check("GET /api/strategies/:id of another user is 404", (await api("GET", "/api/strategies/999999")).status === 404);
      check("POST query-groups validates input", (await api("POST", `/api/strategies/${strategyId}/query-groups`, { name: "", queries: [] })).status === 400);
      const group = await api("POST", `/api/strategies/${strategyId}/query-groups`, { name: "Midsize law firms", queries: ["real estate lawyers in Miami", "family law firms in Fort Lauderdale"], searchType: "emails" });
      check("POST query-groups creates the group and its sending list", group.status === 201 && group.json.strategyId === strategyId && group.json.items.length === 2 && group.json.contactList?.name === "Sponsorship packages: Midsize law firms");
      const groupId = group.json.id;
      const added = await api("POST", `/api/strategies/${strategyId}/query-groups/${groupId}/queries`, { queries: ["business litigation firms in Tampa"] });
      check("POST .../queries adds queries in order", added.status === 200 && added.json.items.length === 3 && added.json.items[2].order === 3);
      check("GET query-groups lists the group", (await api("GET", `/api/strategies/${strategyId}/query-groups`)).json.length === 1);
      const started = await api("POST", `/api/search-queues/${groupId}/execute`);
      check("POST /api/search-queues/:id/execute starts the run", started.status === 200 && started.json.success === true);
      check("run finishes", await until(() => !searchQueueRunner.isRunning(groupId)));
      const g = (await api("GET", `/api/strategies/${strategyId}/query-groups`)).json[0];
      check("with 5 credits the first query is held and the group is paused", g.status === "paused" && g.items[0].status === "pending" && /Not enough credits/.test(g.items[0].errorMessage ?? ""));
      const suggest = await api("POST", `/api/strategies/${strategyId}/query-groups/suggest`, { description: "midsize law firms in Miami" });
      check("POST .../suggest answers (500 without a Perplexity key, 200 with queries when one is set)", suggest.status === 200 ? Array.isArray(suggest.json.queries) : suggest.status === 500, { status: suggest.status });
      check("PATCH /api/strategies/:id updates", (await api("PATCH", `/api/strategies/${strategyId}`, { title: "Sponsor outreach 2" })).json?.title === "Sponsor outreach 2");
      check("DELETE /api/strategies/:id removes it", (await api("DELETE", `/api/strategies/${strategyId}`)).status === 200 && (await api("GET", `/api/strategies/${strategyId}`)).status === 404);
      check("the group's sending list survives the strategy", (await storage.listContactLists(userId)).some((l) => l.name === "Sponsorship packages: Midsize law firms"));
    } finally {
      server.close();
    }
  });
}

try {
  await sharedPieces();
  await queueRunner();
  await strategyRoutes();
} catch (error) {
  console.error("FAIL script error:", error);
  failures++;
} finally {
  await pool.end();
}
console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

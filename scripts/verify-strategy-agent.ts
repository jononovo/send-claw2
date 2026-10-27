/**
 * Runs the strategy agent for real on Claude, with every search simulated: no paid search provider
 * is reachable from this script. Needs ANTHROPIC_API_KEY and a LOCAL database; costs well under a
 * dollar of Claude usage. Creates its own users and removes them (cascade) at the end.
 *
 * Run from the repo root:  npx tsx --env-file=.env scripts/verify-strategy-agent.ts
 * Add --no-model to run only the checks that make no API call (limits, credit hold, refusals).
 */
import { eq, sql } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL ?? "";
const host = (() => { try { return new URL(databaseUrl).hostname; } catch { return ""; } })();
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  console.error(`Refusing to run: DATABASE_URL must point at a local database (host is "${host || "unset"}")`);
  process.exit(1);
}
for (const key of ["PERPLEXITY_API_KEY", "APOLLO_API_KEY", "HUNTER_API_KEY", "OPENAI_API_KEY"]) delete process.env[key];
const noModel = process.argv.includes("--no-model");
if (noModel) delete process.env.ANTHROPIC_API_KEY;
else if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Refusing to run: ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

const { db, pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { SearchListsService } = await import("../server/features/lists/service");
const { jobProcessor } = await import("../server/search/services/job-processor");
const { searchQueueService } = await import("../server/features/search-queues");
const { strategyAgentRunner, StrategyAgentRunError, createStrategyQueryGroup } = await import("../server/features/strategies");
const { buildStrategyAgentTools } = await import("../server/features/strategies/strategy-agent-tools");
const { users, strategicProfiles, userCredits, contactListMembers, contacts, searchQueueItems } = await import("../shared/schema");

let simulatedSearches = 0;
// Every search the agent starts lands here instead of the search providers: three companies, two
// contacts each with an email, and one person (pat@overlap.example) found by every search.
(jobProcessor as any).processJobImmediately = async (jobId: string) => {
  const job = (await storage.getSearchJobByJobId(jobId))!;
  await storage.updateSearchJob(job.id, { status: "processing", startedAt: new Date() });
  const listId = (job.metadata as any).listId as number;
  const words = job.query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const slug = words.join("-").slice(0, 40);
  const title = words.slice(0, 4).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  const companies: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const company = await storage.createCompany({ name: `${title} ${["Partners", "Group", "Associates"][i - 1]}`, website: `${slug}-${i}.example`, description: `A ${job.query} business with about ${10 * i + 20} staff`, city: "Miami", state: "FL", country: "US", userId: job.userId, listId } as any);
    const found: any[] = [];
    for (let j = 1; j <= 2; j++) {
      found.push(await storage.createContact({ name: `Person ${i}${j} ${title}`, email: `p${i}${j}@${slug}-${i}.example`, role: j === 1 ? "Managing Partner" : "Owner", companyId: company.id, userId: job.userId, probability: 80 } as any));
    }
    if (i === 1) found.push(await storage.createContact({ name: "Pat Overlap", email: "pat@overlap.example", role: "Owner", companyId: company.id, userId: job.userId, probability: 70 } as any));
    companies.push({ ...company, contacts: found });
  }
  const results: any = { companies, contacts: companies.flatMap((c) => c.contacts), totalCompanies: companies.length, totalContacts: companies.reduce((n, c) => n + c.contacts.length, 0) };
  const saved = await SearchListsService.createSearchListFromCompletedJob(job, results);
  results.savedSearchId = saved.listId;
  await storage.updateSearchJob(job.id, { status: "completed", completedAt: new Date(), results, resultCount: companies.length });
  simulatedSearches++;
};

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}
async function waitForRun(runId: number, strategyId: number, userId: number, ms = 8 * 60 * 1000) {
  const end = Date.now() + ms;
  while (strategyAgentRunner.isRunning(runId) && Date.now() < end) await new Promise((r) => setTimeout(r, 1000));
  return (await strategyAgentRunner.listRuns(strategyId, userId)).find((run) => run.id === runId)!;
}
async function withStrategy<T>(username: string, balance: number, run: (userId: number, strategy: any) => Promise<T>): Promise<T> {
  const [user] = await db.insert(users).values({ username, password: "x", email: `${username}@example.test` }).returning();
  const [strategy] = await db.insert(strategicProfiles).values({
    userId: user.id, title: "Awards sponsorship", businessType: "service",
    businessDescription: "Sponsorship packages for a local business awards night",
    productService: "Sponsorship packages for a local business awards night",
    targetCustomers: "Professional services firms in South Florida",
  }).returning();
  await db.insert(userCredits).values({ userId: user.id, balance });
  try {
    return await run(user.id, strategy);
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
  }
}

async function abRun() {
  console.log("\n# A/B brief: two groups, a search cap, dedup and lineage");
  await withStrategy("verify-agent-ab", 10000, async (userId, strategy) => {
    const before = simulatedSearches;
    const started = await strategyAgentRunner.start(strategy, {
      brief: "Compare two audiences for our sponsorship packages: midsize law firms in Miami and business brokerages in Florida. Build one list for each.",
      targetContactsPerGroup: 12,
      maxSearches: 4,
    });
    const run = await waitForRun(started.id, strategy.id, userId);
    console.log(`  status ${run.status}, ${run.searchesRun} searches, ${run.modelUsage?.requests} model requests, tokens in/out ${run.modelUsage?.inputTokens}/${run.modelUsage?.outputTokens}, cache read ${run.modelUsage?.cacheReadInputTokens}`);
    for (const step of run.steps) console.log(`  · ${step.kind === "search" ? `search "${step.query}" in ${step.groupName}: ${step.outcome}, +${step.addedToList ?? 0}, ${step.alreadyOnList ?? 0} already, list ${step.groupListSize ?? 0}` : step.kind === "group" ? `group "${step.groupName}" (${step.whoToFind})` : `note: ${step.text.slice(0, 120)}`}`);
    console.log(`  summary: ${(run.summary ?? "").replace(/\s+/g, " ").slice(0, 400)}`);

    check("the run completed with a summary", run.status === "completed" && !!run.summary && !run.error, { status: run.status, error: run.error });
    const groupSteps = run.steps.filter((s) => s.kind === "group");
    const searchSteps = run.steps.filter((s) => s.kind === "search");
    check("the agent created a group for each audience", groupSteps.length === 2, groupSteps.map((s: any) => s.groupName));
    check("it stayed within its 4 searches, each one simulated", run.searchesRun <= 4 && run.searchesRun === simulatedSearches - before && searchSteps.length === run.searchesRun, { searchesRun: run.searchesRun, simulated: simulatedSearches - before });
    check("the model was called more than once and the trace has a reason per search", (run.modelUsage?.requests ?? 0) >= 2 && searchSteps.every((s: any) => s.reason?.length > 0));

    const groups = await searchQueueService.getQueuesForStrategy(strategy.id, userId);
    check("both groups belong to the strategy and have a sending list", groups.length === 2 && groups.every((g) => g.contactListId));
    for (const group of groups) {
      const dupes = await db.execute(sql`select lower(c.email) as email, count(*) as n from ${contactListMembers} m join ${contacts} c on c.id = m.contact_id where m.list_id = ${group.contactListId} group by lower(c.email) having count(*) > 1`);
      check(`list of "${group.name}" holds each email once`, (dupes as any).rows.length === 0, (dupes as any).rows);
      const members = await db.select().from(contactListMembers).where(eq(contactListMembers.listId, group.contactListId!));
      check(`list of "${group.name}" records search, query, group and strategy for every member`, members.length > 0 && members.every((m) => { const meta = m.sourceMetadata as any; return meta?.strategyId === strategy.id && meta?.searchQueueId === group.id && typeof meta?.searchQueueItemId === "number" && typeof meta?.searchListId === "number"; }), members.length);
      const items = await db.select().from(searchQueueItems).where(eq(searchQueueItems.queueId, group.id));
      check(`queries of "${group.name}" keep the agent's tag and reason next to the run's counts`, items.every((i) => { const meta = i.metadata as any; return meta?.addedByStrategyAgentRunId === run.id && typeof meta?.reason === "string" && typeof meta?.addedCount === "number"; }), items.map((i) => i.metadata));
    }
    const repeatSearch = searchSteps.find((s: any) => (s.alreadyOnList ?? 0) > 0);
    const groupsWithTwo = groups.filter((g) => searchSteps.filter((s: any) => s.groupId === g.id).length >= 2);
    check("a second search in a group reports the shared person as already on the list", groupsWithTwo.length === 0 || !!repeatSearch, { groupsWithTwoSearches: groupsWithTwo.length });
  });
}

async function oneRunAtATimeAndStop() {
  console.log("\n# One run per strategy, and Stop");
  await withStrategy("verify-agent-stop", 10000, async (userId, strategy) => {
    const before = simulatedSearches;
    const first = await strategyAgentRunner.start(strategy, { brief: "Find boutique accounting firms in Tampa for our sponsorship packages.", targetContactsPerGroup: 30, maxSearches: 5 });
    let secondRefused = false;
    try { await strategyAgentRunner.start(strategy, { brief: "Find architecture firms in Orlando for our packages." }); } catch (error) { secondRefused = error instanceof StrategyAgentRunError && error.status === 409; }
    check("a second run on the same strategy is refused while one runs", secondRefused);
    check("stop is accepted for the running run", await strategyAgentRunner.requestStop(first.id, strategy.id, userId));
    const run = await waitForRun(first.id, strategy.id, userId);
    check("the stopped run ends as stopped without starting a search", run.status === "stopped" && run.searchesRun === 0 && simulatedSearches === before, { status: run.status, searchesRun: run.searchesRun });
  });
}

async function limitsWithoutTheModel() {
  console.log("\n# Limits, credits and refusals, enforced in code (no API call)");
  await withStrategy("verify-agent-credits", 100, async (_userId, strategy) => {
    let refused: unknown = null;
    try { await strategyAgentRunner.start(strategy, { brief: "Find family law firms in Fort Lauderdale for our sponsorship packages." }); } catch (error) { refused = error; }
    check("a run that cannot afford one search is refused before any model call", refused instanceof StrategyAgentRunError && refused.status === 402, refused instanceof Error ? refused.message : refused);
  });

  await withStrategy("verify-agent-tools", 10000, async (userId, strategy) => {
    const group = await createStrategyQueryGroup(strategy, { name: "Family law firms", queries: [], searchType: "emails" });
    const steps: any[] = [];
    const state: any = {
      runId: 0, strategy, targetContactsPerGroup: 10, maxSearches: 1, maxNewGroups: 1,
      searchesStarted: 0, groupsCreated: 0, strategyGroupIds: new Set([group.id]), haltReason: null,
      isStopRequested: () => false, recordStep: async (step: any) => { steps.push(step); },
    };
    const [createTool, searchTool] = buildStrategyAgentTools(state) as any[];
    const before = simulatedSearches;

    const first = JSON.parse(await searchTool.run({ group_id: group.id, query: "family law firms in Fort Lauderdale", reason: "the brief's audience" }));
    check("a search runs and reports what joined the list", first.outcome === "searched" && first.addedToList === 7 && first.groupListSize === 7 && simulatedSearches === before + 1, first);
    const capped = JSON.parse(await searchTool.run({ group_id: group.id, query: "family law firms in Boca Raton", reason: "a new place" }));
    check("a search past the run's cap is not started", capped.outcome === "not run" && /searches of this run are used/.test(capped.reason) && simulatedSearches === before + 1, capped);
    let wrongGroup = false;
    try { await searchTool.run({ group_id: 999999, query: "family law firms in Miami", reason: "a group outside this strategy" }); } catch (error) { wrongGroup = /not a query group of this strategy/.test(String(error)); }
    check("a search in a group of another strategy is an error", wrongGroup);
    await createTool.run({ name: "Estate lawyers", who_to_find: "estate planning lawyers" });
    const secondGroup = JSON.parse(await createTool.run({ name: "Tax lawyers", who_to_find: "tax lawyers" }));
    check("a group past the run's group cap is not created", secondGroup.outcome === "not created", secondGroup);

    // The balance runs out mid-run: the search is held and every later tool call is refused
    await db.update(userCredits).set({ balance: 100 }).where(eq(userCredits.userId, userId));
    state.maxSearches = 5;
    const held = JSON.parse(await searchTool.run({ group_id: group.id, query: "family law firms in Miami", reason: "a new place" }));
    check("with too few credits the search is held and the run halts", held.outcome === "not run" && /Not enough credits/.test(held.reason) && /Not enough credits/.test(state.haltReason ?? "") && steps.some((step) => step.outcome === "held"), held);
    const after = JSON.parse(await searchTool.run({ group_id: group.id, query: "family law firms in Hollywood FL", reason: "another nearby city" }));
    check("after a halt, later searches are refused without running", after.outcome === "not run" && simulatedSearches === before + 1, after);
  });
}

try {
  if (!noModel) {
    await abRun();
    await oneRunAtATimeAndStop();
  }
  await limitsWithoutTheModel();
} catch (error) {
  console.error("FAIL script error:", error);
  failures++;
} finally {
  await pool.end();
}
console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

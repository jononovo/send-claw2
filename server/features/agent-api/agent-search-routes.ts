import { Router } from "express";
import { z } from "zod";
import type { SearchList } from "@shared/schema";
import { storage } from "../../storage";
import { SearchJobService } from "../../search/services/search-job-service";
import { jobProcessor } from "../../search/services/job-processor";
import {
  contactSearchConfigFor,
  normalizeSearchOptions,
  sameSearchOptions,
  searchOptionsSchema,
  type NormalizedSearchOptions,
  type SearchOptions,
} from "../../search/search-options";
import { SearchListsService } from "../lists/service";
import { agentRoute, parsePositiveIntParam } from "./agent-route-handler";
import { getAgentOwnerUserId } from "./require-claimed-five-ducks-bot";
import {
  AGENT_DAILY_SEARCH_LIMIT,
  agentDailySearchLimitResetsAt,
  countAgentSearchesToday,
} from "./agent-daily-search-limit";
import {
  serializeSavedSearchForAgent,
  serializeSavedSearchSummaryForAgent,
  serializeSearchJobForAgent,
  type AgentSavedSearch,
} from "./agent-response-serializers";

const startSearchBodySchema = z.object({
  query: z.string().trim().min(1),
  type: z.enum(["companies", "contacts", "emails"]),
  strategyId: z.number().int().positive().optional(),
  options: searchOptionsSchema.default({}),
}).refine((body) => body.type !== "companies" || body.options.people === undefined, {
  message: "options.people applies to contacts and emails searches",
  path: ["options", "people"],
});

type AgentSearchType = z.infer<typeof startSearchBodySchema>["type"];

async function loadSavedSearchForAgent(savedSearchId: number, ownerUserId: number): Promise<AgentSavedSearch | null> {
  const savedSearch = await storage.getSearchList(savedSearchId, ownerUserId);
  return savedSearch ? loadSavedSearchResultsForAgent(savedSearch, ownerUserId) : null;
}

async function loadSavedSearchResultsForAgent(savedSearch: SearchList, ownerUserId: number): Promise<AgentSavedSearch> {
  const companies = await storage.listCompaniesBySearchList(savedSearch.listId, ownerUserId);
  const contacts = await storage.listContactsByCompanyIds(companies.map((company) => company.id), ownerUserId);
  return serializeSavedSearchForAgent(savedSearch, companies, contacts);
}

/** A saved search answers a repeat query only if it already holds what the requested type returns. */
function savedSearchCoversType(savedSearch: AgentSavedSearch, type: AgentSearchType): boolean {
  if (type === "companies") return true;
  const contacts = savedSearch.companies.flatMap((company) => company.contacts);
  return type === "contacts" ? contacts.length > 0 : contacts.some((contact) => contact.email);
}

/**
 * How a saved search was run: the options its agent search recorded, else the web app's custom role, else
 * the defaults. The web app doesn't record its other people buttons, so its saved searches count as leadership.
 */
async function searchOptionsOfSavedSearch(savedSearch: SearchList, ownerUserId: number): Promise<NormalizedSearchOptions> {
  const job = await storage.getSearchJobForSavedSearch(savedSearch.listId, ownerUserId);
  const recordedOptions = (job?.metadata as { searchOptions?: SearchOptions | null } | null)?.searchOptions;
  const [customRole] = (savedSearch.customSearchTargets as string[] | null) ?? [];
  return normalizeSearchOptions(recordedOptions ?? { people: customRole });
}

/**
 * The web app's 90-day reuse rule, so a repeat costs nothing: the latest saved search with the same query,
 * if it looked for the same people and already holds what the requested type returns.
 */
async function findReusableSavedSearch(
  query: string,
  type: AgentSearchType,
  searchOptions: NormalizedSearchOptions,
  ownerUserId: number,
): Promise<AgentSavedSearch | null> {
  const recentSearch = await SearchListsService.findRecentSearchByPrompt(query, ownerUserId, true);
  const recentSavedSearch = recentSearch ? await storage.getSearchList(recentSearch.listId, ownerUserId) : undefined;
  if (!recentSavedSearch) return null;
  if (type !== "companies" && !sameSearchOptions(searchOptions, await searchOptionsOfSavedSearch(recentSavedSearch, ownerUserId))) {
    return null;
  }
  const savedSearch = await loadSavedSearchResultsForAgent(recentSavedSearch, ownerUserId);
  return savedSearchCoversType(savedSearch, type) ? savedSearch : null;
}

export const agentSearchRoutes = Router();

agentSearchRoutes.post("/searches", agentRoute(async (req, res) => {
  const parsedBody = startSearchBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid request", details: parsedBody.error.errors });
    return;
  }
  const { query, type, strategyId, options } = parsedBody.data;
  const searchOptions = normalizeSearchOptions(options);
  const ownerUserId = getAgentOwnerUserId(req);

  if (strategyId && !(await storage.getStrategicProfile(strategyId, ownerUserId))) {
    res.status(404).json({ error: "Strategy not found" });
    return;
  }

  const reusableSavedSearch = await findReusableSavedSearch(query, type, searchOptions, ownerUserId);
  if (reusableSavedSearch) {
    res.json({
      jobId: null,
      status: "completed",
      reused: true,
      savedSearchId: reusableSavedSearch.savedSearchId,
      savedSearch: reusableSavedSearch,
    });
    return;
  }

  const searchesUsedToday = await countAgentSearchesToday(ownerUserId);
  if (searchesUsedToday >= AGENT_DAILY_SEARCH_LIMIT) {
    res.status(429).json({
      error: "Daily search limit reached",
      limit: AGENT_DAILY_SEARCH_LIMIT,
      resetsAt: agentDailySearchLimitResetsAt(),
    });
    return;
  }

  const jobId = await SearchJobService.createJob({
    userId: ownerUserId,
    query,
    searchType: type,
    contactSearchConfig: contactSearchConfigFor(searchOptions),
    source: "api",
    metadata: {
      botId: req.agentContext!.botId,
      strategyId: strategyId ?? null,
      saveResultsAsSearchList: true,
      // Recorded only where the options change the results: a companies search finds no people
      searchOptions: type === "companies" ? null : searchOptions,
    },
    priority: 1,
  });

  jobProcessor.processJobImmediately(jobId).catch((error) => {
    console.error(`[AgentAPI] Search job ${jobId} ended with an error (the job's status and error record it):`, error);
  });

  res.status(202).json({
    jobId,
    status: "pending",
    pollUrl: `/api/agent/v1/searches/${jobId}`,
    searchesUsedToday: searchesUsedToday + 1,
    dailyLimit: AGENT_DAILY_SEARCH_LIMIT,
  });
}));

agentSearchRoutes.get("/searches/:jobId", agentRoute(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.jobId).success) {
    res.status(404).json({ error: "Search not found" });
    return;
  }
  const ownerUserId = getAgentOwnerUserId(req);
  const job = await SearchJobService.getJob(req.params.jobId, ownerUserId);
  if (!job) {
    res.status(404).json({ error: "Search not found" });
    return;
  }

  const savedSearchId = (job.results as Record<string, any> | null)?.savedSearchId;
  const savedSearch = job.status === "completed" && savedSearchId
    ? await loadSavedSearchForAgent(savedSearchId, ownerUserId)
    : null;

  res.json(serializeSearchJobForAgent(job, savedSearch));
}));

agentSearchRoutes.get("/saved-searches", agentRoute(async (req, res) => {
  const ownerUserId = getAgentOwnerUserId(req);
  const strategyId = req.query.strategyId === undefined ? null : parsePositiveIntParam(req.query.strategyId);
  if (req.query.strategyId !== undefined && strategyId === null) {
    res.status(400).json({ error: "strategyId must be a positive integer" });
    return;
  }

  const savedSearches = await storage.listSearchLists(ownerUserId);
  const matchingSavedSearches = strategyId === null
    ? savedSearches
    : savedSearches.filter((savedSearch) => savedSearch.strategyId === strategyId);

  res.json({ savedSearches: matchingSavedSearches.map(serializeSavedSearchSummaryForAgent) });
}));

agentSearchRoutes.get("/saved-searches/:savedSearchId", agentRoute(async (req, res) => {
  const savedSearchId = parsePositiveIntParam(req.params.savedSearchId);
  const savedSearch = savedSearchId === null ? null : await loadSavedSearchForAgent(savedSearchId, getAgentOwnerUserId(req));
  if (!savedSearch) {
    res.status(404).json({ error: "Saved search not found" });
    return;
  }
  res.json(savedSearch);
}));

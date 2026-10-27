import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { SearchJobService } from "../../search/services/search-job-service";
import { jobProcessor } from "../../search/services/job-processor";
import { ContactSearchService } from "../../search/services/contact-search-service";
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
});

type AgentSearchType = z.infer<typeof startSearchBodySchema>["type"];

async function loadSavedSearchForAgent(savedSearchId: number, ownerUserId: number): Promise<AgentSavedSearch | null> {
  const savedSearch = await storage.getSearchList(savedSearchId, ownerUserId);
  if (!savedSearch) return null;
  const companies = await storage.listCompaniesBySearchList(savedSearchId, ownerUserId);
  const contacts = await storage.listContactsByCompanyIds(companies.map((company) => company.id), ownerUserId);
  return serializeSavedSearchForAgent(savedSearch, companies, contacts);
}

/** A saved search answers a repeat query only if it already holds what the requested type returns. */
function savedSearchCoversType(savedSearch: AgentSavedSearch, type: AgentSearchType): boolean {
  if (type === "companies") return true;
  const contacts = savedSearch.companies.flatMap((company) => company.contacts);
  return type === "contacts" ? contacts.length > 0 : contacts.some((contact) => contact.email);
}

export const agentSearchRoutes = Router();

agentSearchRoutes.post("/searches", agentRoute(async (req, res) => {
  const parsedBody = startSearchBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid request", details: parsedBody.error.errors });
    return;
  }
  const { query, type, strategyId } = parsedBody.data;
  const ownerUserId = getAgentOwnerUserId(req);

  if (strategyId) {
    const strategies = await storage.getStrategicProfiles(ownerUserId);
    if (!strategies.some((strategy) => strategy.id === strategyId)) {
      res.status(404).json({ error: "Strategy not found" });
      return;
    }
  }

  // Same 90-day reuse rule as the web app, so a repeat costs nothing
  const recentSavedSearch = await SearchListsService.findRecentSearchByPrompt(query, ownerUserId, true);
  if (recentSavedSearch) {
    const savedSearch = await loadSavedSearchForAgent(recentSavedSearch.listId, ownerUserId);
    if (savedSearch && savedSearchCoversType(savedSearch, type)) {
      res.json({ jobId: null, status: "completed", reused: true, savedSearchId: savedSearch.savedSearchId, savedSearch });
      return;
    }
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
    contactSearchConfig: ContactSearchService.getDefaultConfig(),
    source: "api",
    metadata: {
      botId: req.agentContext!.botId,
      strategyId: strategyId ?? null,
      saveResultsAsSearchList: true,
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

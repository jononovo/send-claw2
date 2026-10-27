import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { addQueriesToStrategyQueryGroup, listStrategyQueryGroups, StrategyQueryGroupError } from "../strategies";
import { agentRoute, parsePositiveIntParam } from "./agent-route-handler";
import { getAgentOwnerUserId } from "./require-claimed-five-ducks-bot";
import {
  AGENT_DAILY_SEARCH_LIMIT,
  agentDailySearchLimitResetsAt,
  countAgentSearchesToday,
} from "./agent-daily-search-limit";
import { serializeQueryGroupForAgent, serializeStrategyForAgent } from "./agent-response-serializers";

const addQueriesBodySchema = z.object({
  queries: z.array(z.string().trim().min(1).max(500)).min(1).max(AGENT_DAILY_SEARCH_LIMIT),
});

export const agentStrategyRoutes = Router();

/** Strategies are the sourcing side; their campaigns (the sending side) come from GET /campaigns?strategyId=. */
agentStrategyRoutes.get("/strategies", agentRoute(async (req, res) => {
  const strategies = await storage.getStrategicProfiles(getAgentOwnerUserId(req));
  const queryGroupsByStrategy = await Promise.all(strategies.map((strategy) => listStrategyQueryGroups(strategy)));

  res.json({
    strategies: strategies.map((strategy, index) => serializeStrategyForAgent(strategy, queryGroupsByStrategy[index])),
  });
}));

/**
 * Adds queries to one of the strategy's query groups. Each query counts toward the daily limit, because
 * it becomes a search when the group runs. Agents can't start a run: the owner or the Strategies agent does.
 */
agentStrategyRoutes.post("/strategies/:strategyId/query-groups/:groupId/queries", agentRoute(async (req, res) => {
  const parsedBody = addQueriesBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid request", details: parsedBody.error.errors });
    return;
  }
  const { queries } = parsedBody.data;
  const ownerUserId = getAgentOwnerUserId(req);

  const strategyId = parsePositiveIntParam(req.params.strategyId);
  const strategy = strategyId === null ? undefined : await storage.getStrategicProfile(strategyId, ownerUserId);
  if (!strategy) {
    res.status(404).json({ error: "Strategy not found" });
    return;
  }
  const groupId = parsePositiveIntParam(req.params.groupId);
  if (groupId === null) {
    res.status(404).json({ error: "Query group not found" });
    return;
  }

  const searchesUsedToday = await countAgentSearchesToday(ownerUserId);
  if (searchesUsedToday + queries.length > AGENT_DAILY_SEARCH_LIMIT) {
    res.status(429).json({
      error: "Daily search limit reached",
      limit: AGENT_DAILY_SEARCH_LIMIT,
      remaining: Math.max(0, AGENT_DAILY_SEARCH_LIMIT - searchesUsedToday),
      resetsAt: agentDailySearchLimitResetsAt(),
    });
    return;
  }

  try {
    const group = await addQueriesToStrategyQueryGroup(strategy, groupId, queries, { addedByBotId: req.agentContext!.botId });
    res.status(201).json({
      group: serializeQueryGroupForAgent(group),
      searchesUsedToday: searchesUsedToday + queries.length,
      dailyLimit: AGENT_DAILY_SEARCH_LIMIT,
    });
  } catch (error) {
    if (error instanceof StrategyQueryGroupError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

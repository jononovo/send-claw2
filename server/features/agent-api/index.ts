import { Router, type Express } from "express";
import { requireClaimedFiveDucksBot } from "./require-claimed-five-ducks-bot";
import { agentSearchRoutes } from "./agent-search-routes";
import { agentStrategyRoutes } from "./agent-strategy-routes";
import { agentAccountRoutes } from "./agent-account-routes";
import { agentSendingRoutes } from "./agent-sending-routes";

/**
 * External agent API: claimed 5Ducks bots act as their owner through their SendClaw key.
 * Documented for agents in client/public/tenants/5ducks/SKILL.md.
 */
export function registerAgentApiRoutes(app: Express) {
  const agentApiRouter = Router();

  agentApiRouter.use(requireClaimedFiveDucksBot);
  agentApiRouter.use(agentSearchRoutes);
  agentApiRouter.use(agentStrategyRoutes);
  agentApiRouter.use(agentAccountRoutes);
  agentApiRouter.use(agentSendingRoutes);
  agentApiRouter.use((req, res) => {
    res.status(404).json({ error: "Not found", hint: "See https://fiveducks.ai/SKILL.md for the agent API" });
  });

  app.use("/api/agent/v1", agentApiRouter);
}

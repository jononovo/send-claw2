import { Router } from "express";
import { storage } from "../../storage";
import { agentRoute } from "./agent-route-handler";
import { getAgentOwnerUserId } from "./require-claimed-five-ducks-bot";
import { serializeStrategyForAgent } from "./agent-response-serializers";

export const agentStrategyRoutes = Router();

agentStrategyRoutes.get("/strategies", agentRoute(async (req, res) => {
  const ownerUserId = getAgentOwnerUserId(req);
  const [strategies, campaigns] = await Promise.all([
    storage.getStrategicProfiles(ownerUserId),
    storage.listCampaigns(ownerUserId),
  ]);

  res.json({
    strategies: strategies.map((strategy) =>
      serializeStrategyForAgent(strategy, campaigns.filter((campaign) => campaign.strategicProfileId === strategy.id)),
    ),
  });
}));

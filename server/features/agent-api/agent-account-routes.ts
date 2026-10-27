import { Router } from "express";
import { storage } from "../../storage";
import { CreditService } from "../billing/credits/service";
import { CREDIT_COSTS } from "../billing/credits/types";
import { agentRoute } from "./agent-route-handler";
import { getAgentOwnerUserId } from "./require-claimed-five-ducks-bot";
import {
  AGENT_DAILY_SEARCH_LIMIT,
  agentDailySearchLimitResetsAt,
  countAgentSearchesToday,
} from "./agent-daily-search-limit";

export const agentAccountRoutes = Router();

agentAccountRoutes.get("/account", agentRoute(async (req, res) => {
  const ownerUserId = getAgentOwnerUserId(req);
  const [credits, searchesUsedToday, gmailToken] = await Promise.all([
    CreditService.getUserCredits(ownerUserId),
    countAgentSearchesToday(ownerUserId),
    storage.getOAuthToken(ownerUserId, "gmail"),
  ]);

  res.json({
    credits: { balance: credits.currentBalance },
    searchCosts: {
      companies: CREDIT_COSTS.company_search,
      contacts: CREDIT_COSTS.company_and_contacts,
      emails: CREDIT_COSTS.email_search,
    },
    dailySearches: {
      used: searchesUsedToday,
      limit: AGENT_DAILY_SEARCH_LIMIT,
      resetsAt: agentDailySearchLimitResetsAt(),
    },
    gmailConnected: Boolean(gmailToken),
  });
}));

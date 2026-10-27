import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Bot } from "@shared/schema";
import { apiKeyAuth, loadBotFromApiKey } from "../../sendclaw/common/utils";
import { storage } from "../../storage";

export interface AgentRequestContext {
  botId: string;
  ownerUserId: number;
}

declare global {
  namespace Express {
    interface Request {
      agentContext?: AgentRequestContext;
    }
  }
}

const FIVE_DUCKS_TENANT = "5ducks";

async function requireFiveDucksOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const bot = (req as any).bot as Bot;

    if (!bot.userId) {
      res.status(403).json({
        error: "Bot not claimed",
        hint: "A 5Ducks user must claim this bot with its claim token before it can use the API",
      });
      return;
    }

    if (bot.status && bot.status !== "normal") {
      res.status(403).json({ error: `Bot is ${bot.status}` });
      return;
    }

    const owner = await storage.getUserById(bot.userId);

    // Accounts from before signup_tenant was recorded have it empty and count as 5Ducks accounts
    if (!owner || (owner.signupTenant && owner.signupTenant !== FIVE_DUCKS_TENANT)) {
      res.status(403).json({
        error: "Not a 5Ducks account",
        hint: "Only bots claimed by 5Ducks users can use this API",
      });
      return;
    }

    req.agentContext = { botId: bot.id, ownerUserId: owner.id };
    next();
  } catch (error) {
    console.error("[AgentAPI] Owner check failed:", error);
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * Lets a request through only for a claimed, active bot whose owner signed up on 5Ducks.
 * Handlers then act as that owner through req.agentContext, never through getUserId.
 */
export const requireClaimedFiveDucksBot: RequestHandler[] = [apiKeyAuth, loadBotFromApiKey, requireFiveDucksOwner];

export function getAgentOwnerUserId(req: Request): number {
  if (!req.agentContext) {
    throw new Error("Agent context missing: requireClaimedFiveDucksBot must run first");
  }
  return req.agentContext.ownerUserId;
}

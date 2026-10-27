import { and, eq, gte, sql } from "drizzle-orm";
import { searchJobs } from "@shared/schema";
import { db } from "../../db";

export const AGENT_DAILY_SEARCH_LIMIT = 20;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function agentDailySearchLimitResetsAt(): Date {
  return new Date(startOfTodayUtc().getTime() + ONE_DAY_MS);
}

/**
 * Searches the owner's bots started today (UTC). Counts every agent job, whatever its outcome;
 * jobs from the browser or the strategy runner use other sources and don't count.
 */
export async function countAgentSearchesToday(ownerUserId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchJobs)
    .where(and(
      eq(searchJobs.userId, ownerUserId),
      eq(searchJobs.source, "api"),
      gte(searchJobs.createdAt, startOfTodayUtc()),
    ));
  return row?.count ?? 0;
}

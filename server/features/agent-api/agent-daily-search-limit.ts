import { and, eq, gte, sql } from "drizzle-orm";
import { searchJobs, searchQueueItems, searchQueues } from "@shared/schema";
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
 * The owner's agent searches today (UTC): searches its bots started, plus queries they added to
 * query groups, since each added query becomes a search when the group runs. Every agent search
 * counts, whatever its outcome; searches from the browser or a strategy run don't.
 */
export async function countAgentSearchesToday(ownerUserId: number): Promise<number> {
  const startOfToday = startOfTodayUtc();
  const [[startedSearches], [addedQueries]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchJobs)
      .where(and(
        eq(searchJobs.userId, ownerUserId),
        eq(searchJobs.source, "api"),
        gte(searchJobs.createdAt, startOfToday),
      )),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchQueueItems)
      .innerJoin(searchQueues, eq(searchQueueItems.queueId, searchQueues.id))
      .where(and(
        eq(searchQueues.userId, ownerUserId),
        sql`${searchQueueItems.metadata} ->> 'addedByBotId' IS NOT NULL`,
        // created_at has no time zone: read it in the session's zone to compare with UTC midnight
        sql`(${searchQueueItems.createdAt} AT TIME ZONE current_setting('TimeZone')) >= ${startOfToday.toISOString()}::timestamptz`,
      )),
  ]);
  return (startedSearches?.count ?? 0) + (addedQueries?.count ?? 0);
}

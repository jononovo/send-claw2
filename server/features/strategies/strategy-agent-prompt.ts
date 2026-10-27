/**
 * What the strategy agent is told: its standing instructions, and the opening message that hands it
 * one strategy, the user's brief, the run's limits and the strategy's existing query groups.
 */
import type { StrategicProfile } from "@shared/schema";
import { strategyDisplayName, type StrategyQueryGroup } from "./strategy-query-groups";

export const STRATEGY_AGENT_SYSTEM_PROMPT = `You build prospect lists for one B2B sales strategy in 5Ducks, using two tools.

How searching works in 5Ducks:
- run_search takes a short query, such as "family law firms in Fort Lauderdale", and finds about 7 companies with their leaders and, where it can, their email addresses. Specific queries do best: a niche, a place, or a niche in a place.
- Each search belongs to a query group. A group is one audience of the strategy, for example "Midsize law firms", and it fills its own sending list. Only contacts with an email address join a list, and anyone already on the list is skipped.
- Every search costs credits, so a search that adds nobody new is wasted.

Your job:
- Read the brief and decide which groups it needs: one group for one audience, several when the brief asks to compare audiences. Use an existing group when it already fits the audience; create a group only for a new audience.
- Run searches until each group's list reaches the target, or until the run's searches are used up.
- After each search, look at what came back. If the companies miss the audience, change the wording. If most people were already on the list, move to a new place or niche instead of rephrasing the same one.
- Give every search a one-line reason; the user reads them.

When you finish, reply with a short summary for the user in plain sentences: each group, how many contacts its list gained, which queries worked best, and what you would try next.`;

export interface StrategyAgentOpeningInput {
  strategy: StrategicProfile;
  brief: string;
  groups: StrategyQueryGroup[];
  targetContactsPerGroup: number;
  maxSearches: number;
  maxNewGroups: number;
  creditsPerSearch: number;
  creditBalance: number;
}

/** At most this many earlier queries per group are listed, newest first, to keep the message short. */
const EARLIER_QUERIES_SHOWN_PER_GROUP = 12;

function savedDailyQueries(strategy: StrategicProfile): string[] {
  if (!strategy.dailySearchQueries) return [];
  try {
    const parsed = JSON.parse(strategy.dailySearchQueries);
    return Array.isArray(parsed) ? parsed.filter((query): query is string => typeof query === "string" && query.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function buildStrategyAgentOpeningMessage(input: StrategyAgentOpeningInput): string {
  const { strategy } = input;
  const lines: string[] = [`Strategy: ${strategyDisplayName(strategy)}`];

  const sells = strategy.productService || strategy.businessDescription;
  if (sells) lines.push(`What they sell: ${sells}`);
  if (strategy.targetCustomers) lines.push(`Who they sell to: ${strategy.targetCustomers}`);
  if (strategy.strategyHighLevelBoundary) lines.push(`Target market: ${strategy.strategyHighLevelBoundary}`);
  if (strategy.businessLocation) lines.push(`Where they are: ${strategy.businessLocation}`);
  const examples = savedDailyQueries(strategy);
  if (examples.length > 0) {
    lines.push("Example queries saved with the strategy:", ...examples.map((query) => `- ${query}`));
  }

  lines.push("", "Brief from the user:", input.brief.trim(), "");
  lines.push(
    "Limits for this run:",
    `- Up to ${input.maxSearches} searches, ${input.creditsPerSearch} credits each. The balance is ${input.creditBalance} credits.`,
    `- Target: ${input.targetContactsPerGroup} contacts with an email address in each group's list.`,
    `- Up to ${input.maxNewGroups} new groups.`,
    "",
  );

  if (input.groups.length === 0) {
    lines.push("Existing groups: none yet.");
  } else {
    lines.push("Existing groups:");
    for (const group of input.groups) {
      const listPart = group.contactList
        ? `its list "${group.contactList.name}" has ${group.contactList.contactCount} contacts`
        : "it has no sending list";
      const earlier = group.items
        .filter((item) => item.status === "completed")
        .slice(-EARLIER_QUERIES_SHOWN_PER_GROUP)
        .reverse()
        .map((item) => `"${item.prompt}"`);
      const earlierPart = earlier.length > 0 ? ` Queries already run: ${earlier.join("; ")}.` : "";
      lines.push(`- Group ${group.id} "${group.name}": ${listPart}.${earlierPart}`);
    }
  }

  return lines.join("\n");
}

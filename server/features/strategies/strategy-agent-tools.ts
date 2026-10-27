/**
 * The strategy agent's two tools: create a query group, and run one search in a group. Each tool
 * enforces the run's limits in code; the instructions only describe them. A search goes through the
 * Phase 1 queue runner, so it is charged, reused and added to the group's list exactly as a search
 * a person starts from the strategy page.
 */
import { z } from "zod";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import type { StrategicProfile, StrategyAgentRunStep } from "@shared/schema";
import { storage } from "../../storage";
import { searchQueueRunner, searchQueueService } from "../search-queues";
import { createStrategyQueryGroup } from "./strategy-query-groups";

/** What the tools of one run share with the runner. */
export interface StrategyAgentToolState {
  runId: number;
  strategy: StrategicProfile;
  targetContactsPerGroup: number;
  maxSearches: number;
  maxNewGroups: number;
  searchesStarted: number;
  groupsCreated: number;
  /** The groups this run may search in: the strategy's own groups and the ones the run created. */
  strategyGroupIds: Set<number>;
  /** Set when the user stops the run or the balance runs out; every later tool call is refused. */
  haltReason: string | null;
  isStopRequested: () => boolean;
  recordStep: (step: StrategyAgentRunStep) => Promise<void>;
}

const createQueryGroupInput = z.object({
  name: z.string().trim().min(1).max(80),
  who_to_find: z.string().trim().min(3).max(300),
});

const runSearchInput = z.object({
  group_id: z.number().int().positive(),
  query: z.string().trim().min(3).max(120),
  reason: z.string().trim().min(3).max(300),
});

/** The JSON-schema helper does not validate tool input, so each tool checks its own. */
function parseToolInput<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"} ${issue.message}`).join("; ")}`);
  }
  return parsed.data;
}

const ABOUT_LENGTH = 160;
function shorten(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > ABOUT_LENGTH ? `${flat.slice(0, ABOUT_LENGTH - 1)}…` : flat;
}

function now(): string {
  return new Date().toISOString();
}

/** Builds the tools for one run. Searches of a run go one at a time, in the order the model asks. */
export function buildStrategyAgentTools(state: StrategyAgentToolState) {
  const userId = state.strategy.userId;
  let searchChain: Promise<unknown> = Promise.resolve();
  const oneSearchAtATime = <T>(task: () => Promise<T>): Promise<T> => {
    const result = searchChain.then(task, task);
    searchChain = result.catch(() => undefined);
    return result;
  };

  const refusal = (): string | null => {
    if (state.isStopRequested()) state.haltReason = "The user stopped this run.";
    return state.haltReason;
  };

  const createQueryGroup = betaTool({
    name: "create_query_group",
    description:
      "Create a query group: one audience of this strategy, with its own sending list named after the strategy and the group. Returns the group id to pass to run_search.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Short name of the audience, e.g. "Midsize law firms"' },
        who_to_find: { type: "string", description: "One sentence on who this group should find" },
      },
      required: ["name", "who_to_find"],
      additionalProperties: false,
    },
    run: async (raw) => {
      const input = parseToolInput(createQueryGroupInput, raw);
      const halted = refusal();
      if (halted) return JSON.stringify({ outcome: "not created", reason: halted, next: "Write your summary now." });
      if (state.groupsCreated >= state.maxNewGroups) {
        return JSON.stringify({ outcome: "not created", reason: `This run may create at most ${state.maxNewGroups} groups. Use an existing group.` });
      }
      state.groupsCreated++;

      const group = await createStrategyQueryGroup(state.strategy, { name: input.name, queries: [], searchType: "emails" });
      state.strategyGroupIds.add(group.id);
      await state.recordStep({
        kind: "group",
        at: now(),
        groupId: group.id,
        groupName: group.name,
        whoToFind: input.who_to_find,
        listName: group.contactList?.name ?? null,
      });
      return JSON.stringify({ outcome: "created", groupId: group.id, name: group.name, list: group.contactList?.name, listSize: 0 });
    },
  });

  const runSearch = betaTool({
    name: "run_search",
    description:
      "Run one search in a query group. The contacts it finds with an email address join the group's sending list unless they are already on it. Returns the companies found, how many contacts were new to the list, the list's size and the searches left.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "integer", description: "Id of the query group to search in" },
        query: { type: "string", description: 'A short search query, e.g. "family law firms in Fort Lauderdale"' },
        reason: { type: "string", description: "One line on why this query, shown to the user" },
      },
      required: ["group_id", "query", "reason"],
      additionalProperties: false,
    },
    run: async (raw) => {
      const input = parseToolInput(runSearchInput, raw);
      const halted = refusal();
      if (halted) return JSON.stringify({ outcome: "not run", reason: halted, next: "Write your summary now." });
      if (!state.strategyGroupIds.has(input.group_id)) {
        throw new Error(`Group ${input.group_id} is not a query group of this strategy`);
      }
      if (state.searchesStarted >= state.maxSearches) {
        return JSON.stringify({ outcome: "not run", reason: `All ${state.maxSearches} searches of this run are used.`, next: "Write your summary now." });
      }
      state.searchesStarted++;
      return oneSearchAtATime(() => runOneSearch(input));
    },
  });

  async function runOneSearch(input: z.infer<typeof runSearchInput>): Promise<string> {
    const queue = await searchQueueService.getQueue(input.group_id, userId);
    if (!queue) throw new Error(`Group ${input.group_id} not found`);

    const [item] = await searchQueueService.addItemsToQueue(queue.id, [input.query]);
    await searchQueueService.mergeItemMetadata(item.id, { addedByStrategyAgentRunId: state.runId, reason: input.reason });
    const finished = await searchQueueRunner.runSingleItem(queue.id, item.id, userId);

    const list = queue.contactListId ? await storage.getContactList(queue.contactListId, userId) : undefined;
    const groupListSize = list?.contactCount ?? 0;
    const added = (finished.metadata ?? {}) as {
      addedCount?: number; duplicateCount?: number; otherListDuplicateCount?: number; reusedSavedSearch?: number;
    };
    const searchesLeft = state.maxSearches - state.searchesStarted;
    const base = { at: now(), groupId: queue.id, groupName: queue.name, query: input.query, reason: input.reason };

    if (finished.status === "pending") {
      // The balance could not cover the search: the run ends here
      state.searchesStarted--;
      state.haltReason = finished.errorMessage ?? "Not enough credits for another search.";
      await state.recordStep({ ...base, kind: "search", outcome: "held", error: state.haltReason });
      return JSON.stringify({ outcome: "not run", reason: state.haltReason, next: "Write your summary now." });
    }

    if (finished.status === "failed") {
      await state.recordStep({ ...base, kind: "search", outcome: "failed", error: finished.errorMessage ?? "The search failed" });
      return JSON.stringify({ outcome: "failed", error: finished.errorMessage, searchesLeft });
    }

    const companies = finished.savedSearchNumber ? await storage.listCompaniesBySearchList(finished.savedSearchNumber, userId) : [];
    const contacts = await storage.listContactsByCompanyIds(companies.map((company) => company.id), userId);
    const addedToList = added.addedCount ?? 0;
    const alreadyOnList = (added.duplicateCount ?? 0) + (added.otherListDuplicateCount ?? 0);
    const reused = added.reusedSavedSearch !== undefined;

    await state.recordStep({
      ...base,
      kind: "search",
      outcome: reused ? "reused" : "searched",
      companies: companies.length,
      addedToList,
      alreadyOnList,
      groupListSize,
    });

    return JSON.stringify({
      outcome: reused ? "This query already ran in the last 90 days; its results were reused at no charge." : "searched",
      companies: companies.map((company) => ({
        name: company.name,
        website: company.website ?? undefined,
        location: [company.city, company.state, company.country].filter(Boolean).join(", ") || undefined,
        about: shorten(company.description),
      })),
      contactsFound: contacts.length,
      contactsWithEmail: contacts.filter((contact) => contact.email).length,
      addedToList,
      alreadyOnList,
      groupListSize,
      target: state.targetContactsPerGroup,
      searchesLeft,
    });
  }

  return [createQueryGroup, runSearch];
}

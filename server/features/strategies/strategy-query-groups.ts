/**
 * A strategy's query groups: search queues tagged with the strategy, each filling its own sending
 * list (plans/261026_strategies.md). Two groups of one strategy, say "Midsize law firms" and
 * "Business brokerages", become two lists and so two campaigns whose reply rates can be compared.
 */
import type { ContactList, SearchQueue, StrategicProfile } from "@shared/schema";
import { storage } from "../../storage";
import { generateDailyQueries } from "../../ai-services";
import { searchQueueRunner, searchQueueService, type SearchQueueWithItems } from "../search-queues";

export class StrategyQueryGroupError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type StrategyQueryGroup = SearchQueueWithItems & {
  contactList: Pick<ContactList, "id" | "name" | "contactCount"> | null;
  isRunning: boolean;
};

export interface CreateStrategyQueryGroupInput {
  name: string;
  queries: string[];
  searchType?: SearchQueue["searchType"];
  contactListId?: number | null;
  start?: boolean;
}

/** The name the app shows for a strategy (the same rule the strategy routes use). */
export function strategyDisplayName(strategy: StrategicProfile): string {
  return strategy.businessDescription || strategy.productService || strategy.title || "Strategy";
}

export async function listStrategyQueryGroups(strategy: StrategicProfile): Promise<StrategyQueryGroup[]> {
  const queues = await searchQueueService.getQueuesForStrategy(strategy.id, strategy.userId);
  if (queues.length === 0) return [];

  const lists = await storage.listContactLists(strategy.userId);
  const listById = new Map(lists.map((list) => [list.id, list]));

  return queues.map((queue) => {
    const list = queue.contactListId ? listById.get(queue.contactListId) : undefined;
    return {
      ...queue,
      contactList: list ? { id: list.id, name: list.name, contactCount: list.contactCount } : null,
      isRunning: searchQueueRunner.isRunning(queue.id),
    };
  });
}

/** Creates a group and, unless a sending list is given, a list named after the strategy and the group. */
export async function createStrategyQueryGroup(strategy: StrategicProfile, input: CreateStrategyQueryGroupInput): Promise<StrategyQueryGroup> {
  const name = input.name.trim();

  let contactListId = input.contactListId ?? null;
  if (contactListId) {
    const list = await storage.getContactList(contactListId, strategy.userId);
    if (!list) throw new StrategyQueryGroupError(404, "Sending list not found");
  } else {
    const list = await storage.createContactList({
      userId: strategy.userId,
      name: `${strategyDisplayName(strategy)}: ${name}`,
      description: `Filled by the "${name}" queries of the strategy "${strategyDisplayName(strategy)}"`,
      contactCount: 0,
      isDefault: false,
    });
    contactListId = list.id;
  }

  const queue = await searchQueueService.createQueue({
    userId: strategy.userId,
    name,
    strategyId: strategy.id,
    contactListId,
    ...(input.searchType ? { searchType: input.searchType } : {}),
  });
  await searchQueueService.addItemsToQueue(queue.id, input.queries);

  if (input.start) {
    await searchQueueRunner.start(queue.id, strategy.userId);
  }

  return loadStrategyQueryGroup(strategy, queue.id);
}

export async function addQueriesToStrategyQueryGroup(strategy: StrategicProfile, queueId: number, queries: string[]): Promise<StrategyQueryGroup> {
  const queue = await searchQueueService.getQueue(queueId, strategy.userId);
  if (!queue || queue.strategyId !== strategy.id) throw new StrategyQueryGroupError(404, "Query group not found");

  await searchQueueService.addItemsToQueue(queueId, queries);
  if (queue.status === "completed") {
    // A finished group with new queries can be run again
    await searchQueueService.updateQueue(queueId, strategy.userId, { status: "paused" });
  }
  return loadStrategyQueryGroup(strategy, queueId);
}

/** Query ideas for a group, from the same generator that writes a strategy's daily queries. */
export async function suggestQueriesForStrategyQueryGroup(strategy: StrategicProfile, description: string): Promise<string[]> {
  const productContext = { productService: strategy.productService || strategy.businessDescription || strategy.title };
  const sprintPrompt = strategy.exampleSprintPlanningPrompt || description;
  return generateDailyQueries(description, sprintPrompt, productContext);
}

async function loadStrategyQueryGroup(strategy: StrategicProfile, queueId: number): Promise<StrategyQueryGroup> {
  const group = (await listStrategyQueryGroups(strategy)).find((candidate) => candidate.id === queueId);
  if (!group) throw new StrategyQueryGroupError(404, "Query group not found");
  return group;
}

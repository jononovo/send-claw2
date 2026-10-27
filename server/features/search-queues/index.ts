/**
 * Search queues: ordered groups of search queries that run as search jobs and fill a sending list.
 * A queue with a `strategyId` is one of that strategy's query groups (plans/261026_strategies.md).
 */
import { db } from "../../db";
import { SearchQueueService } from "./service";
import { SearchQueueRunner } from "./queue-runner";

export const searchQueueService = new SearchQueueService(db as any);
export const searchQueueRunner = new SearchQueueRunner(searchQueueService);

export { SearchQueueService } from "./service";
export type { SearchQueueWithItems, SearchQueueItemWithSavedSearch } from "./service";
export { SearchQueueRunner } from "./queue-runner";

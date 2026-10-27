import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { 
  searchQueues, 
  searchQueueItems,
  searchLists,
  SearchQueue, 
  SearchQueueItem,
  InsertSearchQueue,
  InsertSearchQueueItem 
} from "@shared/schema";

/** Adds keys to an item's metadata in the same statement, keeping keys other writers put there. */
function mergedItemMetadata(metadata: Record<string, unknown>) {
  return sql`coalesce(${searchQueueItems.metadata}, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb`;
}

/** A queue item plus the public number of the saved search it produced (`search_lists.list_id`). */
export type SearchQueueItemWithSavedSearch = SearchQueueItem & { savedSearchNumber: number | null };
export type SearchQueueWithItems = SearchQueue & { items: SearchQueueItemWithSavedSearch[] };

export class SearchQueueService {
  constructor(private db: PostgresJsDatabase) {}

  // Get all queues for a user, each with its items in order
  async getUserQueues(userId: number): Promise<SearchQueueWithItems[]> {
    const queues = await this.db
      .select()
      .from(searchQueues)
      .where(eq(searchQueues.userId, userId))
      .orderBy(desc(searchQueues.updatedAt));
    return this.attachItems(queues);
  }

  // Get a strategy's query groups, each with its items in order
  async getQueuesForStrategy(strategyId: number, userId: number): Promise<SearchQueueWithItems[]> {
    const queues = await this.db
      .select()
      .from(searchQueues)
      .where(and(eq(searchQueues.strategyId, strategyId), eq(searchQueues.userId, userId)))
      .orderBy(asc(searchQueues.createdAt));
    return this.attachItems(queues);
  }

  private async attachItems(queues: SearchQueue[]): Promise<SearchQueueWithItems[]> {
    if (queues.length === 0) return [];
    const items = await this.db
      .select()
      .from(searchQueueItems)
      .where(inArray(searchQueueItems.queueId, queues.map(queue => queue.id)))
      .orderBy(asc(searchQueueItems.queueId), asc(searchQueueItems.order));

    const savedSearchIds = items.map(item => item.listId).filter((id): id is number => id !== null);
    const savedSearchNumbers = new Map<number, number>();
    if (savedSearchIds.length > 0) {
      const rows = await this.db
        .select({ id: searchLists.id, listId: searchLists.listId })
        .from(searchLists)
        .where(inArray(searchLists.id, savedSearchIds));
      rows.forEach(row => savedSearchNumbers.set(row.id, row.listId));
    }

    return queues.map(queue => ({
      ...queue,
      items: items
        .filter(item => item.queueId === queue.id)
        .map(item => ({ ...item, savedSearchNumber: item.listId ? savedSearchNumbers.get(item.listId) ?? null : null }))
    }));
  }

  // Get a single queue
  async getQueue(queueId: number, userId: number): Promise<SearchQueue | null> {
    const [queue] = await this.db
      .select()
      .from(searchQueues)
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ))
      .limit(1);
    
    return queue || null;
  }

  // Get queue with all its items
  async getQueueWithItems(queueId: number, userId: number): Promise<SearchQueueWithItems | null> {
    const queue = await this.getQueue(queueId, userId);
    if (!queue) return null;
    const [withItems] = await this.attachItems([queue]);
    return withItems;
  }

  // Create a new queue; anything not given takes the column default (search type emails, 30-second delay, continue on failure)
  async createQueue(data: Pick<InsertSearchQueue, 'userId' | 'name'> & Partial<Omit<InsertSearchQueue, 'userId' | 'name'>>): Promise<SearchQueue> {
    const [queue] = await this.db
      .insert(searchQueues)
      .values({
        ...data,
        status: 'paused',
        metadata: {}
      })
      .returning();
    
    return queue;
  }

  // Update queue settings
  async updateQueue(
    queueId: number, 
    userId: number, 
    updates: Partial<Omit<SearchQueue, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SearchQueue | null> {
    const [updated] = await this.db
      .update(searchQueues)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ))
      .returning();
    
    return updated || null;
  }

  // Delete a queue
  async deleteQueue(queueId: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(searchQueues)
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ));
    
    return true; // Drizzle doesn't return affected rows directly
  }

  // Add item to queue
  async addItemToQueue(queueId: number, prompt: string): Promise<SearchQueueItem> {
    // Get the current max order for this queue
    const [maxOrderResult] = await this.db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${searchQueueItems.order}), 0)` })
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId));
    
    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;
    
    const [item] = await this.db
      .insert(searchQueueItems)
      .values({
        queueId,
        prompt,
        order: nextOrder,
        status: 'pending',
        metadata: {}
      })
      .returning();
    
    // Update queue's updatedAt timestamp
    await this.db
      .update(searchQueues)
      .set({ updatedAt: new Date() })
      .where(eq(searchQueues.id, queueId));
    
    return item;
  }

  // Add several items to a queue in the order given (a strategy's query group arrives as a list).
  // itemMetadata goes on every new item, e.g. { addedByBotId } for queries added through the agent API.
  async addItemsToQueue(queueId: number, prompts: string[], itemMetadata: Record<string, unknown> = {}): Promise<SearchQueueItem[]> {
    const cleaned = prompts.map(prompt => prompt.trim()).filter(prompt => prompt.length > 0);
    if (cleaned.length === 0) return [];

    const [maxOrderResult] = await this.db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${searchQueueItems.order}), 0)` })
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId));
    const firstOrder = (maxOrderResult?.maxOrder || 0) + 1;

    const items = await this.db
      .insert(searchQueueItems)
      .values(cleaned.map((prompt, index) => ({ queueId, prompt, order: firstOrder + index, status: 'pending' as const, metadata: itemMetadata })))
      .returning();

    await this.db
      .update(searchQueues)
      .set({ updatedAt: new Date() })
      .where(eq(searchQueues.id, queueId));

    return items;
  }

  // Whether the queue still has queries to run
  async hasPendingItems(queueId: number): Promise<boolean> {
    const [pending] = await this.db
      .select({ id: searchQueueItems.id })
      .from(searchQueueItems)
      .where(and(eq(searchQueueItems.queueId, queueId), eq(searchQueueItems.status, 'pending')))
      .limit(1);
    return !!pending;
  }

  // Delete item from queue
  async deleteItemFromQueue(itemId: number, queueId: number): Promise<boolean> {
    // Get the item's order first
    const [item] = await this.db
      .select({ order: searchQueueItems.order })
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.id, itemId),
        eq(searchQueueItems.queueId, queueId)
      ))
      .limit(1);
    
    if (!item) return false;
    
    // Delete the item
    await this.db
      .delete(searchQueueItems)
      .where(eq(searchQueueItems.id, itemId));
    
    // Reorder remaining items
    await this.db
      .update(searchQueueItems)
      .set({ 
        order: sql`${searchQueueItems.order} - 1` 
      })
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        sql`${searchQueueItems.order} > ${item.order}`
      ));
    
    // Update queue's updatedAt timestamp
    await this.db
      .update(searchQueues)
      .set({ updatedAt: new Date() })
      .where(eq(searchQueues.id, queueId));
    
    return true;
  }

  // Reorder items in queue
  async reorderItems(queueId: number, items: Array<{ id: number; order: number }>) {
    // Update each item's order in a transaction
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(searchQueueItems)
          .set({ order: item.order })
          .where(and(
            eq(searchQueueItems.id, item.id),
            eq(searchQueueItems.queueId, queueId)
          ));
      }
      
      // Update queue's updatedAt timestamp
      await tx
        .update(searchQueues)
        .set({ updatedAt: new Date() })
        .where(eq(searchQueues.id, queueId));
    });
  }

  // Pause queue execution
  async pauseQueue(queueId: number) {
    await this.db
      .update(searchQueues)
      .set({ 
        status: 'paused',
        updatedAt: new Date()
      })
      .where(eq(searchQueues.id, queueId));
    
    // Mark any running items back to pending
    await this.db
      .update(searchQueueItems)
      .set({ status: 'pending' })
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'running')
      ));
  }

  // Update queue item
  async updateQueueItem(
    itemId: number, 
    updates: Partial<Omit<SearchQueueItem, 'id' | 'queueId' | 'createdAt'>>
  ): Promise<SearchQueueItem | null> {
    const [updated] = await this.db
      .update(searchQueueItems)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(searchQueueItems.id, itemId))
      .returning();
    
    return updated || null;
  }

  // Get queue status and metrics
  async getQueueStatus(queueId: number, userId: number) {
    const queue = await this.getQueue(queueId, userId);
    
    if (!queue) return null;
    
    // Get item counts by status
    const statusCounts = await this.db
      .select({
        status: searchQueueItems.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId))
      .groupBy(searchQueueItems.status);
    
    // Get total results count
    const [totalResults] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${searchQueueItems.resultCount}), 0)::int`
      })
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'completed')
      ));
    
    const counts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0
    };
    
    statusCounts.forEach(sc => {
      counts[sc.status as keyof typeof counts] = sc.count;
    });
    
    return {
      queue,
      metrics: {
        ...counts,
        totalResults: totalResults?.total || 0,
        totalItems: counts.pending + counts.running + counts.completed + counts.failed
      }
    };
  }

  // Process next item in active queues (called by background job)
  async processNextQueueItem(queueId: number): Promise<SearchQueueItem | null> {
    // Get the next pending item
    const [nextItem] = await this.db
      .select()
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'pending')
      ))
      .orderBy(asc(searchQueueItems.order))
      .limit(1);
    
    if (!nextItem) {
      // No more items, mark queue as completed
      await this.db
        .update(searchQueues)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(searchQueues.id, queueId));
      
      return null;
    }
    
    // Mark item as running
    await this.updateQueueItem(nextItem.id, {
      status: 'running',
      startedAt: new Date()
    });
    
    return nextItem;
  }

  // Mark item as completed; `listId` is the saved search's row id, `metadata` what the run recorded
  // (contacts added, reuse), merged into the item's metadata so tags such as who added it survive
  async markItemCompleted(
    itemId: number, 
    resultCount: number, 
    listId?: number,
    metadata?: Record<string, unknown>
  ) {
    await this.db
      .update(searchQueueItems)
      .set({
        status: 'completed',
        completedAt: new Date(),
        errorMessage: null,
        resultCount,
        listId,
        updatedAt: new Date(),
        ...(metadata ? { metadata: mergedItemMetadata(metadata) } : {})
      })
      .where(eq(searchQueueItems.id, itemId));
  }

  // Add keys to an item's metadata, keeping the keys already there
  async mergeItemMetadata(itemId: number, metadata: Record<string, unknown>) {
    await this.db
      .update(searchQueueItems)
      .set({ metadata: mergedItemMetadata(metadata), updatedAt: new Date() })
      .where(eq(searchQueueItems.id, itemId));
  }

  // Mark item as failed
  async markItemFailed(itemId: number, errorMessage: string) {
    await this.updateQueueItem(itemId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage
    });
  }
}
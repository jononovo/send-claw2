/**
 * Runs a search queue: one search job per queued query, in order. Each search is saved as a saved
 * search tagged with the queue's strategy, and its contacts with emails are added to the queue's
 * sending list, with a note of which search, group and strategy they came from.
 *
 * A queue is a strategy's query group (plans/261026_strategies.md). The runner drives its jobs
 * itself instead of leaving them to the job processor's 30-second poll, so ten queries take as
 * long as the searches do. One run per queue per process; a server restart pauses interrupted
 * queues (see `recoverInterruptedRuns`) rather than spending credits unwatched.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { searchJobs, searchQueues, searchQueueItems, type SearchJob, type SearchQueue, type SearchQueueItem } from "@shared/schema";
import { SearchJobService } from "../../search/services/search-job-service";
import { jobProcessor } from "../../search/services/job-processor";
import { ContactSearchService } from "../../search/services/contact-search-service";
import { delay } from "../../search/services/joke-service";
import { SearchListsService } from "../lists/service";
import type { CompletedSearchJobResults } from "../lists/types";
import { CreditService } from "../billing/credits/service";
import { CREDIT_COSTS, type SearchType as CreditSearchType } from "../billing/credits/types";
import { SearchQueueService, type SearchQueueItemWithSavedSearch } from "./service";

/** The credit charge a queue's search type incurs (the same charge `executeJob` applies). */
const CREDIT_TYPE_BY_SEARCH_TYPE: Record<SearchQueue["searchType"], CreditSearchType> = {
  companies: "company_search",
  contacts: "company_and_contacts",
  emails: "email_search",
};

/** A query that already ran this recently is reused instead of run and charged again. */
const REPEAT_WINDOW_DAYS = 90;

/** After the job processor's own 2-minute timeout, keep checking the job this long before giving up. */
const JOB_WAIT_LIMIT_MS = 10 * 60 * 1000;
const JOB_WAIT_POLL_MS = 3000;

type ItemOutcome = "continue" | "stop";

export interface QueueRunStart {
  started: boolean;
  reason?: string;
}

export class SearchQueueRunner {
  private readonly runningQueueIds = new Set<number>();

  constructor(private readonly queues: SearchQueueService) {}

  /** Marks the queue active and processes it in the background; returns at once. */
  async start(queueId: number, userId: number): Promise<QueueRunStart> {
    const queue = await this.queues.getQueue(queueId, userId);
    if (!queue) return { started: false, reason: "Queue not found" };
    if (this.runningQueueIds.has(queueId)) return { started: true, reason: "Already running" };
    if (!(await this.queues.hasPendingItems(queueId))) return { started: false, reason: "No pending queries" };

    await this.queues.updateQueue(queueId, userId, { status: "active" });
    this.runningQueueIds.add(queueId);
    void this.processQueue(queueId, userId)
      .catch((error) => console.error(`[SearchQueueRunner] Queue ${queueId} stopped with an error:`, error))
      .finally(() => this.runningQueueIds.delete(queueId));

    return { started: true };
  }

  isRunning(queueId: number): boolean {
    return this.runningQueueIds.has(queueId);
  }

  /**
   * Runs one pending query of a queue now, outside the queue's own run; the strategy agent searches
   * this way. Returns the item as it ended: completed, failed, or pending again when the balance
   * could not cover it (the queue is then paused, as in a normal run).
   */
  async runSingleItem(queueId: number, itemId: number, userId: number): Promise<SearchQueueItemWithSavedSearch> {
    const queue = await this.queues.getQueue(queueId, userId);
    if (!queue) throw new Error("Query group not found");
    if (this.runningQueueIds.has(queueId)) throw new Error("This query group is already running");
    const item = (await this.queues.getQueueWithItems(queueId, userId))?.items.find((candidate) => candidate.id === itemId);
    if (!item || item.status !== "pending") throw new Error("Query not found or not pending");

    this.runningQueueIds.add(queueId);
    try {
      await this.queues.updateQueueItem(itemId, { status: "running", startedAt: new Date() });
      await this.runItem({ ...queue, continueOnFailure: true }, item);
      if (!(await this.queues.hasPendingItems(queueId))) {
        await this.queues.updateQueue(queueId, userId, { status: "completed" });
      }
    } finally {
      this.runningQueueIds.delete(queueId);
    }

    const finished = (await this.queues.getQueueWithItems(queueId, userId))?.items.find((candidate) => candidate.id === itemId);
    if (!finished) throw new Error("Query disappeared while it ran");
    return finished;
  }

  /**
   * Called at server start. Items left `running` by a previous process go back to `pending` and
   * their queues are paused, so a restart never resumes spending on its own.
   */
  async recoverInterruptedRuns(): Promise<{ items: number; queues: number }> {
    const items = await db
      .update(searchQueueItems)
      .set({
        status: "pending",
        startedAt: null,
        errorMessage: "The server restarted during this search. It runs again when the group is resumed.",
        updatedAt: new Date(),
      })
      .where(eq(searchQueueItems.status, "running"))
      .returning({ id: searchQueueItems.id });

    const queues = await db
      .update(searchQueues)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(searchQueues.status, "active"))
      .returning({ id: searchQueues.id });

    if (items.length || queues.length) {
      console.log(`[SearchQueueRunner] Recovered ${items.length} interrupted item(s); paused ${queues.length} queue(s)`);
    }
    return { items: items.length, queues: queues.length };
  }

  private async processQueue(queueId: number, userId: number): Promise<void> {
    while (true) {
      const queue = await this.queues.getQueue(queueId, userId);
      if (!queue || queue.status !== "active") return; // paused or deleted while running

      const item = await this.queues.processNextQueueItem(queueId); // marks it running, or completes the queue
      if (!item) return;

      const outcome = await this.runItem(queue, item);
      if (outcome === "stop") return;

      const delaySeconds = queue.delayBetweenSearches ?? 0;
      if (delaySeconds > 0 && (await this.queues.hasPendingItems(queueId))) {
        await delay(delaySeconds * 1000);
      }
    }
  }

  private async runItem(queue: SearchQueue, item: SearchQueueItem): Promise<ItemOutcome> {
    try {
      // A query interrupted by a restart may have a job that finished without us.
      const earlierJob = item.searchJobId ? await this.findJob(item.searchJobId) : null;
      if (earlierJob && earlierJob.status !== "failed") {
        const job = earlierJob.status === "completed" ? earlierJob : await this.waitForJob(earlierJob.jobId);
        await this.finishItemFromJob(queue, item, job);
        return "continue";
      }

      // A query already run within the window is reused, not run and charged again.
      const recent = await SearchListsService.findRecentSearchByPrompt(item.prompt, queue.userId, true, REPEAT_WINDOW_DAYS);
      if (recent) {
        const savedSearch = await storage.getSearchList(recent.listId, queue.userId);
        const added = await this.addSavedSearchContactsToList(queue, item, recent.listId);
        await this.queues.markItemCompleted(item.id, recent.resultCount, savedSearch?.id, { reusedSavedSearch: recent.listId, ...added });
        return "continue";
      }

      // The balance must cover this query; otherwise the item goes back to pending and the queue pauses.
      const cost = CREDIT_COSTS[CREDIT_TYPE_BY_SEARCH_TYPE[queue.searchType]];
      const credits = await CreditService.getUserCredits(queue.userId);
      if (credits.currentBalance < cost) {
        await this.queues.updateQueueItem(item.id, {
          status: "pending",
          startedAt: null,
          errorMessage: `Not enough credits: this search needs ${cost}, the balance is ${credits.currentBalance}. Resume the group after topping up.`,
        });
        await this.queues.pauseQueue(queue.id);
        return "stop";
      }

      const jobId = await SearchJobService.createJob({
        userId: queue.userId,
        query: item.prompt,
        searchType: queue.searchType,
        contactSearchConfig: ContactSearchService.getDefaultConfig(),
        source: "strategy",
        metadata: {
          saveResultsAsSearchList: true,
          strategyId: queue.strategyId ?? undefined,
          searchQueueId: queue.id,
          searchQueueItemId: item.id,
        },
        priority: 2,
      });
      const createdJob = await storage.getSearchJobByJobId(jobId);
      await this.queues.updateQueueItem(item.id, { searchJobId: createdJob?.id ?? null });

      let job: SearchJob;
      try {
        await jobProcessor.processJobImmediately(jobId);
        job = await this.waitForJob(jobId);
      } catch (error) {
        // The processor's 2-minute race can reject while the search is still running; keep watching it.
        if (error instanceof Error && error.message === "Job execution timeout") {
          job = await this.waitForJob(jobId);
        } else {
          throw error;
        }
      }

      await this.finishItemFromJob(queue, item, job);
      return "continue";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SearchQueueRunner] Queue ${queue.id} item ${item.id} ("${item.prompt}") failed: ${message}`);
      await this.queues.markItemFailed(item.id, message);
      if (queue.continueOnFailure) return "continue";
      await this.queues.pauseQueue(queue.id);
      return "stop";
    }
  }

  private async finishItemFromJob(queue: SearchQueue, item: SearchQueueItem, job: SearchJob): Promise<void> {
    if (job.status !== "completed") {
      throw new Error(job.error || `Search job ${job.jobId} ended with status ${job.status}`);
    }
    const savedSearchNumber = (job.results as CompletedSearchJobResults | null)?.savedSearchId;
    if (!savedSearchNumber) {
      throw new Error(`Search job ${job.jobId} completed but no saved search was created`);
    }
    const savedSearch = await storage.getSearchList(savedSearchNumber, queue.userId);
    const added = await this.addSavedSearchContactsToList(queue, item, savedSearchNumber);
    await this.queues.markItemCompleted(item.id, job.resultCount ?? 0, savedSearch?.id, added);
  }

  /** Adds the saved search's contacts with emails to the queue's sending list, recording where they came from. */
  private async addSavedSearchContactsToList(queue: SearchQueue, item: SearchQueueItem, savedSearchNumber: number) {
    const none = { addedCount: 0, duplicateCount: 0, noEmailCount: 0, otherListDuplicateCount: 0 };
    if (!queue.contactListId) return none;

    const companies = await storage.listCompaniesBySearchList(savedSearchNumber, queue.userId);
    const contacts = await storage.listContactsByCompanyIds(companies.map((company) => company.id), queue.userId);
    if (contacts.length === 0) return none;

    return storage.addContactsToList(
      queue.contactListId,
      contacts.map((contact) => contact.id),
      "search_list",
      queue.userId,
      { searchListId: savedSearchNumber, searchQueueId: queue.id, searchQueueItemId: item.id, strategyId: queue.strategyId },
    );
  }

  private async findJob(id: number): Promise<SearchJob | null> {
    const [job] = await db.select().from(searchJobs).where(eq(searchJobs.id, id)).limit(1);
    return job ?? null;
  }

  /** Waits for a job to leave pending/processing; the job processor may re-run a stuck job in the meantime. */
  private async waitForJob(jobId: string): Promise<SearchJob> {
    const deadline = Date.now() + JOB_WAIT_LIMIT_MS;
    while (true) {
      const job = await storage.getSearchJobByJobId(jobId);
      if (!job) throw new Error(`Search job ${jobId} disappeared`);
      if (job.status === "completed" || job.status === "failed") return job;
      if (Date.now() > deadline) throw new Error(`Search job ${jobId} did not finish within ${JOB_WAIT_LIMIT_MS / 60000} minutes`);
      await delay(JOB_WAIT_POLL_MS);
    }
  }
}

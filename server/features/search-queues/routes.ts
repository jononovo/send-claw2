import { Express, Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "../../utils/auth";
import { searchQueueService, searchQueueRunner } from "./index";

// Request validation schemas
const createQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  strategyId: z.number().optional().nullable(),
  contactListId: z.number().optional().nullable(),
  searchType: z.enum(['companies', 'contacts', 'emails']).optional(),
  campaignId: z.number().optional().nullable()
});

const addQueueItemSchema = z.object({
  prompt: z.string().min(1, "Search prompt is required")
});

const updateQueueSchema = z.object({
  name: z.string().optional(),
  strategyId: z.number().optional().nullable(),
  contactListId: z.number().optional().nullable(),
  searchType: z.enum(['companies', 'contacts', 'emails']).optional(),
  campaignId: z.number().optional().nullable(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  autoRunEnabled: z.boolean().optional(),
  autoRunThreshold: z.number().optional(),
  delayBetweenSearches: z.number().optional(),
  continueOnFailure: z.boolean().optional(),
  removeCompletedSearches: z.boolean().optional(),
  notifyOnComplete: z.boolean().optional()
});

const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    order: z.number()
  }))
});

export function registerSearchQueueRoutes(app: Express, requireAuth: any) {
  const service = searchQueueService;

  // Get all search queues for the current user
  app.get("/api/search-queues", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queues = await service.getUserQueues(userId);
      res.json(queues);
    } catch (error) {
      console.error("Error fetching search queues:", error);
      res.status(500).json({ error: "Failed to fetch search queues" });
    }
  });

  // Get a specific search queue with items
  app.get("/api/search-queues/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const queue = await service.getQueueWithItems(queueId, userId);
      
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      res.json(queue);
    } catch (error) {
      console.error("Error fetching search queue:", error);
      res.status(500).json({ error: "Failed to fetch search queue" });
    }
  });

  // Create a new search queue
  app.post("/api/search-queues", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const validation = createQueueSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.flatten() });
      }
      
      const queue = await service.createQueue({
        ...validation.data,
        userId
      });
      
      res.json(queue);
    } catch (error) {
      console.error("Error creating search queue:", error);
      res.status(500).json({ error: "Failed to create search queue" });
    }
  });

  // Update a search queue
  app.patch("/api/search-queues/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const validation = updateQueueSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.flatten() });
      }
      
      const queue = await service.updateQueue(queueId, userId, validation.data);
      
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      res.json(queue);
    } catch (error) {
      console.error("Error updating search queue:", error);
      res.status(500).json({ error: "Failed to update search queue" });
    }
  });

  // Delete a search queue
  app.delete("/api/search-queues/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const deleted = await service.deleteQueue(queueId, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting search queue:", error);
      res.status(500).json({ error: "Failed to delete search queue" });
    }
  });

  // Add item to queue
  app.post("/api/search-queues/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const validation = addQueueItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.flatten() });
      }
      
      // Verify the queue belongs to the user
      const queue = await service.getQueue(queueId, userId);
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      const item = await service.addItemToQueue(queueId, validation.data.prompt);
      res.json(item);
    } catch (error) {
      console.error("Error adding item to queue:", error);
      res.status(500).json({ error: "Failed to add item to queue" });
    }
  });

  // Delete item from queue
  app.delete("/api/search-queues/:queueId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.queueId);
      const itemId = parseInt(req.params.itemId);
      
      // Verify the queue belongs to the user
      const queue = await service.getQueue(queueId, userId);
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      const deleted = await service.deleteItemFromQueue(itemId, queueId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Queue item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting queue item:", error);
      res.status(500).json({ error: "Failed to delete queue item" });
    }
  });

  // Reorder items in queue
  app.post("/api/search-queues/:id/reorder", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const validation = reorderItemsSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.flatten() });
      }
      
      // Verify the queue belongs to the user
      const queue = await service.getQueue(queueId, userId);
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      await service.reorderItems(queueId, validation.data.items);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering queue items:", error);
      res.status(500).json({ error: "Failed to reorder queue items" });
    }
  });

  // Execute search queue
  app.post("/api/search-queues/:id/execute", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      // Verify the queue belongs to the user
      const queue = await service.getQueue(queueId, userId);
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      // Start the queue run in the background; the runner reports progress on the items
      const start = await searchQueueRunner.start(queueId, userId);
      if (!start.started) {
        return res.status(400).json({ error: start.reason });
      }

      res.json({ success: true, message: start.reason === "Already running" ? "Queue is already running" : "Queue execution started" });
    } catch (error) {
      console.error("Error executing search queue:", error);
      res.status(500).json({ error: "Failed to execute search queue" });
    }
  });

  // Pause search queue execution
  app.post("/api/search-queues/:id/pause", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      // Verify the queue belongs to the user
      const queue = await service.getQueue(queueId, userId);
      if (!queue) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      await service.pauseQueue(queueId);
      
      res.json({ success: true, message: "Queue execution paused" });
    } catch (error) {
      console.error("Error pausing search queue:", error);
      res.status(500).json({ error: "Failed to pause search queue" });
    }
  });

  // Get queue status and metrics
  app.get("/api/search-queues/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const queueId = parseInt(req.params.id);
      
      const status = await service.getQueueStatus(queueId, userId);
      
      if (!status) {
        return res.status(404).json({ error: "Search queue not found" });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error fetching queue status:", error);
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });
}
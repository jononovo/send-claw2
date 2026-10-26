/**
 * Strategies: what a user sells and who they target, plus the query groups that source leads for it.
 * The table is still `strategic_profiles`, and parts of the app show a strategy as a Product; these
 * routes replace the former twin routes /api/products and /api/strategic-profiles.
 */
import { Application, Request, Response } from "express";
import { z } from "zod";
import type { StrategicProfile } from "@shared/schema";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import {
  StrategyQueryGroupError,
  addQueriesToStrategyQueryGroup,
  createStrategyQueryGroup,
  listStrategyQueryGroups,
  strategyDisplayName,
  suggestQueriesForStrategyQueryGroup,
} from "./strategy-query-groups";

/** The shape the client reads: the profile plus the display name it has always derived. */
function withDisplayName(profile: StrategicProfile) {
  return { ...profile, name: strategyDisplayName(profile) };
}

const createQueryGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(120),
  queries: z.array(z.string().trim().min(1)).min(1, "At least one query is required").max(50),
  searchType: z.enum(["companies", "contacts", "emails"]).optional(),
  contactListId: z.number().int().positive().optional().nullable(),
  start: z.boolean().optional(),
});
const addQueriesSchema = z.object({
  queries: z.array(z.string().trim().min(1)).min(1, "At least one query is required").max(50),
});
const suggestQueriesSchema = z.object({
  description: z.string().trim().min(3, "Describe who this group should find"),
});

export function registerStrategiesRoutes(app: Application, requireAuth: any) {
  // Loads the strategy in the URL when it belongs to the signed-in user; otherwise answers the request itself
  async function loadOwnedStrategy(req: Request, res: Response): Promise<StrategicProfile | null> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid strategy ID" });
      return null;
    }
    const strategy = await storage.getStrategicProfile(id, getUserId(req));
    if (!strategy) {
      res.status(404).json({ message: "Strategy not found or access denied" });
      return null;
    }
    return strategy;
  }

  function answerError(res: Response, error: unknown, fallback: string) {
    if (error instanceof StrategyQueryGroupError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(fallback, error);
    res.status(500).json({ message: error instanceof Error ? error.message : fallback });
  }

  // All strategies of the signed-in user
  app.get("/api/strategies", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getStrategicProfiles(getUserId(req));
      res.json(profiles.map(withDisplayName));
    } catch (error) {
      answerError(res, error, "Failed to fetch strategies");
    }
  });

  // Save a strategy chat as a strategy: completes the matching in-progress profile or creates one
  app.post("/api/strategies/save-from-chat", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const formData = req.body;
      const existingProfiles = await storage.getStrategicProfiles(userId);
      const matchingProfile = existingProfiles.find(
        (profile) =>
          profile.status === "in_progress" &&
          profile.productService === formData.productService &&
          profile.customerFeedback === formData.customerFeedback &&
          profile.website === formData.website,
      );

      if (matchingProfile) {
        res.json(await storage.updateStrategicProfile(matchingProfile.id, { status: "completed" }));
        return;
      }

      const savedProfile = await storage.createStrategicProfile({
        userId,
        title: formData.businessDescription || formData.productService || "Strategy Plan",
        businessType: formData.businessType || "product",
        businessDescription: formData.productService || "Strategic Plan",
        productService: formData.productService,
        customerFeedback: formData.customerFeedback,
        website: formData.website,
        targetCustomers: formData.productService || "Target audience",
        status: "completed" as const,
      });
      res.json(savedProfile);
    } catch (error) {
      answerError(res, error, "Failed to save strategy");
    }
  });

  // Quick setup from the Streak page: a strategy from three fields
  app.post("/api/strategies/quick-setup", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { businessType, productService, customerFeedback, website, title } = req.body;
      if (!businessType || !productService || !customerFeedback) {
        res.status(400).json({ message: "Missing required fields: businessType, productService, and customerFeedback are required" });
        return;
      }

      const savedProfile = await storage.createStrategicProfile({
        userId,
        title: title || productService.slice(0, 50) || "Daily Sales Companion",
        businessType: businessType as "product" | "service",
        businessDescription: productService,
        productService,
        customerFeedback,
        website: website || "",
        targetCustomers: "B2B customers", // Default for now
        status: "completed" as const,
        uniqueAttributes: [customerFeedback], // Store customer feedback as unique attribute
      });
      res.json({ success: true, profile: savedProfile, message: "Product profile created successfully" });
    } catch (error) {
      answerError(res, error, "Failed to create product profile");
    }
  });

  // One strategy
  app.get("/api/strategies/:id", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      res.json(withDisplayName(strategy));
    } catch (error) {
      answerError(res, error, "Failed to fetch strategy");
    }
  });

  // Create a strategy
  app.post("/api/strategies", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { businessType, productService, customerFeedback, website, title, targetCustomers, uniqueAttributes, status, isDefault } = req.body;

      if (isDefault === true) {
        await storage.clearDefaultStrategicProfiles(userId);
      }

      const savedProfile = await storage.createStrategicProfile({
        userId,
        title: title || productService || "New Product",
        businessType: businessType || ("product" as "product" | "service"),
        businessDescription: productService || "",
        productService: productService || "",
        customerFeedback: customerFeedback || "",
        website: website || "",
        targetCustomers: targetCustomers || "Target customers",
        status: status || ("completed" as const),
        uniqueAttributes: uniqueAttributes || [],
        isDefault: isDefault || false,
      });
      res.json(withDisplayName(savedProfile));
    } catch (error) {
      answerError(res, error, "Failed to create strategy");
    }
  });

  // Update a strategy
  app.patch("/api/strategies/:id", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;

      if (req.body.isDefault === true) {
        await storage.clearDefaultStrategicProfiles(strategy.userId);
      }
      const updatedProfile = await storage.updateStrategicProfile(strategy.id, req.body);
      res.json(withDisplayName(updatedProfile));
    } catch (error) {
      answerError(res, error, "Failed to update strategy");
    }
  });

  // Delete a strategy
  app.delete("/api/strategies/:id", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      await storage.deleteStrategicProfile(strategy.id);
      res.json({ success: true, message: "Strategy deleted successfully" });
    } catch (error) {
      answerError(res, error, "Failed to delete strategy");
    }
  });

  // The strategy's query groups, each with its queries, status and sending list
  app.get("/api/strategies/:id/query-groups", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      res.json(await listStrategyQueryGroups(strategy));
    } catch (error) {
      answerError(res, error, "Failed to fetch query groups");
    }
  });

  // A new query group; creates its sending list unless one is given, and starts it when asked
  app.post("/api/strategies/:id/query-groups", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      const input = createQueryGroupSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({ message: "Validation failed", errors: input.error.flatten() });
      }
      res.status(201).json(await createStrategyQueryGroup(strategy, input.data));
    } catch (error) {
      answerError(res, error, "Failed to create query group");
    }
  });

  // Query ideas for a group, from a short description of who it should find
  app.post("/api/strategies/:id/query-groups/suggest", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      const input = suggestQueriesSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({ message: "Validation failed", errors: input.error.flatten() });
      }
      res.json({ queries: await suggestQueriesForStrategyQueryGroup(strategy, input.data.description) });
    } catch (error) {
      answerError(res, error, "Failed to suggest queries");
    }
  });

  // More queries for an existing group
  app.post("/api/strategies/:id/query-groups/:queueId/queries", requireAuth, async (req, res) => {
    try {
      const strategy = await loadOwnedStrategy(req, res);
      if (!strategy) return;
      const queueId = parseInt(req.params.queueId);
      if (isNaN(queueId)) return res.status(400).json({ message: "Invalid query group ID" });
      const input = addQueriesSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({ message: "Validation failed", errors: input.error.flatten() });
      }
      res.json(await addQueriesToStrategyQueryGroup(strategy, queueId, input.data.queries));
    } catch (error) {
      answerError(res, error, "Failed to add queries");
    }
  });
}

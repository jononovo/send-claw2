import { Express } from "express";
import { PricingPromoService } from "./service";
import { DEFAULT_PLANS } from "./types";

export function registerPricingPromoRoutes(app: Express) {
  app.get("/api/pricing/config", async (req, res) => {
    try {
      const promoCode = req.query.promo as string | undefined;
      const config = await PricingPromoService.resolvePricingConfig(promoCode);
      res.json(config);
    } catch (error) {
      console.error("[PricingPromoRoutes] Error getting pricing config:", error);
      res.json({
        promoCode: null,
        promoName: null,
        plans: DEFAULT_PLANS.filter(p => p.id !== 'free'),
        isPromoActive: false,
      });
    }
  });

  app.get("/api/admin/pricing-promos", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const promos = await PricingPromoService.getAllPromos();
      res.json(promos);
    } catch (error) {
      console.error("[PricingPromoRoutes] Error getting promos:", error);
      res.status(500).json({ error: "Failed to fetch promos" });
    }
  });

  app.post("/api/admin/pricing-promos", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const promo = await PricingPromoService.createPromo(req.body);
      if (!promo) {
        return res.status(400).json({ error: "Failed to create promo" });
      }
      res.json(promo);
    } catch (error) {
      console.error("[PricingPromoRoutes] Error creating promo:", error);
      res.status(500).json({ error: "Failed to create promo" });
    }
  });

  app.patch("/api/admin/pricing-promos/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const promo = await PricingPromoService.updatePromo(parseInt(req.params.id), req.body);
      if (!promo) {
        return res.status(400).json({ error: "Failed to update promo" });
      }
      res.json(promo);
    } catch (error) {
      console.error("[PricingPromoRoutes] Error updating promo:", error);
      res.status(500).json({ error: "Failed to update promo" });
    }
  });

  app.delete("/api/admin/pricing-promos/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const success = await PricingPromoService.deletePromo(parseInt(req.params.id));
      if (!success) {
        return res.status(400).json({ error: "Failed to delete promo" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[PricingPromoRoutes] Error deleting promo:", error);
      res.status(500).json({ error: "Failed to delete promo" });
    }
  });
}

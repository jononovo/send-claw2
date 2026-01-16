import { db } from "../../db";
import { pricingPromos, PricingPromo } from "@shared/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { DEFAULT_PLANS, applyPromoToPlans, ResolvedPricingConfig, PlanConfig } from "./types";

const HARDCODED_PROMOS: Record<string, Partial<PricingPromo>> = {
  'egg': {
    id: -1,
    code: 'egg',
    name: 'Free Trial Included',
    isActive: true,
    priority: 0,
    showFreeTrial: true,
    showDuckling: true,
    showMamaDuck: true,
    daysOfWeek: [],
  },
  'duckling-only': {
    id: -2,
    code: 'duckling-only',
    name: 'Duckling Only',
    isActive: true,
    priority: 0,
    showFreeTrial: false,
    showDuckling: true,
    showMamaDuck: false,
    daysOfWeek: [],
  },
};

export class PricingPromoService {
  static async getPromoByCode(code: string): Promise<PricingPromo | null> {
    if (HARDCODED_PROMOS[code]) {
      return HARDCODED_PROMOS[code] as PricingPromo;
    }
    
    try {
      const [promo] = await db
        .select()
        .from(pricingPromos)
        .where(and(
          eq(pricingPromos.code, code),
          eq(pricingPromos.isActive, true)
        ))
        .limit(1);
      
      return promo || null;
    } catch (error) {
      console.error(`[PricingPromoService] Error fetching promo by code ${code}:`, error);
      return null;
    }
  }

  static async getActiveTimeBasedPromo(): Promise<PricingPromo | null> {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();

      const promos = await db
        .select()
        .from(pricingPromos)
        .where(eq(pricingPromos.isActive, true))
        .orderBy(desc(pricingPromos.priority));

      for (const promo of promos) {
        if (promo.startDate && now < promo.startDate) continue;
        if (promo.endDate && now > promo.endDate) continue;
        
        const daysOfWeek = promo.daysOfWeek as number[] | null;
        if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(dayOfWeek)) {
          continue;
        }

        return promo;
      }

      return null;
    } catch (error) {
      console.error("[PricingPromoService] Error fetching time-based promo:", error);
      return null;
    }
  }

  static async resolvePricingConfig(promoCode?: string): Promise<ResolvedPricingConfig> {
    let promo: PricingPromo | null = null;

    if (promoCode) {
      promo = await this.getPromoByCode(promoCode);
    }

    if (!promo) {
      promo = await this.getActiveTimeBasedPromo();
    }

    if (promo) {
      const plans = applyPromoToPlans(promo, DEFAULT_PLANS);
      return {
        promoCode: promo.code,
        promoName: promo.name,
        plans,
        isPromoActive: true,
      };
    }

    return {
      promoCode: null,
      promoName: null,
      plans: DEFAULT_PLANS.filter(p => p.id !== 'free'),
      isPromoActive: false,
    };
  }

  static async getAllPromos(): Promise<PricingPromo[]> {
    try {
      return await db
        .select()
        .from(pricingPromos)
        .orderBy(desc(pricingPromos.priority));
    } catch (error) {
      console.error("[PricingPromoService] Error fetching all promos:", error);
      return [];
    }
  }

  static async createPromo(data: Omit<PricingPromo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingPromo | null> {
    try {
      const [promo] = await db
        .insert(pricingPromos)
        .values(data)
        .returning();
      return promo;
    } catch (error) {
      console.error("[PricingPromoService] Error creating promo:", error);
      return null;
    }
  }

  static async updatePromo(id: number, data: Partial<PricingPromo>): Promise<PricingPromo | null> {
    try {
      const [promo] = await db
        .update(pricingPromos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(pricingPromos.id, id))
        .returning();
      return promo;
    } catch (error) {
      console.error("[PricingPromoService] Error updating promo:", error);
      return null;
    }
  }

  static async deletePromo(id: number): Promise<boolean> {
    try {
      await db.delete(pricingPromos).where(eq(pricingPromos.id, id));
      return true;
    } catch (error) {
      console.error("[PricingPromoService] Error deleting promo:", error);
      return false;
    }
  }
}

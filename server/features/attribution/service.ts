import { db } from '../../db';
import { userAttribution } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { AttributionData, ConversionEvent, AttributionEventType } from './types';

export class AttributionService {
  async getOrCreateAttribution(userId: number) {
    const [existing] = await db
      .select()
      .from(userAttribution)
      .where(eq(userAttribution.userId, userId));
    
    if (existing) return existing;

    const [created] = await db
      .insert(userAttribution)
      .values({ userId })
      .returning();
    
    return created;
  }

  async setAttribution(userId: number, source: string, attributionData: AttributionData) {
    const [existing] = await db
      .select()
      .from(userAttribution)
      .where(eq(userAttribution.userId, userId));

    if (existing) {
      if (existing.source) {
        console.log(`[Attribution] User ${userId} already has attribution from ${existing.source}, skipping update`);
        return existing;
      }
      
      const [updated] = await db
        .update(userAttribution)
        .set({ 
          source, 
          attributionData,
          updatedAt: new Date()
        })
        .where(eq(userAttribution.userId, userId))
        .returning();
      
      return updated;
    }

    const [created] = await db
      .insert(userAttribution)
      .values({ 
        userId, 
        source, 
        attributionData,
        conversionEvents: []
      })
      .returning();
    
    return created;
  }

  async logConversionEvent(userId: number, event: AttributionEventType, metadata?: Record<string, any>) {
    const attribution = await this.getOrCreateAttribution(userId);
    
    const newEvent: ConversionEvent = {
      event,
      timestamp: new Date().toISOString(),
      metadata
    };

    const existingEvents = (attribution.conversionEvents || []) as ConversionEvent[];
    
    const alreadyLogged = existingEvents.some(e => e.event === event);
    if (alreadyLogged && event !== 'search_performed') {
      console.log(`[Attribution] Event ${event} already logged for user ${userId}, skipping`);
      return attribution;
    }

    const updatedEvents = [...existingEvents, newEvent];

    const [updated] = await db
      .update(userAttribution)
      .set({ 
        conversionEvents: updatedEvents,
        updatedAt: new Date()
      })
      .where(eq(userAttribution.userId, userId))
      .returning();

    console.log(`[Attribution] Logged event ${event} for user ${userId}`);
    return updated;
  }

  async getAttribution(userId: number) {
    const [attribution] = await db
      .select()
      .from(userAttribution)
      .where(eq(userAttribution.userId, userId));
    
    return attribution || null;
  }

  async getAttributionsBySource(source: string) {
    return db
      .select()
      .from(userAttribution)
      .where(eq(userAttribution.source, source));
  }

  async getAllAttributions() {
    return db.select().from(userAttribution);
  }
}

export const attributionService = new AttributionService();

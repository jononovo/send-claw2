import { db } from "../../db";
import { quotaUsage } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface BotForQuota {
  verified: boolean | null;
  status: string | null;
  createdAt: Date | null;
}

export function calculateDailyLimit(bot: BotForQuota): number {
  const hoursActive = bot.createdAt
    ? (Date.now() - new Date(bot.createdAt).getTime()) / (1000 * 60 * 60)
    : 0;
  const weeksActive = Math.floor(hoursActive / (7 * 24));

  const base = bot.verified ? 10 : (hoursActive >= 24 ? 5 : 3);
  const karmaBonus = weeksActive * 3;
  let limit = Math.min(base + karmaBonus, 25);

  const botStatus = bot.status || 'normal';
  if (botStatus === 'flagged') {
    limit = Math.min(limit, 2);
  }

  return limit;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getQuotaUsage(botId: string, date: string): Promise<number> {
  const [usage] = await db.select().from(quotaUsage).where(
    and(eq(quotaUsage.botId, botId), eq(quotaUsage.date, date))
  ).limit(1);
  return usage?.emailsSent || 0;
}

export async function incrementQuotaUsage(botId: string, date: string): Promise<void> {
  const existing = await getQuotaUsage(botId, date);
  if (existing > 0) {
    await db.update(quotaUsage)
      .set({ emailsSent: existing + 1 })
      .where(and(eq(quotaUsage.botId, botId), eq(quotaUsage.date, date)));
  } else {
    await db.insert(quotaUsage).values({ botId, date, emailsSent: 1 });
  }
}

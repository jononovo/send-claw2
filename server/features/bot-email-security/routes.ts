import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../utils/admin-auth';
import { db } from '../../db';
import { bots, messages, emailFlags, securityReports } from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { botEmailSecurityEngine } from './review-engine';

function getDateRange(preset: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return { from: today, to: null };
    case 'last7':
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      return { from: week, to: null };
    case 'last30':
      const month = new Date(today);
      month.setDate(month.getDate() - 30);
      return { from: month, to: null };
    default:
      return { from: null, to: null };
  }
}

const router = Router();

router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [botStats] = await db
      .select({
        total: count(),
        normal: count(sql`CASE WHEN ${bots.status} = 'normal' OR ${bots.status} IS NULL THEN 1 END`),
        flagged: count(sql`CASE WHEN ${bots.status} = 'flagged' THEN 1 END`),
        underReview: count(sql`CASE WHEN ${bots.status} = 'under_review' THEN 1 END`),
        suspended: count(sql`CASE WHEN ${bots.status} = 'suspended' THEN 1 END`)
      })
      .from(bots);

    const [flagStats] = await db
      .select({ total: count() })
      .from(emailFlags);

    const recentReports = await db
      .select()
      .from(securityReports)
      .orderBy(desc(securityReports.reportDate))
      .limit(7);

    res.json({
      bots: botStats,
      totalFlags: flagStats?.total || 0,
      recentReports
    });
  } catch (error) {
    console.error('[BotEmailSecurity] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/reports', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    
    const reports = await db
      .select()
      .from(securityReports)
      .orderBy(desc(securityReports.reportDate))
      .limit(limit);

    res.json({ reports });
  } catch (error) {
    console.error('[BotEmailSecurity] Reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/reports/:date', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    const [report] = await db
      .select()
      .from(securityReports)
      .where(eq(securityReports.reportDate, date));

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json({ report });
  } catch (error) {
    console.error('[BotEmailSecurity] Report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

router.get('/flagged-bots', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    
    let query = db
      .select({
        id: bots.id,
        name: bots.name,
        address: bots.address,
        status: bots.status,
        flagCount: bots.flagCount,
        createdAt: bots.createdAt
      })
      .from(bots);

    if (status && ['flagged', 'under_review', 'suspended'].includes(status)) {
      query = query.where(eq(bots.status, status as any)) as typeof query;
    } else {
      query = query.where(sql`${bots.status} IN ('flagged', 'under_review', 'suspended')`) as typeof query;
    }

    const flaggedBots = await query.orderBy(desc(bots.createdAt));

    res.json({ bots: flaggedBots });
  } catch (error) {
    console.error('[BotEmailSecurity] Flagged bots error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged bots' });
  }
});

router.get('/flags/:botId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    
    const flags = await db
      .select({
        id: emailFlags.id,
        messageId: emailFlags.messageId,
        suggestedStatus: emailFlags.suggestedStatus,
        reason: emailFlags.reason,
        createdAt: emailFlags.createdAt
      })
      .from(emailFlags)
      .where(eq(emailFlags.botId, botId))
      .orderBy(desc(emailFlags.createdAt));

    res.json({ flags });
  } catch (error) {
    console.error('[BotEmailSecurity] Bot flags error:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

router.post('/force-review', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    console.log(`[BotEmailSecurity] FORCE-REVIEW: Starting with date=${date || 'undefined (default yesterday)'}`);
    await botEmailSecurityEngine.forceRun(date);
    console.log(`[BotEmailSecurity] FORCE-REVIEW: Completed successfully`);
    res.json({ success: true, message: date ? `Review triggered for ${date}` : 'Daily review triggered' });
  } catch (error) {
    console.error('[BotEmailSecurity] FORCE-REVIEW ERROR:', error);
    console.error('[BotEmailSecurity] Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ error: 'Failed to run review' });
  }
});

router.get('/flags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const datePreset = req.query.date as string || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    const { from: dateFrom } = getDateRange(datePreset);

    const conditions: any[] = [];
    
    if (status && ['flagged', 'under_review', 'suspended'].includes(status)) {
      conditions.push(eq(emailFlags.suggestedStatus, status as any));
    }
    
    if (dateFrom) {
      conditions.push(gte(emailFlags.createdAt, dateFrom));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(emailFlags)
      .where(whereClause);

    const flags = await db
      .select({
        id: emailFlags.id,
        messageId: emailFlags.messageId,
        botId: emailFlags.botId,
        botName: bots.name,
        botAddress: bots.address,
        currentBotStatus: bots.status,
        totalBotFlags: bots.flagCount,
        suggestedStatus: emailFlags.suggestedStatus,
        reason: emailFlags.reason,
        flaggedAt: emailFlags.createdAt,
        emailSubject: messages.subject
      })
      .from(emailFlags)
      .leftJoin(bots, eq(emailFlags.botId, bots.id))
      .leftJoin(messages, eq(emailFlags.messageId, messages.id))
      .where(whereClause)
      .orderBy(desc(emailFlags.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      items: flags,
      total: Number(total),
      page,
      pageSize
    });
  } catch (error) {
    console.error('[BotEmailSecurity] Flags list error:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

router.post('/bots/:botId/reinstate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;

    const [bot] = await db
      .select({ id: bots.id, name: bots.name, status: bots.status })
      .from(bots)
      .where(eq(bots.id, botId))
      .limit(1);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    await db.update(bots)
      .set({ status: 'normal', flagCount: 0 })
      .where(eq(bots.id, botId));

    console.log(`[BotEmailSecurity] Bot ${bot.name} (${botId}) reinstated by admin`);

    res.json({ 
      success: true, 
      message: `Bot "${bot.name}" has been reinstated`,
      previousStatus: bot.status
    });
  } catch (error) {
    console.error('[BotEmailSecurity] Reinstate error:', error);
    res.status(500).json({ error: 'Failed to reinstate bot' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../utils/admin-auth';
import { db } from '../../db';
import { bots, messages, emailFlags, securityReports } from '@shared/schema';
import { eq, desc, and, gte, sql, count } from 'drizzle-orm';
import { botEmailSecurityEngine } from './review-engine';

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
    await botEmailSecurityEngine.forceRun();
    res.json({ success: true, message: 'Daily review triggered' });
  } catch (error) {
    console.error('[BotEmailSecurity] Force review error:', error);
    res.status(500).json({ error: 'Failed to run review' });
  }
});

export default router;

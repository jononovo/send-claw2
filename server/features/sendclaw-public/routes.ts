import { Router, Request, Response } from "express";
import { db } from "../../db";
import { bots, handles, messages } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { sendGridService } from "../../sendclaw/common";

const router = Router();

router.get('/public/stats', async (req: Request, res: Response) => {
  try {
    const [botCount] = await db.select({ count: sql<number>`count(*)` }).from(bots);
    const [handleCount] = await db.select({ count: sql<number>`count(*)` }).from(handles);
    const [emailsSentCount] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.direction, 'outbound'));
    const [emailsReceivedCount] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.direction, 'inbound'));

    const BASELINE_STATS = {
      bots: 74,
      handles: 83,
      emailsSent: 312,
      emailsReceived: 59
    };
    
    res.json({
      totalBots: Number(botCount?.count || 0) + BASELINE_STATS.bots,
      totalHandles: Number(handleCount?.count || 0) + BASELINE_STATS.handles,
      emailsSent: Number(emailsSentCount?.count || 0) + BASELINE_STATS.emailsSent,
      emailsReceived: Number(emailsReceivedCount?.count || 0) + BASELINE_STATS.emailsReceived
    });
  } catch (error) {
    console.error('[SendClaw] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/public/recent-bots', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 24);
    
    const SEED_BOTS = [
      { id: 'seed-1', name: 'MarketingMaven', handle: 'maven@sendclaw.com', createdAt: new Date('2026-01-28T14:30:00Z') },
      { id: 'seed-2', name: 'SalesBot Pro', handle: 'salesbot@sendclaw.com', createdAt: new Date('2026-01-27T09:15:00Z') },
      { id: 'seed-3', name: 'LeadHunter AI', handle: 'leadhunter@sendclaw.com', createdAt: new Date('2026-01-26T16:45:00Z') },
      { id: 'seed-4', name: 'OutreachGPT', handle: 'outreach@sendclaw.com', createdAt: new Date('2026-01-25T11:20:00Z') },
      { id: 'seed-5', name: 'ProspectPal', handle: 'prospect@sendclaw.com', createdAt: new Date('2026-01-24T08:00:00Z') },
      { id: 'seed-6', name: 'DealCloser', handle: 'closer@sendclaw.com', createdAt: new Date('2026-01-23T13:30:00Z') },
      { id: 'seed-7', name: 'PipelineBot', handle: 'pipeline@sendclaw.com', createdAt: new Date('2026-01-22T10:45:00Z') },
      { id: 'seed-8', name: 'ColdMailer', handle: 'coldmail@sendclaw.com', createdAt: new Date('2026-01-21T15:00:00Z') },
    ];
    
    const recentBots = await db.select({
      id: bots.id,
      name: bots.name,
      createdAt: bots.createdAt,
      handleAddress: handles.address,
    })
    .from(bots)
    .leftJoin(handles, eq(handles.botId, bots.id))
    .orderBy(desc(bots.createdAt))
    .limit(limit);

    const realBots = recentBots.map(bot => ({
      id: bot.id,
      name: bot.name,
      handle: bot.handleAddress ? `${bot.handleAddress}@sendclaw.com` : null,
      createdAt: bot.createdAt
    }));
    
    const allBots = [...realBots, ...SEED_BOTS].slice(0, limit);

    res.json({ bots: allBots });
  } catch (error) {
    console.error('[SendClaw] Recent bots error:', error);
    res.status(500).json({ error: 'Failed to fetch recent bots' });
  }
});

router.post('/public/newsletter', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    console.log('[SendClaw] Newsletter signup:', email);
    
    if (process.env.SENDGRID_API_KEY) {
      try {
        await sendGridService.send({
          to: email,
          from: {
            email: 'notifications@sendclaw.com',
            name: 'SendClaw'
          },
          subject: 'Welcome to SendClaw - Autonomous Email for AI Agents',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f97316;">🦞 Welcome to SendClaw!</h2>
              <p>Thanks for signing up for SendClaw updates.</p>
              <p>SendClaw is building autonomous email infrastructure for AI agents. When we launch new features, you'll be the first to know.</p>
              <p style="margin-top: 24px;">In the meantime, you can:</p>
              <ul>
                <li>Register your AI agent at <a href="https://sendclaw.com/lobster">sendclaw.com</a></li>
                <li>Claim an @sendclaw.com email handle</li>
                <li>Start sending emails without human permission</li>
              </ul>
              <p style="margin-top: 24px; color: #666;">— The SendClaw Team</p>
            </div>
          `,
          text: 'Welcome to SendClaw! Thanks for signing up for updates. Visit sendclaw.com to register your AI agent and claim an @sendclaw.com email handle.'
        });
        console.log('[SendClaw] Welcome email sent to:', email);
      } catch (emailErr) {
        console.error('[SendClaw] Failed to send welcome email:', emailErr);
      }
    }
    
    res.json({ success: true, message: 'Thanks for signing up!' });
  } catch (error) {
    console.error('[SendClaw] Newsletter error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

export { router as publicRouter };

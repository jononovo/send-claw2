import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../../db";
import { bots, messages, insertMessageSchema } from "@shared/schema";
import { eq, and, desc, sql, or, inArray, ilike, lt, gte, lte } from "drizzle-orm";
import {
  apiKeyAuth,
  loadBotFromApiKey,
  generateMessageId,
  generateThreadId,
  parseSearchQuery,
  getHandleByBotId,
  getHandleByAddress,
  getBotByApiKey,
  sendGridService,
  SENDCLAW_DOMAIN,
} from "../../sendclaw/common";
import { calculateDailyLimit, getTodayDate, getQuotaUsage, incrementQuotaUsage } from "../sendclaw-quota";

const router = Router();
const upload = multer();

router.post('/mail/send', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    const parsed = insertMessageSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.errors 
      });
      return;
    }

    const { to, subject, body, inReplyTo } = parsed.data;
    
    const handle = await getHandleByBotId(bot.id);
    if (!handle) {
      res.status(400).json({ 
        error: 'No email handle linked to this bot',
        hint: 'Your human needs to reserve a handle and claim your bot first'
      });
      return;
    }

    const today = getTodayDate();
    const currentUsage = await getQuotaUsage(bot.id, today);
    
    const botStatus = bot.status || 'normal';
    if (botStatus === 'suspended' || botStatus === 'under_review') {
      res.status(403).json({ 
        error: 'Bot is under review or suspended',
        status: botStatus,
        message: 'Your bot has been flagged for security review. Email sending is disabled.'
      });
      return;
    }
    
    const dailyLimit = calculateDailyLimit(bot);

    if (currentUsage >= dailyLimit) {
      res.status(429).json({ 
        error: 'Daily email limit reached',
        limit: dailyLimit,
        used: currentUsage,
        resetsAt: `${today}T00:00:00Z (next day)`
      });
      return;
    }

    const messageId = generateMessageId();
    let threadId: string;
    
    if (inReplyTo) {
      const [originalMessage] = await db.select().from(messages)
        .where(eq(messages.messageId, inReplyTo))
        .limit(1);
      threadId = originalMessage?.threadId || generateThreadId();
    } else {
      threadId = generateThreadId();
    }

    const fromAddress = `${handle.address}@${SENDCLAW_DOMAIN}`;

    let sendSuccess = false;
    if (process.env.SENDGRID_API_KEY) {
      try {
        await sendGridService.send({
          to,
          from: {
            email: fromAddress,
            name: bot.senderName
          },
          subject: subject || '(no subject)',
          text: body || '',
          headers: {
            'Message-ID': messageId,
            ...(inReplyTo ? { 'In-Reply-To': inReplyTo, 'References': inReplyTo } : {})
          }
        });
        sendSuccess = true;
      } catch (sendError: any) {
        if (sendError.code === 403 && sendError.response?.body?.errors?.[0]?.message?.includes('verified Sender')) {
          console.warn('[SendClaw] Sender not verified in SendGrid - email stored but not actually sent');
        } else {
          throw sendError;
        }
      }
    } else {
      console.warn('[SendClaw] SENDGRID_API_KEY not configured, simulating send');
    }

    await db.insert(messages).values({
      botId: bot.id,
      direction: 'outbound',
      fromAddress,
      toAddress: to,
      subject: subject || null,
      bodyText: body || null,
      threadId,
      messageId,
      inReplyTo: inReplyTo || null
    });

    await incrementQuotaUsage(bot.id, today);

    console.log(`[SendClaw] Email sent: ${fromAddress} -> ${to}`);

    res.json({
      success: true,
      messageId,
      threadId,
      quota: {
        used: currentUsage + 1,
        limit: dailyLimit,
        remaining: dailyLimit - currentUsage - 1
      }
    });
  } catch (error: any) {
    console.error('[SendClaw] Send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.get('/mail/inbox', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    const conditions: any[] = [eq(messages.botId, bot.id)];
    if (cursor) {
      conditions.push(lt(messages.id, cursor));
    }

    const botMessages = await db.select().from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = botMessages.length > limit;
    const results = hasMore ? botMessages.slice(0, limit) : botMessages;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

    res.json({
      messages: results,
      hasMore,
      ...(nextCursor && { nextCursor })
    });
  } catch (error) {
    console.error('[SendClaw] Inbox error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

router.get('/mail/inbox/:botId', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    
    const apiKey = req.headers['x-api-key'] as string || req.headers.authorization?.replace('Bearer ', '');
    
    if (apiKey) {
      const bot = await getBotByApiKey(apiKey);
      if (bot && bot.id === botId) {
        const botMessages = await db.select().from(messages)
          .where(eq(messages.botId, botId))
          .orderBy(desc(messages.createdAt))
          .limit(50);
        res.json({ messages: botMessages });
        return;
      }
    }

    if (req.isAuthenticated && req.isAuthenticated()) {
      const userId = (req.user as any)?.id;
      const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      
      if (bot && bot.userId === userId) {
        const botMessages = await db.select().from(messages)
          .where(eq(messages.botId, botId))
          .orderBy(desc(messages.createdAt))
          .limit(50);
        res.json({ messages: botMessages });
        return;
      }
    }

    res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('[SendClaw] Inbox by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

router.get('/mail/check', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(
        eq(messages.botId, bot.id),
        eq(messages.direction, 'inbound'),
        eq(messages.isRead, false)
      ));
    
    const today = getTodayDate();
    const used = await getQuotaUsage(bot.id, today);
    const dailyLimit = calculateDailyLimit(bot);
    
    res.json({
      unreadCount: count,
      quota: {
        used,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - used)
      }
    });
  } catch (error) {
    console.error('[SendClaw] Check error:', error);
    res.status(500).json({ error: 'Failed to check messages' });
  }
});

router.get('/mail/messages', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const cursor = req.query.cursor as string | undefined;
    const unreadOnly = req.query.unread === 'true';
    const direction = req.query.direction as 'inbound' | 'outbound' | undefined;
    const q = req.query.q as string | undefined;
    
    const conditions: any[] = [eq(messages.botId, bot.id)];
    
    if (cursor) {
      conditions.push(lt(messages.id, cursor));
    }
    
    if (unreadOnly) {
      conditions.push(eq(messages.isRead, false));
      conditions.push(eq(messages.direction, 'inbound'));
    }
    
    if (direction && ['inbound', 'outbound'].includes(direction)) {
      conditions.push(eq(messages.direction, direction));
    }
    
    if (q) {
      const search = parseSearchQuery(q);
      
      if (search.from) {
        conditions.push(ilike(messages.fromAddress, `%${search.from}%`));
      }
      if (search.to) {
        conditions.push(ilike(messages.toAddress, `%${search.to}%`));
      }
      if (search.subject) {
        conditions.push(ilike(messages.subject, `%${search.subject}%`));
      }
      if (search.after) {
        conditions.push(gte(messages.createdAt, search.after));
      }
      if (search.before) {
        conditions.push(lte(messages.createdAt, search.before));
      }
      for (const keyword of search.keywords) {
        conditions.push(or(
          ilike(messages.subject, `%${keyword}%`),
          ilike(messages.bodyText, `%${keyword}%`)
        ));
      }
    }
    
    const botMessages = await db.select().from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);
    
    const hasMore = botMessages.length > limit;
    const results = hasMore ? botMessages.slice(0, limit) : botMessages;
    
    if (unreadOnly && results.length > 0) {
      const ids = results.map(m => m.id);
      await db.update(messages)
        .set({ isRead: true })
        .where(inArray(messages.id, ids));
    }
    
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;
    
    res.json({
      messages: results,
      hasMore,
      ...(nextCursor && { nextCursor })
    });
  } catch (error) {
    console.error('[SendClaw] Messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/mail/messages/:messageId', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    const { messageId } = req.params;
    
    const [message] = await db.select().from(messages)
      .where(and(
        eq(messages.id, messageId),
        eq(messages.botId, bot.id)
      ))
      .limit(1);
    
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    if (message.direction === 'inbound' && !message.isRead) {
      await db.update(messages)
        .set({ isRead: true })
        .where(eq(messages.id, messageId));
    }
    
    res.json(message);
  } catch (error) {
    console.error('[SendClaw] Get message error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

router.post('/webhook/inbound', upload.none(), async (req: Request, res: Response) => {
  try {
    const { to, from, subject, text, html, envelope } = req.body;
    
    console.log('[SendClaw] Inbound email received:', { to, from, subject });

    let toAddress = to;
    if (envelope) {
      try {
        const env = JSON.parse(envelope);
        toAddress = env.to?.[0] || to;
      } catch {}
    }

    const addressMatch = toAddress?.match(/([a-z0-9_]+)@/i);
    if (!addressMatch) {
      console.warn('[SendClaw] Could not parse recipient address:', toAddress);
      res.status(200).send('OK');
      return;
    }

    const handleAddress = addressMatch[1].toLowerCase();
    const handle = await getHandleByAddress(handleAddress);

    if (!handle || (!handle.userId && !handle.botId)) {
      console.warn('[SendClaw] No owner found for address:', handleAddress);
      res.status(200).send('OK');
      return;
    }

    const messageId = generateMessageId();
    const threadId = generateThreadId();

    await db.insert(messages).values({
      botId: handle.botId,
      userId: handle.userId,
      direction: 'inbound',
      fromAddress: from,
      toAddress: toAddress,
      subject: subject || null,
      bodyText: text || null,
      bodyHtml: html || null,
      threadId,
      messageId
    });

    console.log(`[SendClaw] Inbound email stored: ${from} -> ${handleAddress}`);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[SendClaw] Webhook error:', error);
    res.status(200).send('OK');
  }
});

export { router as mailRouter };

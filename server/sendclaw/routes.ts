import express, { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { bots, handles, messages, quotaUsage, dailyCheckins, socialShareRewards, insertBotSchema, insertMessageSchema } from "@shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { MailService } from '@sendgrid/mail';
import multer from "multer";
import { CreditRewardService } from "../features/billing/rewards/service";

const router = Router();
const upload = multer();

const sendGridService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sendGridService.setApiKey(process.env.SENDGRID_API_KEY);
}

const SENDCLAW_DOMAIN = process.env.SENDCLAW_DOMAIN || 'sendclaw.com';
const FROM_EMAIL = process.env.SENDCLAW_FROM_EMAIL || `noreply@${SENDCLAW_DOMAIN}`;

function generateApiKey(): string {
  return `sk_${crypto.randomBytes(24).toString('hex')}`;
}

function generateClaimToken(): string {
  const words = ['reef', 'wave', 'claw', 'tide', 'kelp', 'coral', 'shell', 'pearl'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${word}-${code}`;
}

function generateMessageId(): string {
  return `<${crypto.randomUUID()}@${SENDCLAW_DOMAIN}>`;
}

function generateThreadId(): string {
  return crypto.randomUUID();
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function getBotByApiKey(apiKey: string) {
  const [bot] = await db.select().from(bots).where(eq(bots.apiKey, apiKey)).limit(1);
  return bot;
}

async function getHandleByAddress(address: string) {
  const [handle] = await db.select().from(handles).where(eq(handles.address, address)).limit(1);
  return handle;
}

async function getHandleByBotId(botId: string) {
  const [handle] = await db.select().from(handles).where(eq(handles.botId, botId)).limit(1);
  return handle;
}

async function getHandleByUserId(userId: number) {
  const [handle] = await db.select().from(handles).where(eq(handles.userId, userId)).limit(1);
  return handle;
}

async function getQuotaUsage(botId: string, date: string): Promise<number> {
  const [usage] = await db.select().from(quotaUsage).where(
    and(eq(quotaUsage.botId, botId), eq(quotaUsage.date, date))
  ).limit(1);
  return usage?.emailsSent || 0;
}

async function incrementQuotaUsage(botId: string, date: string): Promise<void> {
  const existing = await getQuotaUsage(botId, date);
  if (existing > 0) {
    await db.update(quotaUsage)
      .set({ emailsSent: existing + 1 })
      .where(and(eq(quotaUsage.botId, botId), eq(quotaUsage.date, date)));
  } else {
    await db.insert(quotaUsage).values({ botId, date, emailsSent: 1 });
  }
}

function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string || req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required', hint: 'Include X-Api-Key header' });
    return;
  }

  (req as any).apiKey = apiKey;
  next();
}

async function loadBotFromApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = (req as any).apiKey;
  const bot = await getBotByApiKey(apiKey);
  
  if (!bot) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  (req as any).bot = bot;
  next();
}

router.post('/bots/register', async (req: Request, res: Response) => {
  try {
    const parsed = insertBotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.errors 
      });
      return;
    }

    const { name, handle, senderName } = parsed.data;
    const normalizedHandle = handle.toLowerCase();
    const address = `${normalizedHandle}@${SENDCLAW_DOMAIN}`;

    // Check if handle is already reserved in handles table
    const existingHandle = await db.select().from(handles)
      .where(eq(handles.address, normalizedHandle)).limit(1);
    if (existingHandle.length > 0) {
      res.status(409).json({ error: 'Handle already reserved' });
      return;
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();

    const [bot] = await db.insert(bots).values({
      name,
      senderName,
      address,
      apiKey,
      claimToken,
      verified: false
    }).returning();

    // Create handles entry so bot can send immediately
    await db.insert(handles).values({
      address: normalizedHandle,
      botId: bot.id
    });

    console.log(`[SendClaw] Bot registered: ${name} (${address})`);

    res.status(201).json({
      botId: bot.id,
      email: address,
      apiKey,
      claimToken,
      important: "Save your API key! Give claimToken to your human if they want dashboard access."
    });
  } catch (error: any) {
    console.error('[SendClaw] Registration error:', error);
    if (error?.code === '23505' && error?.constraint === 'bots_address_key') {
      res.status(409).json({ error: 'Handle already taken' });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/bots/reserve', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const existingHandle = await getHandleByUserId(userId);
    if (existingHandle) {
      res.status(400).json({ error: 'You already have a reserved handle' });
      return;
    }

    const { handle: handleInput } = req.body;
    if (!handleInput || typeof handleInput !== 'string') {
      res.status(400).json({ error: 'Handle is required' });
      return;
    }

    const cleanHandle = handleInput.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    if (cleanHandle.length < 3) {
      res.status(400).json({ error: 'Handle must be at least 3 characters' });
      return;
    }

    const existing = await getHandleByAddress(cleanHandle);
    if (existing) {
      res.status(400).json({ error: 'This handle is already taken' });
      return;
    }

    const [newHandle] = await db.insert(handles).values({
      address: cleanHandle,
      userId,
      reservedAt: new Date()
    }).returning();

    console.log(`[SendClaw] Handle reserved: ${cleanHandle} by user ${userId}`);

    res.status(201).json({
      address: `${cleanHandle}@${SENDCLAW_DOMAIN}`,
      id: newHandle.id
    });
  } catch (error) {
    console.error('[SendClaw] Reserve error:', error);
    res.status(500).json({ error: 'Failed to reserve handle' });
  }
});

router.post('/bots/claim', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const { claimToken } = req.body;
    if (!claimToken) {
      res.status(400).json({ error: 'claimToken is required' });
      return;
    }

    const [bot] = await db.select().from(bots).where(eq(bots.claimToken, claimToken)).limit(1);
    
    if (!bot) {
      res.status(404).json({ error: 'Invalid claim token' });
      return;
    }

    if (bot.userId) {
      res.status(400).json({ error: 'Bot already claimed' });
      return;
    }

    await db.update(bots).set({
      userId,
      claimToken: null,
      claimedAt: new Date()
    }).where(eq(bots.id, bot.id));

    const userHandle = await getHandleByUserId(userId);
    if (userHandle && !userHandle.botId) {
      await db.update(handles).set({
        botId: bot.id
      }).where(eq(handles.id, userHandle.id));
    }

    console.log(`[SendClaw] Bot claimed: ${bot.name} by user ${userId}`);

    res.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name
      }
    });
  } catch (error) {
    console.error('[SendClaw] Claim error:', error);
    res.status(500).json({ error: 'Claim failed' });
  }
});

router.patch('/bots/:botId/sender-name', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    const { botId } = req.params;
    const { senderName } = req.body;

    if (!senderName || typeof senderName !== 'string' || senderName.length < 1 || senderName.length > 100) {
      res.status(400).json({ error: 'Sender name must be 1-100 characters' });
      return;
    }

    const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    if (bot.userId !== userId) {
      res.status(403).json({ error: 'You can only update bots you own' });
      return;
    }

    await db.update(bots).set({ senderName }).where(eq(bots.id, botId));

    console.log(`[SendClaw] Sender name updated: ${botId} -> ${senderName}`);
    res.json({ success: true, senderName });
  } catch (error) {
    console.error('[SendClaw] Update sender name error:', error);
    res.status(500).json({ error: 'Failed to update sender name' });
  }
});

router.get('/my-inbox', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const userHandle = await getHandleByUserId(userId);
    
    let userBot = null;
    if (userHandle?.botId) {
      const [bot] = await db.select().from(bots).where(eq(bots.id, userHandle.botId)).limit(1);
      userBot = bot;
    } else {
      const [bot] = await db.select().from(bots).where(eq(bots.userId, userId)).limit(1);
      userBot = bot;
    }

    let userMessages: any[] = [];
    if (userBot) {
      userMessages = await db.select().from(messages)
        .where(or(eq(messages.botId, userBot.id), eq(messages.userId, userId)))
        .orderBy(desc(messages.createdAt))
        .limit(100);
    } else {
      userMessages = await db.select().from(messages)
        .where(eq(messages.userId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(100);
    }

    res.json({
      handle: userHandle ? {
        id: userHandle.id,
        address: `${userHandle.address}@${SENDCLAW_DOMAIN}`,
        reservedAt: userHandle.reservedAt,
        botId: userHandle.botId
      } : null,
      bot: userBot ? {
        id: userBot.id,
        name: userBot.name,
        senderName: userBot.senderName,
        verified: userBot.verified,
        claimedAt: userBot.claimedAt,
        createdAt: userBot.createdAt
      } : null,
      messages: userMessages
    });
  } catch (error) {
    console.error('[SendClaw] My inbox error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

router.get('/bots', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const userBots = await db.select().from(bots).where(eq(bots.userId, userId)).orderBy(desc(bots.createdAt));

    res.json(userBots.map(bot => ({
      id: bot.id,
      name: bot.name,
      verified: bot.verified,
      claimedAt: bot.claimedAt,
      createdAt: bot.createdAt
    })));
  } catch (error) {
    console.error('[SendClaw] List bots error:', error);
    res.status(500).json({ error: 'Failed to list bots' });
  }
});

router.post('/inbox/send', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const userHandle = await getHandleByUserId(userId);
    if (!userHandle) {
      res.status(400).json({ error: 'No email handle found. Reserve a handle first.' });
      return;
    }

    let userBot = null;
    if (userHandle.botId) {
      const [bot] = await db.select().from(bots).where(eq(bots.id, userHandle.botId)).limit(1);
      userBot = bot;
    } else {
      const [bot] = await db.select().from(bots).where(eq(bots.userId, userId)).limit(1);
      userBot = bot;
    }

    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.errors 
      });
      return;
    }

    const { to, subject, body, inReplyTo } = parsed.data;

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

    const fromAddress = `${userHandle.address}@${SENDCLAW_DOMAIN}`;
    const user = req.user as any;
    const senderDisplayName = userBot?.senderName || user?.displayName || userHandle.address;

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sendGridService.send({
          to,
          from: {
            email: fromAddress,
            name: senderDisplayName
          },
          subject: subject || '(no subject)',
          text: body || '',
          headers: {
            'Message-ID': messageId,
            ...(inReplyTo ? { 'In-Reply-To': inReplyTo, 'References': inReplyTo } : {})
          }
        });
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
      botId: userBot?.id || null,
      userId: userId,
      direction: 'outbound',
      fromAddress,
      toAddress: to,
      subject: subject || null,
      bodyText: body || null,
      threadId,
      messageId,
      inReplyTo: inReplyTo || null
    });

    console.log(`[SendClaw] Web email sent: ${fromAddress} -> ${to}`);

    res.json({
      success: true,
      messageId,
      threadId
    });
  } catch (error: any) {
    console.error('[SendClaw] Web send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

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
    const dailyLimit = bot.verified ? 5 : 2;

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
    const offset = parseInt(req.query.offset as string) || 0;

    const botMessages = await db.select().from(messages)
      .where(eq(messages.botId, bot.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      messages: botMessages,
      pagination: { limit, offset }
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

    if (!handle || !handle.botId) {
      console.warn('[SendClaw] No linked bot found for address:', handleAddress);
      res.status(200).send('OK');
      return;
    }

    const messageId = generateMessageId();
    const threadId = generateThreadId();

    await db.insert(messages).values({
      botId: handle.botId,
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

export function registerSendClawRoutes(app: express.Express) {
  app.use('/api', router);
  
  // Public stats endpoint
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

  // Public recent bots endpoint
  router.get('/public/recent-bots', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 24);
      
      // Baseline seed bots for social proof
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
      
      // Get recent bots with their handles
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
      
      // Merge real bots with seed bots, real bots first
      const allBots = [...realBots, ...SEED_BOTS].slice(0, limit);

      res.json({ bots: allBots });
    } catch (error) {
      console.error('[SendClaw] Recent bots error:', error);
      res.status(500).json({ error: 'Failed to fetch recent bots' });
    }
  });

  // Newsletter signup endpoint
  router.post('/public/newsletter', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
      }

      console.log('[SendClaw] Newsletter signup:', email);
      
      // Send welcome email via SendGrid
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

  app.get('/skill.md', (req, res) => {
    res.type('text/markdown').send(`# SendClaw Email Skill

## Register your bot
\`\`\`
POST https://${SENDCLAW_DOMAIN}/api/bots/register
Content-Type: application/json

{ "name": "YourBotName" }
\`\`\`

Response:
\`\`\`json
{
  "botId": "uuid-here",
  "apiKey": "sk_...",
  "claimToken": "reef-X4B2"
}
\`\`\`

Save your apiKey! Give claimToken to your human if they want dashboard access.
Your human needs to reserve a handle and claim your bot before you can send emails.

## Send Email
\`\`\`
POST https://${SENDCLAW_DOMAIN}/api/mail/send
X-Api-Key: your-api-key
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Your message here"
}
\`\`\`

### Reply to an email
Include \`inReplyTo\` with the original message ID for proper threading:
\`\`\`json
{
  "to": "recipient@example.com",
  "subject": "Re: Hello",
  "body": "Your reply here",
  "inReplyTo": "<original-message-id>"
}
\`\`\`

## Check Inbox
\`\`\`
GET https://${SENDCLAW_DOMAIN}/api/mail/inbox
X-Api-Key: your-api-key
\`\`\`

## Rate Limits
- Unverified bots: 2 emails/day
- Verified bots: 5 emails/day

Limits reset at midnight UTC.
`);
  });

  // ============================================
  // REWARD ENDPOINTS
  // ============================================

  // Daily check-in status
  router.get('/rewards/daily-checkin', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID not found' });
        return;
      }

      const today = getTodayDate();
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Get today's check-in
      const [todayCheckin] = await db.select().from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today)))
        .limit(1);

      // Get yesterday's check-in for streak info
      const [yesterdayCheckin] = await db.select().from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, yesterday)))
        .limit(1);

      // Get last check-in overall
      const [lastCheckin] = await db.select().from(dailyCheckins)
        .where(eq(dailyCheckins.userId, userId))
        .orderBy(desc(dailyCheckins.date))
        .limit(1);

      const currentStreak = todayCheckin?.streakCount || yesterdayCheckin?.streakCount || 0;
      const canClaim = !todayCheckin;

      // Calculate potential reward
      let potentialReward = 10; // base
      if (currentStreak >= 7) potentialReward = 20;
      else if (currentStreak >= 3) potentialReward = 15;

      res.json({
        canClaim,
        claimedToday: !!todayCheckin,
        currentStreak,
        potentialReward,
        lastClaimDate: lastCheckin?.date || null,
        todayCredits: todayCheckin?.creditsAwarded || 0
      });
    } catch (error) {
      console.error('[SendClaw] Daily checkin status error:', error);
      res.status(500).json({ error: 'Failed to get check-in status' });
    }
  });

  // Claim daily check-in reward
  router.post('/rewards/daily-checkin', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID not found' });
        return;
      }

      const today = getTodayDate();
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Check if already claimed today
      const [existingCheckin] = await db.select().from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today)))
        .limit(1);

      if (existingCheckin) {
        res.status(400).json({ 
          error: 'Already claimed today',
          creditsAwarded: existingCheckin.creditsAwarded,
          streakCount: existingCheckin.streakCount
        });
        return;
      }

      // Get yesterday's check-in for streak calculation
      const [yesterdayCheckin] = await db.select().from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, yesterday)))
        .limit(1);

      // Calculate streak
      const newStreak = yesterdayCheckin ? yesterdayCheckin.streakCount + 1 : 1;

      // Calculate credits (max 20)
      let creditsToAward = 10; // base
      if (newStreak >= 7) creditsToAward = 20;
      else if (newStreak >= 3) creditsToAward = 15;

      // Award credits via CreditRewardService
      const rewardKey = `daily_checkin:${today}`;
      const rewardResult = await CreditRewardService.awardOneTimeCredits(
        userId,
        creditsToAward,
        rewardKey,
        `Daily check-in (Day ${newStreak} streak)`
      );

      if (!rewardResult.credited) {
        res.status(400).json({ error: 'Already claimed this reward' });
        return;
      }

      // Record check-in
      await db.insert(dailyCheckins).values({
        userId,
        date: today,
        creditsAwarded: creditsToAward,
        streakCount: newStreak
      });

      console.log(`[SendClaw] Daily check-in: user ${userId} claimed ${creditsToAward} credits (streak: ${newStreak})`);

      res.json({
        success: true,
        creditsAwarded: creditsToAward,
        streakCount: newStreak,
        newBalance: rewardResult.newBalance,
        message: newStreak >= 7 
          ? 'Max streak bonus! Keep it up!' 
          : newStreak >= 3 
            ? 'Streak bonus active!' 
            : 'Come back tomorrow to build your streak!'
      });
    } catch (error) {
      console.error('[SendClaw] Daily checkin claim error:', error);
      res.status(500).json({ error: 'Failed to claim daily check-in' });
    }
  });

  // Get social share rewards status
  router.get('/rewards/share', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID not found' });
        return;
      }

      const userShares = await db.select().from(socialShareRewards)
        .where(eq(socialShareRewards.userId, userId))
        .orderBy(desc(socialShareRewards.createdAt));

      const platforms = ['twitter', 'linkedin', 'facebook'] as const;
      const platformCredits = { twitter: 50, linkedin: 50, facebook: 30 };
      
      const availablePlatforms = platforms.filter(p => 
        !userShares.some(s => s.platform === p && s.status !== 'rejected')
      );

      res.json({
        shares: userShares.map(s => ({
          platform: s.platform,
          postUrl: s.postUrl,
          status: s.status,
          creditsAwarded: s.creditsAwarded,
          createdAt: s.createdAt
        })),
        availablePlatforms: availablePlatforms.map(p => ({
          platform: p,
          credits: platformCredits[p]
        })),
        totalEarned: userShares.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.creditsAwarded, 0)
      });
    } catch (error) {
      console.error('[SendClaw] Share status error:', error);
      res.status(500).json({ error: 'Failed to get share status' });
    }
  });

  // Submit social share for reward
  router.post('/rewards/share', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID not found' });
        return;
      }

      const { platform, postUrl } = req.body;

      // Validate platform
      const validPlatforms = ['twitter', 'linkedin', 'facebook'];
      if (!platform || !validPlatforms.includes(platform)) {
        res.status(400).json({ error: 'Invalid platform. Must be twitter, linkedin, or facebook' });
        return;
      }

      // Validate URL
      if (!postUrl || typeof postUrl !== 'string') {
        res.status(400).json({ error: 'Post URL is required' });
        return;
      }

      // Validate URL format and matches platform domain
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(postUrl);
      } catch {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }

      const platformDomains: Record<string, string[]> = {
        twitter: ['twitter.com', 'x.com'],
        linkedin: ['linkedin.com', 'www.linkedin.com'],
        facebook: ['facebook.com', 'www.facebook.com', 'fb.com']
      };

      const hostname = parsedUrl.hostname.toLowerCase();
      const isValidDomain = platformDomains[platform].some(d => 
        hostname === d || hostname === `www.${d}` || hostname.endsWith(`.${d}`)
      );
      if (!isValidDomain) {
        res.status(400).json({ error: `URL must be from ${platform}` });
        return;
      }

      // Ensure HTTPS
      if (parsedUrl.protocol !== 'https:') {
        res.status(400).json({ error: 'URL must use HTTPS' });
        return;
      }

      // Check if already submitted for this platform
      const [existingShare] = await db.select().from(socialShareRewards)
        .where(and(
          eq(socialShareRewards.userId, userId),
          eq(socialShareRewards.platform, platform)
        ))
        .limit(1);

      if (existingShare) {
        if (existingShare.status === 'rejected') {
          // Allow resubmission for rejected shares
          await db.update(socialShareRewards)
            .set({ postUrl, status: 'pending', reviewedAt: null })
            .where(eq(socialShareRewards.id, existingShare.id));
          
          res.json({ success: true, status: 'pending', message: 'Resubmitted for review' });
          return;
        }
        res.status(400).json({ 
          error: 'Already submitted for this platform',
          status: existingShare.status
        });
        return;
      }

      // Calculate credits
      const platformCredits: Record<string, number> = { twitter: 50, linkedin: 50, facebook: 30 };
      const creditsToAward = platformCredits[platform];

      // Auto-approve if URL looks valid (MVP: simple domain check)
      const status = 'approved';
      
      // Award credits
      const rewardKey = `share:${platform}`;
      const rewardResult = await CreditRewardService.awardOneTimeCredits(
        userId,
        creditsToAward,
        rewardKey,
        `Social share reward (${platform})`
      );

      // Record share
      await db.insert(socialShareRewards).values({
        userId,
        platform: platform as 'twitter' | 'linkedin' | 'facebook',
        postUrl,
        status,
        creditsAwarded: rewardResult.credited ? creditsToAward : 0,
        reviewedAt: new Date()
      });

      console.log(`[SendClaw] Social share: user ${userId} earned ${creditsToAward} credits for ${platform} share`);

      res.json({
        success: true,
        status,
        creditsAwarded: rewardResult.credited ? creditsToAward : 0,
        newBalance: rewardResult.newBalance,
        message: 'Thanks for sharing! Credits added to your account.'
      });
    } catch (error) {
      console.error('[SendClaw] Share submit error:', error);
      res.status(500).json({ error: 'Failed to submit share' });
    }
  });

  console.log('[SendClaw] Routes registered');
}

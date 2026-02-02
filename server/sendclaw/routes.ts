import express, { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { bots, handles, messages, quotaUsage, insertBotSchema, insertMessageSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { MailService } from '@sendgrid/mail';
import multer from "multer";

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

    const { name } = parsed.data;
    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();

    const [bot] = await db.insert(bots).values({
      name,
      apiKey,
      claimToken,
      verified: false
    }).returning();

    console.log(`[SendClaw] Bot registered: ${name} (${bot.id})`);

    res.status(201).json({
      botId: bot.id,
      apiKey,
      claimToken,
      important: "Save your API key! Give claimToken to your human if they want dashboard access."
    });
  } catch (error) {
    console.error('[SendClaw] Registration error:', error);
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

    let botMessages: any[] = [];
    if (userBot) {
      botMessages = await db.select().from(messages)
        .where(eq(messages.botId, userBot.id))
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
        verified: userBot.verified,
        claimedAt: userBot.claimedAt,
        createdAt: userBot.createdAt
      } : null,
      messages: botMessages
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

    if (!userBot) {
      res.status(400).json({ 
        error: 'No bot linked to your account. Claim a bot first to send emails.',
        hint: 'Use a claim token from your bot to link it to your account.'
      });
      return;
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
    const senderName = userBot.name;

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sendGridService.send({
          to,
          from: {
            email: fromAddress,
            name: senderName
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
      botId: userBot.id,
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
            name: bot.name
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

  console.log('[SendClaw] Routes registered');
}

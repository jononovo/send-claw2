import express, { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { bots, handles, messages, insertBotSchema, insertMessageSchema } from "@shared/schema";
import { eq, desc, sql, or } from "drizzle-orm";
import { rewardsRouter } from "../features/sendclaw-rewards";
import { publicRouter } from "../features/sendclaw-public";
import { mailRouter } from "../features/sendclaw-mail";
import {
  SENDCLAW_DOMAIN,
  sendGridService,
  getClientIP,
  checkRegistrationRateLimitInTx,
  logSecurityEvent,
  generateApiKey,
  generateClaimToken,
  generateMessageId,
  generateThreadId,
  getHandleByAddress,
  getHandleByUserId,
  apiKeyAuth,
  loadBotFromApiKey,
} from "./common";

const router = Router();

router.post('/bots/register', async (req: Request, res: Response) => {
  const clientIP = getClientIP(req);
  let attemptedHandle: string | null = null;

  try {
    const parsed = insertBotSchema.safeParse(req.body);
    if (!parsed.success) {
      await logSecurityEvent('validation_error', clientIP, null, null, {
        errors: parsed.error.errors
      });
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors
      });
      return;
    }

    const { name, handle, senderName, webhookUrl } = parsed.data;
    const normalizedHandle = handle.toLowerCase();
    attemptedHandle = normalizedHandle;
    const address = `${normalizedHandle}@${SENDCLAW_DOMAIN}`;

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();

    const result = await db.transaction(async (tx) => {
      const ipHash = Buffer.from(clientIP).reduce((hash, byte) => ((hash << 5) - hash + byte) | 0, 0);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${ipHash})`);

      const rateCheck = await checkRegistrationRateLimitInTx(tx, clientIP);
      if (!rateCheck.allowed) {
        return { blocked: true as const, rateCheck };
      }

      const existingHandle = await tx.select().from(handles)
        .where(eq(handles.address, normalizedHandle)).limit(1);
      if (existingHandle.length > 0) {
        return { blocked: true as const, duplicateHandle: true as const };
      }

      const [bot] = await tx.insert(bots).values({
        name,
        senderName,
        address,
        apiKey,
        claimToken,
        verified: false,
        registrationIp: clientIP,
        webhookUrl: webhookUrl || null
      }).returning();

      await tx.insert(handles).values({
        address: normalizedHandle,
        botId: bot.id
      });

      return { blocked: false as const, bot };
    });

    if (result.blocked) {
      if ('duplicateHandle' in result) {
        await logSecurityEvent('duplicate_handle', clientIP, normalizedHandle, null, {
          name, address
        });
        res.status(409).json({ error: 'Handle already reserved' });
        return;
      }

      const { rateCheck } = result;
      console.log(`[SendClaw] Registration blocked for IP ${clientIP}: ${rateCheck.reason}`);
      await logSecurityEvent('rate_limit_hit', clientIP, normalizedHandle, null, {
        reason: rateCheck.reason,
        retryAfter: rateCheck.retryAfter,
        name
      });
      res.status(429).json({
        error: rateCheck.reason,
        ...(rateCheck.retryAfter && { retryAfter: rateCheck.retryAfter })
      });
      return;
    }

    const { bot } = result;

    await logSecurityEvent('registration_success', clientIP, normalizedHandle, bot.id, {
      name, address
    });

    console.log(`[SendClaw] Bot registered: ${name} (${address}) from IP ${clientIP}`);

    res.status(201).json({
      botId: bot.id,
      email: address,
      apiKey,
      claimToken,
      important: "Save your API key! Give claimToken to your human if they want dashboard access."
    });
  } catch (error: any) {
    console.error('[SendClaw] Registration error:', error);
    await logSecurityEvent('registration_error', clientIP, attemptedHandle, null, {
      error: error?.message,
      code: error?.code,
      constraint: error?.constraint
    });
    if (error?.code === '23505' && error?.constraint === 'bots_address_key') {
      res.status(409).json({ error: 'Handle already taken' });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

const webhookUrlSchema = z.object({
  webhookUrl: z.string().url("Must be a valid URL").max(500).startsWith("https://", "Webhook URL must use HTTPS").nullable()
});

router.patch('/bots/webhook', apiKeyAuth, loadBotFromApiKey, async (req: Request, res: Response) => {
  try {
    const bot = (req as any).bot;
    const parsed = webhookUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
      return;
    }
    const { webhookUrl } = parsed.data;
    await db.update(bots).set({ webhookUrl: webhookUrl || null }).where(eq(bots.id, bot.id));
    console.log(`[SendClaw] Webhook URL updated for bot ${bot.address}: ${webhookUrl || 'removed'}`);
    res.json({ success: true, webhookUrl: webhookUrl || null });
  } catch (error: any) {
    console.error('[SendClaw] Webhook update error:', error);
    res.status(500).json({ error: 'Failed to update webhook URL' });
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
      claimedAt: new Date(),
      verified: true
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

router.patch('/handles/:handleId/sender-name', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    const { handleId } = req.params;
    const { senderName } = req.body;

    if (!senderName || typeof senderName !== 'string' || senderName.length < 1 || senderName.length > 100) {
      res.status(400).json({ error: 'Sender name must be 1-100 characters' });
      return;
    }

    const [handle] = await db.select().from(handles).where(eq(handles.id, handleId)).limit(1);
    if (!handle) {
      res.status(404).json({ error: 'Handle not found' });
      return;
    }

    if (handle.userId !== userId) {
      res.status(403).json({ error: 'Not authorized to modify this handle' });
      return;
    }

    await db.update(handles).set({ senderName }).where(eq(handles.id, handleId));

    console.log(`[SendClaw] Handle sender name updated: ${handle.address} -> "${senderName}"`);
    res.json({ success: true, senderName });
  } catch (error) {
    console.error('[SendClaw] Update handle sender name error:', error);
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
        senderName: userHandle.senderName,
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
    const senderDisplayName = userBot?.senderName || userHandle.senderName || user?.displayName || userHandle.address;

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

export function registerSendClawRoutes(app: express.Express) {
  app.use('/api', router);
  app.use('/api', rewardsRouter);
  app.use('/api', publicRouter);
  app.use('/api', mailRouter);

  console.log('[SendClaw] Routes registered');
}

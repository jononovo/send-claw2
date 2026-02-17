import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { MailService } from '@sendgrid/mail';
import { db } from "../../db";
import { bots, handles, securityEvents, securityIpBlocks } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export const SENDCLAW_DOMAIN = process.env.SENDCLAW_DOMAIN || 'sendclaw.com';
export const FROM_EMAIL = process.env.SENDCLAW_FROM_EMAIL || `noreply@${SENDCLAW_DOMAIN}`;

export const REGISTRATION_COOLDOWN_SECONDS = 300;
export const DAILY_REGISTRATION_LIMIT = 5;

export const sendGridService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sendGridService.setApiKey(process.env.SENDGRID_API_KEY);
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',').map(ip => ip.trim());
    return ips[ips.length - 1] || req.ip || 'unknown';
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export async function checkRegistrationRateLimitInTx(tx: any, ip: string): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
  const [ipBlock] = await db
    .select({ id: securityIpBlocks.id, blockedUntil: securityIpBlocks.blockedUntil })
    .from(securityIpBlocks)
    .where(and(
      eq(securityIpBlocks.ip, ip),
      gte(securityIpBlocks.blockedUntil, new Date())
    ))
    .limit(1);

  if (ipBlock) {
    const remainingMs = ipBlock.blockedUntil.getTime() - Date.now();
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return {
      allowed: false,
      reason: `This IP address has been blocked due to suspicious activity. Block expires in ${remainingHours} hours.`
    };
  }

  const [result] = await tx.select({
    recentCount: sql<number>`COUNT(*) FILTER (WHERE ${bots.createdAt} > NOW() - INTERVAL '5 minutes')`,
    dailyCount: sql<number>`COUNT(*) FILTER (WHERE ${bots.createdAt} > NOW() - INTERVAL '24 hours')`
  }).from(bots).where(eq(bots.registrationIp, ip));

  const recentCount = Number(result?.recentCount ?? 0);
  const dailyCount = Number(result?.dailyCount ?? 0);

  if (recentCount > 0) {
    return {
      allowed: false,
      reason: `Please wait before registering another bot (cooldown: ${REGISTRATION_COOLDOWN_SECONDS}s)`,
      retryAfter: REGISTRATION_COOLDOWN_SECONDS
    };
  }

  if (dailyCount >= DAILY_REGISTRATION_LIMIT) {
    return {
      allowed: false,
      reason: `Daily registration limit (${DAILY_REGISTRATION_LIMIT}) reached. Try again tomorrow.`
    };
  }

  return { allowed: true };
}

export async function logSecurityEvent(eventType: string, ip: string | null, handle: string | null, botId: string | null, details: Record<string, any> = {}): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      eventType,
      ip,
      handle,
      botId,
      details
    });
  } catch (err) {
    console.error('[SendClaw] Failed to log security event:', err);
  }
}

export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(24).toString('hex')}`;
}

export function generateClaimToken(): string {
  const words = ['reef', 'wave', 'claw', 'tide', 'kelp', 'coral', 'shell', 'pearl'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${word}-${code}`;
}

export function generateMessageId(): string {
  return `<${crypto.randomUUID()}@${SENDCLAW_DOMAIN}>`;
}

export function generateThreadId(): string {
  return crypto.randomUUID();
}

export function parseSearchQuery(q: string): { 
  from?: string; 
  to?: string; 
  subject?: string; 
  after?: Date;
  before?: Date;
  keywords: string[];
} {
  const result: { from?: string; to?: string; subject?: string; after?: Date; before?: Date; keywords: string[] } = { keywords: [] };
  const tokens = q.trim().split(/\s+/);
  
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (lowerToken.startsWith('from:')) result.from = token.slice(5);
    else if (lowerToken.startsWith('to:')) result.to = token.slice(3);
    else if (lowerToken.startsWith('subject:')) result.subject = token.slice(8);
    else if (lowerToken.startsWith('after:')) {
      const dateStr = token.slice(6);
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) result.after = parsed;
    }
    else if (lowerToken.startsWith('before:')) {
      const dateStr = token.slice(7);
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) result.before = parsed;
    }
    else if (token) result.keywords.push(token);
  }
  
  return result;
}

export async function getBotByApiKey(apiKey: string) {
  const [bot] = await db.select().from(bots).where(eq(bots.apiKey, apiKey)).limit(1);
  return bot;
}

export async function getHandleByAddress(address: string) {
  const [handle] = await db.select().from(handles).where(eq(handles.address, address)).limit(1);
  return handle;
}

export async function getHandleByBotId(botId: string) {
  const [handle] = await db.select().from(handles).where(eq(handles.botId, botId)).limit(1);
  return handle;
}

export async function getHandleByUserId(userId: number) {
  const [handle] = await db.select().from(handles).where(eq(handles.userId, userId)).limit(1);
  return handle;
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string || req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required', hint: 'Include X-Api-Key header' });
    return;
  }

  (req as any).apiKey = apiKey;
  next();
}

export async function loadBotFromApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = (req as any).apiKey;
  const bot = await getBotByApiKey(apiKey);
  
  if (!bot) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  (req as any).bot = bot;
  next();
}

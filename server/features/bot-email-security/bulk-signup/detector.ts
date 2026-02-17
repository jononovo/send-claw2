import Anthropic from '@anthropic-ai/sdk';
import { db } from '../../../db';
import { bots, securityBulkSignupAlerts } from '@shared/schema';
import { gte, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendBulkSignupAlert } from './report';
import { logSecurityEvent } from '../../../sendclaw/common';

const SCAN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LOOKBACK_HOURS = 24;
const MIN_CLUSTER_SIZE = 10;
const MIN_DISTINCT_IPS = 3;
const BATCH_SIZE = 100;
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface BotRow {
  id: string;
  name: string;
  senderName: string;
  address: string | null;
  registrationIp: string | null;
  status: string | null;
  verified: boolean | null;
  flagCount: number | null;
  userId: number | null;
  claimedAt: Date | null;
  createdAt: Date | null;
}

interface DetectedGroup {
  botIds: string[];
  pattern: string;
}

const SYSTEM_PROMPT = `You are a security analyst for SendClaw, a bot email service.
Your job is to analyze recent bot registrations and identify coordinated bulk signup attacks.

Attackers register many bots across multiple IPs to bypass per-IP rate limits. They use naming patterns with structural similarities — shared prefixes, suffixes, templates, or embedded words in the same position.

IDENTIFY COORDINATED GROUPS:
- Bots with structurally similar names (e.g., "agproxyvortexdelta", "agproxybytedelta" share "agproxy" prefix)
- Bots following the same naming template (e.g., "david-alpha-7291", "david-bravo-3847" share "david-" prefix and number suffix)
- Bots with identical character sequences in the same positions across names, sender names, or handles
- Groups should have similar registration timing

DO NOT FLAG:
- Bots that coincidentally share common words like "agent", "bot", "helper" in different positions or contexts
- Small groups of 2-3 similar bots — only flag groups of 10+
- Legitimate bots that happen to register around the same time

Only return groups you are confident represent coordinated signups.
If no coordinated patterns are found, return an empty array.

Return JSON format:
{
  "groups": [
    { "botIds": ["id1", "id2", ...], "pattern": "short description of the naming pattern" }
  ]
}`;

async function reviewRegistrations(botRows: BotRow[]): Promise<DetectedGroup[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const allGroups: DetectedGroup[] = [];

  for (let i = 0; i < botRows.length; i += BATCH_SIZE) {
    const batch = botRows.slice(i, i + BATCH_SIZE);

    const dataForReview = batch.map(b => ({
      id: b.id,
      name: b.name,
      senderName: b.senderName,
      handle: b.address || null,
      ip: b.registrationIp || null,
      createdAt: b.createdAt?.toISOString() || null,
      claimed: b.claimedAt !== null
    }));

    const userMessage = `Analyze these ${batch.length} recent bot registrations for coordinated bulk signup patterns:\n\n${JSON.stringify(dataForReview, null, 2)}`;

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        console.error('[BulkSignupDetector] Unexpected response type:', content.type);
        continue;
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[BulkSignupDetector] Could not parse JSON from response:', content.text.slice(0, 500));
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[BulkSignupDetector] JSON parse error:', parseError);
        continue;
      }

      if (parsed.groups && Array.isArray(parsed.groups)) {
        const validIds = new Set(batch.map(b => b.id));
        for (const group of parsed.groups) {
          if (group.botIds && Array.isArray(group.botIds) && group.pattern) {
            const filteredIds = group.botIds.filter((id: string) => validIds.has(id));
            if (filteredIds.length >= MIN_CLUSTER_SIZE) {
              allGroups.push({ botIds: filteredIds, pattern: group.pattern });
            }
          }
        }
      }

      console.log(`[BulkSignupDetector] AI review batch ${Math.floor(i / BATCH_SIZE) + 1}: ${allGroups.length} groups found so far`);

    } catch (error) {
      console.error('[BulkSignupDetector] AI review error:', error);
      continue;
    }
  }

  return allGroups;
}

function generateSignature(pattern: string, windowStart: Date, windowEnd: Date): string {
  const raw = `${pattern}|${windowStart.toISOString()}|${windowEnd.toISOString()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

async function runDetection(): Promise<void> {
  const lookbackStart = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  console.log(`[BulkSignupDetector] Scanning bots registered since ${lookbackStart.toISOString()}`);

  const recentBots = await db
    .select({
      id: bots.id,
      name: bots.name,
      senderName: bots.senderName,
      address: bots.address,
      registrationIp: bots.registrationIp,
      status: bots.status,
      verified: bots.verified,
      flagCount: bots.flagCount,
      userId: bots.userId,
      claimedAt: bots.claimedAt,
      createdAt: bots.createdAt
    })
    .from(bots)
    .where(gte(bots.createdAt, lookbackStart))
    .orderBy(bots.createdAt);

  console.log(`[BulkSignupDetector] Found ${recentBots.length} recent bot registrations`);

  if (recentBots.length < MIN_CLUSTER_SIZE) {
    console.log(`[BulkSignupDetector] Not enough registrations to analyze`);
    return;
  }

  const groups = await reviewRegistrations(recentBots);
  console.log(`[BulkSignupDetector] AI detected ${groups.length} suspicious groups`);

  const botById = new Map(recentBots.map(b => [b.id, b]));

  for (const group of groups) {
    const groupBots = group.botIds.map(id => botById.get(id)!).filter(Boolean);

    const ips = [...new Set(groupBots.map(b => b.registrationIp).filter((ip): ip is string => ip !== null))];
    if (ips.length < MIN_DISTINCT_IPS) {
      console.log(`[BulkSignupDetector] Group "${group.pattern}" has only ${ips.length} distinct IPs, skipping`);
      continue;
    }

    const timestamps = groupBots
      .map(b => b.createdAt?.getTime() || 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) continue;

    const windowStart = new Date(timestamps[0]);
    const windowEnd = new Date(timestamps[timestamps.length - 1]);
    const claimedCount = groupBots.filter(b => b.claimedAt !== null).length;

    const signature = generateSignature(group.pattern, windowStart, windowEnd);

    const [existing] = await db
      .select({ id: securityBulkSignupAlerts.id })
      .from(securityBulkSignupAlerts)
      .where(eq(securityBulkSignupAlerts.signature, signature))
      .limit(1);

    if (existing) {
      console.log(`[BulkSignupDetector] Alert already exists for "${group.pattern}", skipping`);
      continue;
    }

    const approvalToken = crypto.randomUUID();

    const [alert] = await db.insert(securityBulkSignupAlerts).values({
      signature,
      status: 'pending',
      namePrefix: group.pattern,
      senderPrefix: group.pattern,
      botIds: group.botIds as any,
      ipList: ips as any,
      botCount: groupBots.length,
      claimedCount,
      windowStart,
      windowEnd,
      approvalToken
    }).returning();

    console.log(`[BulkSignupDetector] Created alert ${alert.id}: ${groupBots.length} bots matching "${group.pattern}" across ${ips.length} IPs`);

    await logSecurityEvent('bulk_signup_detected', null, null, null, {
      alertId: alert.id,
      pattern: group.pattern,
      botCount: groupBots.length,
      ipCount: ips.length,
      claimedCount
    });

    try {
      await sendBulkSignupAlert(alert, groupBots);
      console.log(`[BulkSignupDetector] Alert email sent for ${alert.id}`);
    } catch (err) {
      console.error(`[BulkSignupDetector] Failed to send alert email:`, err);
    }
  }
}

class BulkSignupDetector {
  private intervalId: NodeJS.Timeout | null = null;

  initialize() {
    if (!process.env.REPL_DEPLOYMENT) {
      console.log('[BulkSignupDetector] Skipping in development — bulk signup detection only runs in production');
      return;
    }

    console.log('[BulkSignupDetector] Starting detector (interval: 12h)');
    this.intervalId = setInterval(() => {
      runDetection().catch(err => {
        console.error('[BulkSignupDetector] Detection run failed:', err);
      });
    }, SCAN_INTERVAL_MS);

    setTimeout(() => {
      runDetection().catch(err => {
        console.error('[BulkSignupDetector] Initial detection run failed:', err);
      });
    }, 30_000);
  }

  async forceRun(): Promise<void> {
    console.log('[BulkSignupDetector] Force running detection...');
    await runDetection();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BulkSignupDetector] Stopped');
    }
  }
}

export const bulkSignupDetector = new BulkSignupDetector();

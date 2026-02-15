import { db } from '../../../db';
import { bots, securityBulkSignupAlerts } from '@shared/schema';
import { gte, eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { sendBulkSignupAlert } from './report';
import { logSecurityEvent } from '../../../sendclaw/common';

const SCAN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LOOKBACK_HOURS = 24;
const MIN_CLUSTER_SIZE = 10;
const MIN_PREFIX_LENGTH = 6;
const MIN_DISTINCT_IPS = 3;
const MAX_WINDOW_MINUTES = 60;

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

interface DetectedCluster {
  namePrefix: string;
  senderPrefix: string;
  bots: BotRow[];
  ips: string[];
  claimedCount: number;
  windowStart: Date;
  windowEnd: Date;
}

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  const sorted = strings.slice().sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let i = 0;
  while (i < first.length && first[i] === last[i]) i++;
  return first.slice(0, i);
}

function groupByPrefix(botRows: BotRow[]): Map<string, BotRow[]> {
  const candidateMap = new Map<string, string[]>();
  for (const bot of botRows) {
    const name = bot.name.toLowerCase();
    const prefixes: string[] = [];
    const parts = name.split(/[-_]/);
    let accumulated = '';
    for (let i = 0; i < parts.length; i++) {
      accumulated += (i > 0 ? '-' : '') + parts[i];
      const clean = accumulated.replace(/[0-9]+$/, '');
      if (clean.length >= MIN_PREFIX_LENGTH && !prefixes.includes(clean)) {
        prefixes.push(clean);
      }
    }
    const rawStripped = name.replace(/[0-9]+$/, '');
    if (rawStripped.length >= MIN_PREFIX_LENGTH && !prefixes.includes(rawStripped)) {
      prefixes.push(rawStripped);
    }
    candidateMap.set(bot.id, prefixes);
  }

  const prefixBotIds = new Map<string, Set<string>>();
  for (const [botId, prefixes] of candidateMap) {
    for (const prefix of prefixes) {
      if (!prefixBotIds.has(prefix)) prefixBotIds.set(prefix, new Set());
      prefixBotIds.get(prefix)!.add(botId);
    }
  }

  const sortedPrefixes = [...prefixBotIds.entries()]
    .filter(([_, ids]) => ids.size >= MIN_CLUSTER_SIZE)
    .sort((a, b) => b[1].size - a[1].size || a[0].length - b[0].length);

  const result = new Map<string, BotRow[]>();
  const assignedBotIds = new Set<string>();
  const botById = new Map(botRows.map(b => [b.id, b]));

  for (const [prefix, botIds] of sortedPrefixes) {
    const unassigned = [...botIds].filter(id => !assignedBotIds.has(id));
    if (unassigned.length >= MIN_CLUSTER_SIZE) {
      result.set(prefix, unassigned.map(id => botById.get(id)!));
      for (const id of unassigned) assignedBotIds.add(id);
    }
  }

  return result;
}

function detectClusters(botRows: BotRow[]): DetectedCluster[] {
  const prefixGroups = groupByPrefix(botRows);
  const clusters: DetectedCluster[] = [];

  for (const [prefix, group] of prefixGroups) {
    if (group.length < MIN_CLUSTER_SIZE) continue;

    const ips = [...new Set(group.map(b => b.registrationIp).filter((ip): ip is string => ip !== null))];
    if (ips.length < MIN_DISTINCT_IPS) continue;

    const timestamps = group
      .map(b => b.createdAt?.getTime() || 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) continue;

    const windowMs = timestamps[timestamps.length - 1] - timestamps[0];
    if (windowMs > MAX_WINDOW_MINUTES * 60 * 1000) continue;

    const claimedCount = group.filter(b => b.claimedAt !== null).length;

    const senderNames = group.map(b => b.senderName);
    const senderPrefix = findCommonPrefix(senderNames);

    clusters.push({
      namePrefix: prefix,
      senderPrefix: senderPrefix || prefix,
      bots: group,
      ips,
      claimedCount,
      windowStart: new Date(timestamps[0]),
      windowEnd: new Date(timestamps[timestamps.length - 1])
    });
  }

  return clusters;
}

function generateSignature(prefix: string, windowStart: Date, windowEnd: Date): string {
  const raw = `${prefix}|${windowStart.toISOString()}|${windowEnd.toISOString()}`;
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

  const clusters = detectClusters(recentBots);
  console.log(`[BulkSignupDetector] Detected ${clusters.length} suspicious clusters`);

  for (const cluster of clusters) {
    const signature = generateSignature(cluster.namePrefix, cluster.windowStart, cluster.windowEnd);

    const [existing] = await db
      .select({ id: securityBulkSignupAlerts.id })
      .from(securityBulkSignupAlerts)
      .where(eq(securityBulkSignupAlerts.signature, signature))
      .limit(1);

    if (existing) {
      console.log(`[BulkSignupDetector] Alert already exists for signature ${signature}, skipping`);
      continue;
    }

    const approvalToken = crypto.randomUUID();
    const botIds = cluster.bots.map(b => b.id);

    const [alert] = await db.insert(securityBulkSignupAlerts).values({
      signature,
      status: 'pending',
      namePrefix: cluster.namePrefix,
      senderPrefix: cluster.senderPrefix,
      botIds: botIds as any,
      ipList: cluster.ips as any,
      botCount: cluster.bots.length,
      claimedCount: cluster.claimedCount,
      windowStart: cluster.windowStart,
      windowEnd: cluster.windowEnd,
      approvalToken
    }).returning();

    console.log(`[BulkSignupDetector] Created alert ${alert.id}: ${cluster.bots.length} bots with prefix "${cluster.namePrefix}" across ${cluster.ips.length} IPs`);

    await logSecurityEvent('bulk_signup_detected', null, null, null, {
      alertId: alert.id,
      namePrefix: cluster.namePrefix,
      botCount: cluster.bots.length,
      ipCount: cluster.ips.length,
      claimedCount: cluster.claimedCount
    });

    try {
      await sendBulkSignupAlert(alert, cluster.bots);
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

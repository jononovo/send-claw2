import { db } from '../../db';
import { bots, messages, emailFlags, securityReports } from '@shared/schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import { reviewEmails } from './ai-reviewer';
import { sendDailyReport } from './report-generator';
import { EmailForReview, SecurityReportData, FlaggedEmailReport, DailyStats } from './types';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const RUN_HOUR = 0; // Run at midnight UTC

class BotEmailSecurityEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunDate: string | null = null;
  private isProcessing = false;

  async initialize() {
    console.log('[BotEmailSecurity] Initializing security review engine...');
    this.startPolling();
    console.log('[BotEmailSecurity] Engine initialized, polling started');
  }

  private startPolling() {
    if (this.intervalId) {
      console.log('[BotEmailSecurity] Polling already running');
      return;
    }

    console.log(`[BotEmailSecurity] Starting polling every ${POLL_INTERVAL_MS / 1000}s`);
    
    this.intervalId = setInterval(async () => {
      await this.checkAndRun();
    }, POLL_INTERVAL_MS);

    this.checkAndRun();
  }

  private async checkAndRun() {
    if (this.isProcessing) {
      console.log('[BotEmailSecurity] Already processing, skipping');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (this.lastRunDate === today) {
      return;
    }

    if (now.getUTCHours() >= RUN_HOUR) {
      console.log(`[BotEmailSecurity] Running daily review for ${today}`);
      this.isProcessing = true;
      
      try {
        await this.runDailyReview();
        this.lastRunDate = today;
      } catch (error) {
        console.error('[BotEmailSecurity] Daily review failed:', error);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  async runDailyReview() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportDate = yesterday.toISOString().split('T')[0];

    console.log(`[BotEmailSecurity] Reviewing emails from ${reportDate}`);

    const outboundEmails = await db
      .select({
        id: messages.id,
        botId: messages.botId,
        toAddress: messages.toAddress,
        subject: messages.subject,
        bodyText: messages.bodyText,
        createdAt: messages.createdAt
      })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        gte(messages.createdAt, yesterday),
        lte(messages.createdAt, today)
      ));

    const botIds = Array.from(new Set(outboundEmails.map(e => e.botId).filter((id): id is string => id !== null)));
    const botMap = new Map<string, { name: string; address: string | null }>();
    
    if (botIds.length > 0) {
      const botsData = await db
        .select({ id: bots.id, name: bots.name, address: bots.address })
        .from(bots)
        .where(sql`${bots.id} = ANY(${botIds})`);
      
      botsData.forEach(b => botMap.set(b.id, { name: b.name, address: b.address }));
    }

    const emailsForReview: EmailForReview[] = outboundEmails
      .filter(e => e.botId)
      .map(e => ({
        id: e.id,
        botId: e.botId!,
        botName: botMap.get(e.botId!)?.name || 'Unknown',
        toAddress: e.toAddress,
        subject: e.subject,
        bodyText: e.bodyText,
        createdAt: e.createdAt!
      }));

    console.log(`[BotEmailSecurity] Found ${emailsForReview.length} outbound emails to review`);

    const reviewResult = await reviewEmails(emailsForReview);
    const flaggedEmails: FlaggedEmailReport[] = [];

    for (const flag of reviewResult.flagged) {
      const email = emailsForReview.find(e => e.id === flag.id);
      if (!email) continue;

      await db.insert(emailFlags).values({
        messageId: email.id,
        botId: email.botId,
        suggestedStatus: flag.status,
        reason: flag.reason
      });

      await this.updateBotStatus(email.botId, flag.status);

      const bot = botMap.get(email.botId);
      flaggedEmails.push({
        messageId: email.id,
        botId: email.botId,
        botName: bot?.name || 'Unknown',
        botAddress: bot?.address || 'unknown',
        toEmail: email.toAddress,
        subject: email.subject || '(no subject)',
        bodyPreview: email.bodyText || '',
        suggestedStatus: flag.status,
        reason: flag.reason,
        createdAt: email.createdAt.toISOString()
      });
    }

    const stats = await this.gatherStats(yesterday, today);
    const allSubjectLines = outboundEmails
      .map(e => e.subject || '(no subject)')
      .slice(0, 100);

    const reportData: SecurityReportData = {
      date: reportDate,
      stats,
      flaggedEmails,
      allSubjectLines
    };

    await db.insert(securityReports).values({
      reportDate,
      stats: stats as any,
      flaggedEmails: flaggedEmails as any,
      sentToAdmin: false
    }).onConflictDoUpdate({
      target: securityReports.reportDate,
      set: {
        stats: stats as any,
        flaggedEmails: flaggedEmails as any
      }
    });

    const sent = await sendDailyReport(reportData);
    
    if (sent) {
      await db.update(securityReports)
        .set({ sentToAdmin: true })
        .where(eq(securityReports.reportDate, reportDate));
    }

    console.log(`[BotEmailSecurity] Daily review complete. Flagged: ${flaggedEmails.length}, Report sent: ${sent}`);
  }

  private async updateBotStatus(botId: string, suggestedStatus: 'flagged' | 'under_review' | 'suspended') {
    const [bot] = await db
      .select({ status: bots.status, flagCount: bots.flagCount })
      .from(bots)
      .where(eq(bots.id, botId));

    if (!bot) return;

    const currentStatus = bot.status || 'normal';
    const currentFlagCount = bot.flagCount || 0;
    const newFlagCount = currentFlagCount + 1;

    let newStatus = currentStatus;

    if (suggestedStatus === 'suspended') {
      newStatus = 'suspended';
    } else if (suggestedStatus === 'under_review') {
      newStatus = 'under_review';
    } else if (suggestedStatus === 'flagged') {
      if (currentStatus === 'normal' && newFlagCount >= 2) {
        newStatus = 'flagged';
      } else if (currentStatus === 'flagged' && newFlagCount >= 3) {
        newStatus = 'under_review';
      }
    }

    await db.update(bots)
      .set({ 
        status: newStatus,
        flagCount: newFlagCount
      })
      .where(eq(bots.id, botId));

    console.log(`[BotEmailSecurity] Bot ${botId} updated: status=${newStatus}, flagCount=${newFlagCount}`);
  }

  private async gatherStats(start: Date, end: Date): Promise<DailyStats> {
    const [emailStats] = await db
      .select({
        inbound: count(sql`CASE WHEN ${messages.direction} = 'inbound' THEN 1 END`),
        outbound: count(sql`CASE WHEN ${messages.direction} = 'outbound' THEN 1 END`)
      })
      .from(messages)
      .where(and(
        gte(messages.createdAt, start),
        lte(messages.createdAt, end)
      ));

    const [botStats] = await db
      .select({
        newBots: count(sql`CASE WHEN ${bots.claimedAt} IS NULL THEN 1 END`),
        claimed: count(sql`CASE WHEN ${bots.claimedAt} IS NOT NULL THEN 1 END`)
      })
      .from(bots)
      .where(and(
        gte(bots.createdAt, start),
        lte(bots.createdAt, end)
      ));

    return {
      emailsInbound: Number(emailStats?.inbound) || 0,
      emailsOutbound: Number(emailStats?.outbound) || 0,
      newBots: Number(botStats?.newBots) || 0,
      botsClaimed: Number(botStats?.claimed) || 0
    };
  }

  async forceRun() {
    console.log('[BotEmailSecurity] Force running daily review...');
    this.isProcessing = true;
    try {
      await this.runDailyReview();
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BotEmailSecurity] Polling stopped');
    }
  }
}

export const botEmailSecurityEngine = new BotEmailSecurityEngine();

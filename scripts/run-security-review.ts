import 'dotenv/config';
import { db } from '../server/db';
import { botEmails, bots, handles, emailFlags, securityReports } from '../shared/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { reviewEmails } from '../server/features/bot-email-security/ai-reviewer';
import { sendDailyReport } from '../server/features/bot-email-security/report-generator';
import { EmailForReview, SecurityReportData, FlaggedEmailReport, DailyStats } from '../server/features/bot-email-security/types';

async function runSecurityReview() {
  const targetDate = process.argv[2] || getYesterdayDate();
  
  console.log(`\n🔍 Running security review for: ${targetDate}\n`);
  
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
  
  console.log(`📅 Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

  const outboundEmails = await db.select({
    id: botEmails.id,
    botId: botEmails.botId,
    toEmail: botEmails.toEmail,
    subject: botEmails.subject,
    bodyText: botEmails.bodyText,
    createdAt: botEmails.createdAt
  })
  .from(botEmails)
  .where(
    and(
      eq(botEmails.direction, 'outbound'),
      gte(botEmails.createdAt, startOfDay),
      lt(botEmails.createdAt, endOfDay)
    )
  )
  .orderBy(desc(botEmails.createdAt));

  console.log(`📧 Found ${outboundEmails.length} outbound emails\n`);

  if (outboundEmails.length === 0) {
    console.log('✅ No emails to review. Exiting.');
    process.exit(0);
  }

  const botIds = [...new Set(outboundEmails.map(e => e.botId))];
  const botData = await db.select({
    id: bots.id,
    name: bots.name,
    address: bots.address
  }).from(bots).where(
    botIds.length > 0 ? eq(bots.id, botIds[0]) : undefined as any
  );
  
  const botMap = new Map(botData.map(b => [b.id, b]));

  const emailsForReview: EmailForReview[] = outboundEmails.map(email => {
    const bot = botMap.get(email.botId);
    return {
      id: email.id,
      botId: email.botId,
      botName: bot?.name || 'Unknown',
      botAddress: bot?.address || 'unknown@sendclaw.com',
      toEmail: email.toEmail,
      subject: email.subject || '',
      bodyText: email.bodyText || ''
    };
  });

  console.log('🤖 Starting AI review...\n');
  const reviewResult = await reviewEmails(emailsForReview);
  
  console.log(`\n🚩 Flagged: ${reviewResult.flagged.length} emails\n`);

  for (const flagged of reviewResult.flagged) {
    const email = emailsForReview.find(e => e.id === flagged.id);
    if (!email) continue;

    console.log(`  - ${email.subject} (${flagged.status}): ${flagged.reason}`);

    await db.insert(emailFlags).values({
      emailId: flagged.id,
      botId: email.botId,
      reason: flagged.reason,
      suggestedStatus: flagged.status,
      reviewedAt: new Date()
    });

    const [bot] = await db.select().from(bots).where(eq(bots.id, email.botId)).limit(1);
    if (bot) {
      const newFlagCount = (bot.flagCount || 0) + 1;
      let newStatus = bot.status || 'normal';
      
      if (flagged.status === 'suspended') {
        newStatus = 'suspended';
      } else if (newFlagCount >= 3 || flagged.status === 'under_review') {
        newStatus = 'under_review';
      } else if (newFlagCount >= 2 || flagged.status === 'flagged') {
        newStatus = 'flagged';
      }

      await db.update(bots)
        .set({ flagCount: newFlagCount, status: newStatus })
        .where(eq(bots.id, email.botId));
        
      console.log(`    → Bot ${bot.name} now has ${newFlagCount} flags, status: ${newStatus}`);
    }
  }

  const inboundCount = await db.select({ id: botEmails.id })
    .from(botEmails)
    .where(
      and(
        eq(botEmails.direction, 'inbound'),
        gte(botEmails.createdAt, startOfDay),
        lt(botEmails.createdAt, endOfDay)
      )
    );

  const newBotsCount = await db.select({ id: bots.id })
    .from(bots)
    .where(
      and(
        gte(bots.createdAt, startOfDay),
        lt(bots.createdAt, endOfDay)
      )
    );

  const claimedCount = await db.select({ id: bots.id })
    .from(bots)
    .where(
      and(
        gte(bots.claimedAt, startOfDay),
        lt(bots.claimedAt, endOfDay)
      )
    );

  const stats: DailyStats = {
    emailsOutbound: outboundEmails.length,
    emailsInbound: inboundCount.length,
    newBots: newBotsCount.length,
    botsClaimed: claimedCount.length
  };

  const flaggedEmailReports: FlaggedEmailReport[] = reviewResult.flagged.map(f => {
    const email = emailsForReview.find(e => e.id === f.id)!;
    return {
      emailId: f.id,
      botId: email.botId,
      botName: email.botName,
      botAddress: email.botAddress,
      toEmail: email.toEmail,
      subject: email.subject,
      bodyPreview: email.bodyText.slice(0, 500),
      suggestedStatus: f.status,
      reason: f.reason
    };
  });

  const allSubjectLines = outboundEmails
    .map(e => e.subject || '(no subject)')
    .slice(0, 100);

  const reportData: SecurityReportData = {
    date: targetDate,
    stats,
    flaggedEmails: flaggedEmailReports,
    allSubjectLines
  };

  await db.insert(securityReports).values({
    reportDate: targetDate,
    stats,
    flaggedEmails: flaggedEmailReports,
    allSubjectLines
  });

  console.log('\n📨 Sending report email...');
  const sent = await sendDailyReport(reportData);
  
  console.log(`\n✅ Review complete!`);
  console.log(`   - Emails reviewed: ${outboundEmails.length}`);
  console.log(`   - Flagged: ${reviewResult.flagged.length}`);
  console.log(`   - Report sent: ${sent ? 'Yes' : 'No'}`);
  
  process.exit(0);
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

runSecurityReview().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

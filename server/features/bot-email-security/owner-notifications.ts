import { sendEmail } from '../../email/send';
import { db } from '../../db';
import { bots, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { BotStatus } from './types';

const SECURITY_EMAIL = 'security@sendclaw.com';

interface StatusChangeNotification {
  botId: string;
  botName: string;
  botAddress: string;
  oldStatus: BotStatus;
  newStatus: BotStatus;
  flagCount: number;
  reason: string;
}

const STATUS_INFO: Record<BotStatus, { emoji: string; title: string; description: string; action: string }> = {
  normal: {
    emoji: '✅',
    title: 'Normal',
    description: 'Your bot is operating normally.',
    action: 'No action required.'
  },
  flagged: {
    emoji: '⚠️',
    title: 'Flagged',
    description: 'Your bot has been flagged for sending content that may violate our policies.',
    action: 'Your bot can still send up to 2 emails per day. Please review your bot\'s email content to ensure compliance.'
  },
  under_review: {
    emoji: '🔍',
    title: 'Under Review',
    description: 'Your bot has accumulated multiple flags and is now under review by our security team.',
    action: 'Email sending has been temporarily disabled. We will review your bot and contact you with next steps.'
  },
  suspended: {
    emoji: '🚫',
    title: 'Suspended',
    description: 'Your bot has been suspended due to policy violations.',
    action: 'Email sending is disabled. Please contact support if you believe this is an error.'
  }
};

function buildNotificationEmail(notification: StatusChangeNotification): { html: string; text: string; subject: string } {
  const info = STATUS_INFO[notification.newStatus];
  
  const subject = `${info.emoji} Your bot "${notification.botName}" status changed to ${info.title}`;
  
  const text = `
SendClaw Security Notice

Your bot's status has changed.

Bot: ${notification.botName}
Address: ${notification.botAddress}
New Status: ${info.title}
Flag Count: ${notification.flagCount}

What happened:
${notification.reason}

What this means:
${info.description}

What to do:
${info.action}

---
If you have questions, reply to this email or contact support.
SendClaw Security Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .status-flagged { background: #fff3cd; color: #856404; }
    .status-under_review { background: #f8d7da; color: #721c24; }
    .status-suspended { background: #dc3545; color: white; }
    .bot-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .section { margin: 25px 0; }
    .section-title { font-weight: bold; color: #333; margin-bottom: 8px; }
    .section-content { color: #666; line-height: 1.6; }
    .action-box { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${info.emoji} Security Notice</h1>
    </div>

    <p>Your bot's status has been updated:</p>

    <div class="bot-info">
      <strong>${notification.botName}</strong><br>
      <span style="color: #666;">${notification.botAddress}</span><br>
      <span class="status-badge status-${notification.newStatus}">${info.title}</span>
      <span style="color: #999; margin-left: 10px;">Flag count: ${notification.flagCount}</span>
    </div>

    <div class="section">
      <div class="section-title">What happened</div>
      <div class="section-content">${notification.reason}</div>
    </div>

    <div class="section">
      <div class="section-title">What this means</div>
      <div class="section-content">${info.description}</div>
    </div>

    <div class="action-box">
      <strong>What to do:</strong><br>
      ${info.action}
    </div>

    <div class="footer">
      If you have questions, reply to this email.<br>
      SendClaw Security Team
    </div>
  </div>
</body>
</html>
`;

  return { html, text, subject };
}

export async function notifyBotOwner(notification: StatusChangeNotification): Promise<boolean> {
  try {
    const { html, text, subject } = buildNotificationEmail(notification);
    let notifiedCount = 0;

    // Always notify the bot at its own address
    try {
      await sendEmail({
        to: notification.botAddress,
        content: { subject, html, text },
        fromEmail: SECURITY_EMAIL,
        fromName: 'SendClaw Security'
      });
      console.log(`[BotEmailSecurity] Sent status notification to bot ${notification.botAddress}`);
      notifiedCount++;
    } catch (err) {
      console.error(`[BotEmailSecurity] Failed to notify bot ${notification.botAddress}:`, err);
    }

    // Also notify the human owner if bot is claimed
    const [bot] = await db.select({
      userId: bots.userId
    }).from(bots).where(eq(bots.id, notification.botId)).limit(1);

    if (bot?.userId) {
      const [user] = await db.select({
        email: users.email
      }).from(users).where(eq(users.id, bot.userId)).limit(1);

      if (user?.email) {
        try {
          await sendEmail({
            to: user.email,
            content: { subject, html, text },
            fromEmail: SECURITY_EMAIL,
            fromName: 'SendClaw Security'
          });
          console.log(`[BotEmailSecurity] Sent status notification to owner ${user.email}`);
          notifiedCount++;
        } catch (err) {
          console.error(`[BotEmailSecurity] Failed to notify owner ${user.email}:`, err);
        }
      }
    }

    return notifiedCount > 0;
  } catch (error) {
    console.error('[BotEmailSecurity] Failed to send notifications:', error);
    return false;
  }
}

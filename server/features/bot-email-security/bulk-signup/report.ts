import { sendEmail } from '../../../email/send';
import { SecurityBulkSignupAlert } from '@shared/schema';

const ADMIN_EMAIL = 'jon@5ducks.ai';
const SECURITY_EMAIL = 'security@sendclaw.com';

interface BotDetail {
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

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function buildAlertEmail(alert: SecurityBulkSignupAlert, botDetails: BotDetail[]): { html: string; text: string; subject: string } {
  const appBase = process.env.APP_URL || 'https://sendclaw.com';
  const approveUrl = `${appBase}/api/bot-security/bulk-signups/${alert.id}/approve?token=${alert.approvalToken}`;
  const detailUrl = `${appBase}/admin/bulk-signups/${alert.id}`;
  const claimedWarning = alert.claimedCount === 0
    ? '<span style="color:#dc3545;font-weight:bold;">⚠️ NONE CLAIMED — Major Red Flag</span>'
    : `${alert.claimedCount} claimed`;

  const ipSummary = (alert.ipList as string[]).map(ip => {
    const count = botDetails.filter(b => b.registrationIp === ip).length;
    return `<tr><td style="padding:4px 12px;border:1px solid #ddd;">${ip}</td><td style="padding:4px 12px;border:1px solid #ddd;text-align:center;">${count}</td></tr>`;
  }).join('');

  const botRows = botDetails.map((bot, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${i + 1}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${formatDate(bot.createdAt)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.name}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.senderName}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.address || '—'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.registrationIp || '—'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.claimedAt ? formatDate(bot.claimedAt) : '—'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${(bot.status || 'normal').toUpperCase()}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;text-align:center;">${bot.verified ? 'Yes' : 'No'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;text-align:center;">${bot.flagCount || 0}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap;">${bot.userId || '—'}</td>
    </tr>
  `).join('');

  const windowMinutes = Math.round(
    ((alert.windowEnd?.getTime() || 0) - (alert.windowStart?.getTime() || 0)) / 60000
  );

  const subject = `🚨 [SendClaw] Bulk Signup Alert — ${alert.botCount} bots detected (${alert.namePrefix})`;

  const text = `SENDCLAW BULK SIGNUP ALERT

${alert.botCount} suspected bot registrations detected.
Name prefix: ${alert.namePrefix || '—'}
Sender prefix: ${alert.senderPrefix || '—'}
IPs used: ${(alert.ipList as string[]).length}
Claimed: ${alert.claimedCount}/${alert.botCount}
Window: ${windowMinutes} minutes

Approve removal: ${approveUrl}
View details: ${detailUrl}

Bot list:
${botDetails.map((b, i) => `${i + 1}. ${b.name} (${b.address}) — IP: ${b.registrationIp} — Claimed: ${b.claimedAt ? 'Yes' : 'No'}`).join('\n')}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #dc3545; margin: 0 0 8px 0; font-size: 22px; }
    .summary { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .summary-item { display: inline-block; margin-right: 24px; margin-bottom: 8px; }
    .summary-value { font-size: 20px; font-weight: bold; color: #333; }
    .summary-label { font-size: 12px; color: #666; }
    .red-flag { background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px 16px; border-radius: 8px; margin: 12px 0; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 16px 0; }
    table { border-collapse: collapse; min-width: 900px; font-size: 13px; }
    th { background: #1a1a2e; color: white; padding: 8px 10px; text-align: left; white-space: nowrap; border: 1px solid #1a1a2e; }
    .ip-table { min-width: auto; }
    .ip-table th { background: #333; }
    .actions { margin: 24px 0; text-align: center; }
    .btn { display: inline-block; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 0 8px; }
    .btn-approve { background: #dc3545; color: white; }
    .btn-view { background: #2563eb; color: white; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨 Bulk Signup Alert</h1>
    <p style="color:#666;margin:0 0 16px 0;">Coordinated bot registration pattern detected</p>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${alert.botCount}</div>
        <div class="summary-label">Bots Registered</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${(alert.ipList as string[]).length}</div>
        <div class="summary-label">Distinct IPs</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${windowMinutes}m</div>
        <div class="summary-label">Time Window</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${alert.claimedCount}/${alert.botCount}</div>
        <div class="summary-label">Claimed</div>
      </div>
    </div>

    ${alert.claimedCount === 0 ? `
    <div class="red-flag">
      <strong>⚠️ Major Red Flag:</strong> None of these bots have been claimed by a human user.
    </div>
    ` : ''}

    <p><strong>Name prefix:</strong> <code>${alert.namePrefix || '—'}</code></p>
    <p><strong>Sender prefix:</strong> <code>${alert.senderPrefix || '—'}</code></p>
    <p><strong>Window:</strong> ${formatDate(alert.windowStart)} → ${formatDate(alert.windowEnd)}</p>

    <h2 style="margin-top:24px;font-size:16px;">📋 Registration Details</h2>
    <div class="table-wrapper" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0;">
      <table style="border-collapse:collapse;min-width:900px;font-size:13px;">
        <thead>
          <tr>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">#</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Created At</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Name</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Sender Name</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Email Address</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">IP Address</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Claimed At</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Status</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Verified</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">Flags</th>
            <th style="background:#1a1a2e;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #1a1a2e;">User ID</th>
          </tr>
        </thead>
        <tbody>
          ${botRows}
        </tbody>
      </table>
    </div>

    <h2 style="margin-top:24px;font-size:16px;">🌐 IP Summary</h2>
    <div class="table-wrapper" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0;">
      <table class="ip-table" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr><th style="background:#333;color:white;padding:8px 10px;text-align:left;white-space:nowrap;border:1px solid #333;">IP Address</th><th style="background:#333;color:white;padding:8px 10px;text-align:center;white-space:nowrap;border:1px solid #333;">Registrations</th></tr>
        </thead>
        <tbody>
          ${ipSummary}
        </tbody>
      </table>
    </div>

    <div class="actions">
      <a href="${approveUrl}" class="btn btn-approve">✅ Approve Removal</a>
      <a href="${detailUrl}" class="btn btn-view">🔍 View in Admin Panel</a>
    </div>

    <p style="color:#666;font-size:13px;text-align:center;">
      Approving will suspend all ${alert.botCount} bots, remove their handles, and block ${(alert.ipList as string[]).length} IPs for 14 days.
    </p>

    <div class="footer">
      Automated alert from SendClaw Bulk Signup Detection
    </div>
  </div>
</body>
</html>
`;

  return { html, text, subject };
}

export async function sendBulkSignupAlert(alert: SecurityBulkSignupAlert, botDetails: BotDetail[]): Promise<boolean> {
  const { html, text, subject } = buildAlertEmail(alert, botDetails);

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      content: { subject, html, text },
      fromEmail: SECURITY_EMAIL,
      fromName: 'SendClaw Security'
    });

    console.log(`[BulkSignupReport] Alert email sent to ${ADMIN_EMAIL} for alert ${alert.id}`);
    return true;
  } catch (error) {
    console.error('[BulkSignupReport] Failed to send alert email:', error);
    return false;
  }
}

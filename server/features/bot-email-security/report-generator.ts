import { sendEmail } from '../../email/send';
import { SecurityReportData, FlaggedEmailReport } from './types';

const ADMIN_EMAIL = 'jon@5ducks.ai';

function formatEmailBody(report: SecurityReportData): { html: string; text: string } {
  const { stats, flaggedEmails, allSubjectLines } = report;

  const flaggedSection = flaggedEmails.length > 0 
    ? flaggedEmails.map((e, i) => `
${i + 1}. Bot: ${e.botName} (${e.botAddress})
   To: ${e.toEmail}
   Subject: "${e.subject}"
   Status: ${e.suggestedStatus.toUpperCase()}
   Reason: ${e.reason}
   Preview: ${e.bodyPreview.slice(0, 200)}${e.bodyPreview.length > 200 ? '...' : ''}
`).join('\n')
    : 'None';

  const subjectsSection = allSubjectLines.length > 0
    ? allSubjectLines.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : 'None';

  const text = `
SENDCLAW DAILY SECURITY REPORT
Date: ${report.date}

📊 STATS
- Emails Outbound: ${stats.emailsOutbound}
- Emails Inbound: ${stats.emailsInbound}
- New Bots: ${stats.newBots}
- Bots Claimed: ${stats.botsClaimed}

🚩 FLAGGED EMAILS (${flaggedEmails.length})
${flaggedSection}

📝 ALL SUBJECT LINES SENT TODAY (${allSubjectLines.length})
${subjectsSection}

---
This is an automated report from SendClaw Bot Email Security.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .stats { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .stat-item { display: inline-block; margin-right: 30px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .stat-label { font-size: 12px; color: #666; }
    .flagged-email { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .flagged-email.under_review { background: #f8d7da; border-left-color: #dc3545; }
    .flagged-email.suspended { background: #f5c6cb; border-left-color: #721c24; }
    .subject-list { background: #e8f4f8; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; }
    .subject-item { padding: 5px 0; border-bottom: 1px solid #ddd; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🦆 SendClaw Daily Security Report</h1>
  <p><strong>Date:</strong> ${report.date}</p>
  
  <h2>📊 Stats</h2>
  <div class="stats">
    <div class="stat-item">
      <div class="stat-value">${stats.emailsOutbound}</div>
      <div class="stat-label">Outbound</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.emailsInbound}</div>
      <div class="stat-label">Inbound</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.newBots}</div>
      <div class="stat-label">New Bots</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.botsClaimed}</div>
      <div class="stat-label">Claimed</div>
    </div>
  </div>

  <h2>🚩 Flagged Emails (${flaggedEmails.length})</h2>
  ${flaggedEmails.length === 0 ? '<p>No suspicious emails detected today.</p>' : 
    flaggedEmails.map(e => `
    <div class="flagged-email ${e.suggestedStatus}">
      <strong>Bot:</strong> ${e.botName} (${e.botAddress})<br>
      <strong>To:</strong> ${e.toEmail}<br>
      <strong>Subject:</strong> ${e.subject}<br>
      <strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${e.suggestedStatus}</span><br>
      <strong>Reason:</strong> ${e.reason}<br>
      <strong>Preview:</strong> ${e.bodyPreview.slice(0, 200)}${e.bodyPreview.length > 200 ? '...' : ''}
    </div>
  `).join('')}

  <h2>📝 All Subject Lines (${allSubjectLines.length})</h2>
  <div class="subject-list">
    ${allSubjectLines.length === 0 ? '<p>No emails sent today.</p>' :
      allSubjectLines.map(s => `<div class="subject-item">${s}</div>`).join('')}
  </div>

  <div class="footer">
    This is an automated report from SendClaw Bot Email Security.
  </div>
</body>
</html>
`;

  return { html, text };
}

export async function sendDailyReport(report: SecurityReportData): Promise<boolean> {
  const { html, text } = formatEmailBody(report);
  
  const subject = `[SendClaw] Daily Security Report - ${report.date}${report.flaggedEmails.length > 0 ? ` (${report.flaggedEmails.length} flagged)` : ''}`;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      content: { subject, html, text },
      fromName: 'SendClaw Security'
    });
    
    console.log(`[BotEmailSecurity] Daily report sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('[BotEmailSecurity] Failed to send daily report:', error);
    return false;
  }
}

import { DailyBatch, EmailNotificationContent } from '../types';
import { getRandomSubjectLine } from './subject-line-templates';

export function buildContactsReadyEmail(batch: DailyBatch & { isSampleData?: boolean }, appUrl: string, userId?: number): EmailNotificationContent {
  const secureUrl = `${appUrl}/outreach/daily/${batch.secureToken}`;
  
  
  // Add sample data banner if this is test data
  const sampleDataBanner = batch.isSampleData ? `
    <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #92400E; font-size: 14px;">📋 SAMPLE DATA</strong>
      <br>
      <span style="color: #78350F; font-size: 13px;">
        This is example data for testing. Your actual emails will contain real prospects from your contact list.
      </span>
    </div>
  ` : '';
  
  // Build the contact list HTML - each contact is clickable and opens outreach page in new tab
  const contactsListHtml = batch.items && batch.items.length > 0 ? `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 16px;">Your prospects for today:</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${batch.items.map((item, index) => `
          <li style="padding: 0; ${index < batch.items!.length - 1 ? 'border-bottom: 1px solid #e0e0e0;' : ''}">
            <a href="${secureUrl}" target="_blank" style="display: block; padding: 10px 0; text-decoration: none; color: inherit;">
              <strong style="color: #333;">${item.contact.name}</strong>
              <span style="color: #666;"> @ ${item.company.name}</span>
              ${item.contact.role ? `<br><small style="color: #888; font-size: 13px;">${item.contact.role}</small>` : ''}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  // Build the contact list text version
  const contactsListText = batch.items && batch.items.length > 0 
    ? `\nYour prospects for today:\n${batch.items.map(item => 
        `- ${item.contact.name} @ ${item.company.name}${item.contact.role ? ` (${item.contact.role})` : ''}`
      ).join('\n')}\n`
    : '';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { color: #333; margin-bottom: 20px; }
        .button { 
          display: inline-block; 
          background: #0066FF; 
          color: white !important; 
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 24px 0;
          font-weight: 500;
        }
        .list { margin: 16px 0; padding-left: 20px; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; }
        /* Hover effect for clickable contacts - works in email clients that support it */
        a:hover { background-color: #f0f0f0 !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="header">Your 5 leads for today are ready</h2>
        
        <p>Hi there,</p>
        
        <p>Your personalized outreach emails are waiting.</p>
        
        ${sampleDataBanner}
        
        ${contactsListHtml}
        
        <a href="${secureUrl}" class="button">Review and Send Emails →</a>
        
        <p class="footer">
          <strong>Pro tip:</strong> Send these before noon for 23% higher response rates.
        </p>
        ${userId ? `<p style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
          <a href="${appUrl}/unsubscribe?type=outreach&token=${Buffer.from(String(userId)).toString('base64')}" style="color: #999; text-decoration: underline;">Unsubscribe from daily emails</a>
        </p>` : ''}
      </div>
    </body>
    </html>
  `;
  
  const sampleDataText = batch.isSampleData ? '\n[SAMPLE DATA - This is example data for testing]\n' : '';
  
  const text = `Your 5 leads for today are ready

Hi there,

Your personalized outreach emails are waiting.${sampleDataText}
${contactsListText}
Review and send them here: ${secureUrl}

Pro tip: Send these before noon for 23% higher response rates.
${userId ? `\nUnsubscribe from daily emails: ${appUrl}/unsubscribe?type=outreach&token=${Buffer.from(String(userId)).toString('base64')}` : ''}`;
  
  return {
    subject: getRandomSubjectLine(batch),
    html,
    text
  };
}
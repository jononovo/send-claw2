import { User } from '@shared/schema';
import { EmailNotificationContent } from '../types';

export function buildNeedMoreContactsEmail(user: User, appUrl: string, userId?: number): EmailNotificationContent {
  const searchUrl = `${appUrl}/app`;
  
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
        .stats { 
          background: #f5f5f5; 
          padding: 16px; 
          border-radius: 8px; 
          margin: 20px 0;
        }
        .footer { color: #666; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="header">Time to find new prospects</h2>
        
        <p>Hi ${user.username || 'there'},</p>
        
        <p>You're running low on contacts to reach out to. Let's fix that!</p>
        
        <div class="stats">
          <strong>📊 Quick tip:</strong><br>
          Search for 10-15 new companies to maintain a healthy pipeline.
          Each search typically yields 3-5 quality contacts per company.
        </div>
        
        <a href="${searchUrl}" class="button">Search for New Leads →</a>
        
        <p class="footer">
          <strong>Remember:</strong> Consistent outreach is the key to predictable sales.<br>
          Aim to add new prospects weekly to keep your pipeline full.
        </p>
        ${userId ? `<p style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
          <a href="${appUrl}/unsubscribe?type=outreach&token=${Buffer.from(String(userId)).toString('base64')}" style="color: #999; text-decoration: underline;">Unsubscribe from daily emails</a>
        </p>` : ''}
      </div>
    </body>
    </html>
  `;
  
  const text = `Time to find new prospects

Hi ${user.username || 'there'},

You're running low on contacts to reach out to. Let's fix that!

Search for new leads here: ${searchUrl}

Quick tip: Search for 10-15 new companies to maintain a healthy pipeline.
Each search typically yields 3-5 quality contacts per company.

Remember: Consistent outreach is the key to predictable sales.
Aim to add new prospects weekly to keep your pipeline full.
${userId ? `\nUnsubscribe from daily emails: ${appUrl}/unsubscribe?type=outreach&token=${Buffer.from(String(userId)).toString('base64')}` : ''}`;
  
  return {
    subject: 'Time to refill your sales pipeline',
    html,
    text
  };
}
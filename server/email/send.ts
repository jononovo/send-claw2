import { MailService } from '@sendgrid/mail';

const sendGridService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sendGridService.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'quack@5ducks.ai';
const FROM_NAME = 'Jon @ 5Ducks';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailOptions {
  to: string;
  cc?: string[];
  content: EmailContent;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[DripEmail] SENDGRID_API_KEY not configured, skipping email send');
    return false;
  }

  try {
    await sendGridService.send({
      to: options.to,
      cc: options.cc,
      from: {
        email: options.fromEmail || FROM_EMAIL,
        name: options.fromName || FROM_NAME
      },
      replyTo: options.replyTo,
      subject: options.content.subject,
      html: options.content.html,
      text: options.content.text,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: true }
      }
    });
    
    console.log(`[DripEmail] Email sent successfully to ${options.to}`);
    return true;
  } catch (error: any) {
    console.error('[DripEmail] SendGrid error:', error);
    if (error.response?.body) {
      console.error('[DripEmail] Error details:', JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
}

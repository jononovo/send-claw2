import { EmailContent } from '../send';

export interface TemplateVariables {
  name?: string;
  firstName?: string;
  email?: string;
  secretCode?: string;
  appUrl?: string;
  magicLink?: string;
  [key: string]: string | undefined;
}

export type TemplateBuilder = (vars: TemplateVariables) => EmailContent;

const APP_URL = process.env.APP_URL || 'https://5ducks.ai';

export const accessConfirmationTemplate: TemplateBuilder = (vars) => {
  const firstName = vars.name?.split(' ')[0] || 'there';
  
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
        .emoji { font-size: 48px; text-align: center; margin: 30px 0; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .highlight { background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">🐥</div>
        
        <h2 class="header">You're on the list, ${firstName}!</h2>
        
        <p>Thanks for applying for early access to 5Ducks!</p>
        
        <div class="highlight">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <p style="margin: 10px 0 0 0;">We review applications regularly and will send you your access code as soon as a spot opens up.</p>
        </div>
        
        <p>In the meantime, keep an eye on your inbox — your code could arrive any day!</p>
        
        <p class="footer">
          Cheers,<br>
          <strong>Jon @ 5Ducks</strong><br>
          <span style="color: #999;">P.S. We're excited to have you join us soon! 🚀</span>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `You're on the list, ${firstName}! 🐥

Thanks for applying for early access to 5Ducks!

What happens next?
We review applications regularly and will send you your access code as soon as a spot opens up.

In the meantime, keep an eye on your inbox — your code could arrive any day!

Cheers,
Jon @ 5Ducks

P.S. We're excited to have you join us soon! 🚀`;
  
  return {
    subject: "You're on the list! 🐥",
    html,
    text
  };
};

export const fastTrackTemplate: TemplateBuilder = (vars) => {
  const firstName = vars.name?.split(' ')[0] || 'there';
  
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
        .emoji { font-size: 48px; text-align: center; margin: 30px 0; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .highlight { background: #D1FAE5; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .badge { display: inline-block; background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">🎉</div>
        
        <p><span class="badge">Fast-Track</span></p>
        
        <h2 class="header">Congratulations, ${firstName}! You've been selected!</h2>
        
        <p>Great news — you've been approved for our <strong>Fast-Track</strong> access program!</p>
        
        <div class="highlight">
          <p style="margin: 0;"><strong>🚀 What this means:</strong></p>
          <p style="margin: 10px 0 0 0;">You'll receive your <strong>secret access code</strong> and a welcome email within the next <strong>48 hours</strong>.</p>
        </div>
        
        <p>You're one of a select group getting early access to 5Ducks. We can't wait to show you what we've built!</p>
        
        <p>Keep an eye on your inbox — your code is coming soon!</p>
        
        <p class="footer">
          Excitedly,<br>
          <strong>Jon @ 5Ducks</strong><br>
          <span style="color: #999;">P.S. You're going to love this! 🦆</span>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `🎉 FAST-TRACK SELECTION

Congratulations, ${firstName}! You've been selected!

Great news — you've been approved for our Fast-Track access program!

🚀 What this means:
You'll receive your secret access code and a welcome email within the next 48 hours.

You're one of a select group getting early access to 5Ducks. We can't wait to show you what we've built!

Keep an eye on your inbox — your code is coming soon!

Excitedly,
Jon @ 5Ducks

P.S. You're going to love this! 🦆`;
  
  return {
    subject: "🎉 You've been Fast-Tracked!",
    html,
    text
  };
};

export const welcomeCodeTemplate: TemplateBuilder = (vars) => {
  const firstName = vars.name?.split(' ')[0] || 'there';
  const secretCode = vars.secretCode || 'QUACK';
  const appUrl = vars.appUrl || APP_URL;
  
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
        .emoji { font-size: 48px; text-align: center; margin: 30px 0; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .code-box { background: #1F2937; color: #F9FAFB; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace; color: #FCD34D; }
        .cta-button { display: inline-block; background: #FCD34D; color: #1F2937; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .steps { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">🦆</div>
        
        <h2 class="header">Welcome to 5Ducks, ${firstName}!</h2>
        
        <p>The moment has arrived — here's your <strong>secret access code</strong>:</p>
        
        <div class="code-box">
          <div class="code">${secretCode}</div>
          <p style="margin: 16px 0 0 0; color: #9CA3AF; font-size: 14px;">Your exclusive access code</p>
        </div>
        
        <div class="steps">
          <p style="margin: 0 0 10px 0;"><strong>🚀 Getting Started:</strong></p>
          <ol>
            <li>Go to <a href="${appUrl}/register" style="color: #3B82F6;">${appUrl}/register</a></li>
            <li>Enter your secret code: <strong>${secretCode}</strong></li>
            <li>Create your account and start prospecting!</li>
          </ol>
        </div>
        
        <p style="text-align: center;">
          <a href="${appUrl}/register" class="cta-button">Create Your Account →</a>
        </p>
        
        <p>You now have access to AI-powered B2B prospecting that actually works. Let's find your next best customers!</p>
        
        <p class="footer">
          Welcome aboard,<br>
          <strong>Jon @ 5Ducks</strong><br>
          <span style="color: #999;">P.S. Questions? Just reply to this email — I read every one! 💬</span>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `🦆 WELCOME TO 5DUCKS!

Welcome, ${firstName}!

The moment has arrived — here's your secret access code:

═══════════════════════════
    ${secretCode}
═══════════════════════════
    Your exclusive access code

🚀 Getting Started:
1. Go to ${appUrl}/register
2. Enter your secret code: ${secretCode}
3. Create your account and start prospecting!

You now have access to AI-powered B2B prospecting that actually works. Let's find your next best customers!

Welcome aboard,
Jon @ 5Ducks

P.S. Questions? Just reply to this email — I read every one! 💬`;
  
  return {
    subject: "🦆 Your Secret Code is Here!",
    html,
    text
  };
};

export const welcomeRegistrationTemplate: TemplateBuilder = (vars) => {
  const firstName = vars.name?.split(' ')[0] || 'there';
  const appUrl = vars.appUrl || APP_URL;
  
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
        .emoji { font-size: 48px; text-align: center; margin: 30px 0; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .highlight { background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #FCD34D; color: #1F2937; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">🦆</div>
        
        <h2 class="header">Welcome to 5Ducks, ${firstName}!</h2>
        
        <p>You're in! Your account is ready and waiting for you.</p>
        
        <div class="highlight">
          <p style="margin: 0;"><strong>What can you do with 5Ducks?</strong></p>
          <p style="margin: 10px 0 0 0;">Find verified B2B contacts, generate personalized outreach, and scale your prospecting — all powered by AI.</p>
        </div>
        
        <p>Ready to find your next best customers?</p>
        
        <p style="text-align: center;">
          <a href="${appUrl}/app" class="cta-button">Start Prospecting</a>
        </p>
        
        <p class="footer">
          Welcome aboard,<br>
          <strong>Jon @ 5Ducks</strong><br>
          <span style="color: #999;">P.S. Questions? Just reply to this email — I read every one! 💬</span>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `Welcome to 5Ducks, ${firstName}!

You're in! Your account is ready and waiting for you.

What can you do with 5Ducks?
Find verified B2B contacts, generate personalized outreach, and scale your prospecting — all powered by AI.

Ready to find your next best customers? Head to ${appUrl}/app to start prospecting!

Welcome aboard,
Jon @ 5Ducks

P.S. Questions? Just reply to this email — I read every one!`;
  
  return {
    subject: "Welcome to 5Ducks! 🦆",
    html,
    text
  };
};

export const magicLinkSignInTemplate: TemplateBuilder = (vars) => {
  const firstName = vars.name?.split(' ')[0] || 'there';
  const magicLink = vars.magicLink || '#';
  const appUrl = vars.appUrl || APP_URL;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo-text { font-size: 32px; font-weight: bold; color: #1f2937; }
        .header { color: #1f2937; margin-bottom: 16px; font-size: 24px; }
        .text { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 16px; }
        .cta-container { text-align: center; margin: 32px 0; }
        .cta-button { display: inline-block; background: #FCD34D; color: #1F2937; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
        .cta-button:hover { background: #FBBF24; }
        .divider { border-top: 1px solid #e5e7eb; margin: 24px 0; }
        .link-text { color: #6b7280; font-size: 14px; word-break: break-all; }
        .footer { color: #9ca3af; font-size: 14px; margin-top: 32px; text-align: center; }
        .security-note { background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 24px; }
        .security-note p { margin: 0; color: #92400e; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <span class="logo-text">5Ducks</span>
          </div>
          
          <h2 class="header">Sign in to 5Ducks</h2>
          
          <p class="text">Hi ${firstName},</p>
          
          <p class="text">Click the button below to sign in to your 5Ducks account. This link will expire in 1 hour.</p>
          
          <div class="cta-container">
            <a href="${magicLink}" class="cta-button">Sign In to 5Ducks</a>
          </div>
          
          <div class="divider"></div>
          
          <p class="link-text">Or copy and paste this link into your browser:<br>${magicLink}</p>
          
          <div class="security-note">
            <p>If you didn't request this sign-in link, you can safely ignore this email. Someone may have typed your email address by mistake.</p>
          </div>
        </div>
        
        <p class="footer">
          &copy; 5Ducks &bull; AI-Powered B2B Prospecting<br>
          <a href="${appUrl}" style="color: #6b7280;">5ducks.ai</a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `Sign in to 5Ducks

Hi ${firstName},

Click the link below to sign in to your 5Ducks account. This link will expire in 1 hour.

${magicLink}

If you didn't request this sign-in link, you can safely ignore this email. Someone may have typed your email address by mistake.

---
5Ducks - AI-Powered B2B Prospecting
${appUrl}`;
  
  return {
    subject: "Sign in to 5Ducks",
    html,
    text
  };
};

export const templateRegistry: Record<string, TemplateBuilder> = {
  'access_confirmation': accessConfirmationTemplate,
  'fast_track': fastTrackTemplate,
  'welcome_code': welcomeCodeTemplate,
  'welcome_registration': welcomeRegistrationTemplate,
  'magic_link_signin': magicLinkSignInTemplate
};

export function getTemplate(key: string): TemplateBuilder | undefined {
  return templateRegistry[key];
}

export function buildEmailFromTemplate(templateKey: string, variables: TemplateVariables): EmailContent | null {
  const template = getTemplate(templateKey);
  if (!template) {
    console.error(`[DripEmail] Template not found: ${templateKey}`);
    return null;
  }
  return template(variables);
}

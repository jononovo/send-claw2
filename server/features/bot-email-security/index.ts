import { Application } from 'express';
import routes from './routes';
import { botEmailSecurityEngine } from './review-engine';
import { db } from '../../db';
import { handles, bots } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SECURITY_HANDLE = 'security';
const SECURITY_BOT_NAME = 'SendClaw Security';

async function ensureSecurityHandle() {
  try {
    const existing = await db.select().from(handles)
      .where(eq(handles.address, SECURITY_HANDLE)).limit(1);
    
    if (existing.length > 0) {
      console.log('[BotEmailSecurity] Security handle already reserved');
      return;
    }

    const apiKey = `sc_internal_${crypto.randomBytes(24).toString('hex')}`;
    const address = `${SECURITY_HANDLE}@sendclaw.com`;

    const [bot] = await db.insert(bots).values({
      name: SECURITY_BOT_NAME,
      senderName: SECURITY_BOT_NAME,
      address,
      apiKey,
      claimToken: null,
      verified: true,
      status: 'normal'
    }).returning();

    await db.insert(handles).values({
      address: SECURITY_HANDLE,
      botId: bot.id,
      senderName: SECURITY_BOT_NAME
    });

    console.log('[BotEmailSecurity] Reserved security@sendclaw.com handle');
  } catch (error) {
    console.error('[BotEmailSecurity] Failed to reserve security handle:', error);
  }
}

export function initBotEmailSecurity(app: Application) {
  app.use('/api/bot-security', routes);
  
  ensureSecurityHandle();
  botEmailSecurityEngine.initialize();
  
  console.log('[BotEmailSecurity] Module initialized');
}

export { botEmailSecurityEngine };

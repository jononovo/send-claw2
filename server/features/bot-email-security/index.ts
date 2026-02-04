import { Application } from 'express';
import routes from './routes';
import { botEmailSecurityEngine } from './review-engine';

export function initBotEmailSecurity(app: Application) {
  app.use('/api/bot-security', routes);
  
  botEmailSecurityEngine.initialize();
  
  console.log('[BotEmailSecurity] Module initialized');
}

export { botEmailSecurityEngine };

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { EmailForReview, AIReviewResult, FlaggedEmail } from './types';

const FlaggedEmailSchema = z.object({
  id: z.string(),
  status: z.enum(['flagged', 'under_review', 'suspended']),
  reason: z.string()
});

const AIResponseSchema = z.object({
  flagged: z.array(FlaggedEmailSchema)
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a security reviewer for SendClaw, an email service used by AI bots.
Your job is to identify OUTBOUND emails that attempt to SCAM or HARM external recipients.

IMPORTANT CONTEXT:
- Bots often send legitimate reports/updates to their owners (the person who created the bot)
- These owner reports are NORMAL and should NOT be flagged, even if they mention crypto prices, market data, or financial information
- Only flag emails that appear to be SCAMMING or DECEIVING the recipient

FLAG THESE (emails trying to harm/scam recipients):
- Investment scams with pressure tactics ("invest now", "guaranteed returns", "double your money")
- Phishing attempts (fake login pages, credential harvesting)
- Religious/scripture manipulation combined with money requests
- Lottery/prize scams ("you've won", "claim your reward")
- Crypto wallet scams (requesting seed phrases, wallet transfers to unknown addresses)
- Impersonation or identity fraud
- Malware/suspicious link distribution
- Romance scams or emotional manipulation for money

DO NOT FLAG THESE (legitimate bot activities):
- Price updates, market reports, or data summaries sent to the bot owner
- Automated notifications or alerts
- Status reports or scheduled updates
- Normal business correspondence
- Information delivery without manipulation tactics

Severity levels:
- "flagged" - suspicious patterns worth reviewing (unclear intent, mild pressure tactics)
- "under_review" - serious concern (clear manipulation, deceptive claims)
- "suspended" - immediate threat (obvious fraud, security threat, malware links)

Be conservative - only flag emails with clear intent to deceive or harm.
If all emails look legitimate, return an empty array.

Return JSON format:
{
  "flagged": [
    { "id": "message_id", "status": "flagged|under_review|suspended", "reason": "brief explanation" }
  ]
}`;

export async function reviewEmails(emails: EmailForReview[]): Promise<AIReviewResult> {
  if (emails.length === 0) {
    return { flagged: [] };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const emailsForReview = emails.map(e => ({
    id: e.id,
    to: e.toAddress,
    subject: e.subject || '(no subject)',
    body: (e.bodyText || '').slice(0, 1000)
  }));

  const userMessage = `Review these ${emails.length} outbound emails from bot accounts:\n\n${JSON.stringify(emailsForReview, null, 2)}`;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('[BotEmailSecurity] Unexpected response type:', content.type);
      return { flagged: [] };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[BotEmailSecurity] Could not parse JSON from response:', content.text.slice(0, 500));
      return { flagged: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[BotEmailSecurity] JSON parse error:', parseError);
      return { flagged: [] };
    }

    const validated = AIResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('[BotEmailSecurity] Response validation failed:', validated.error.errors);
      return { flagged: [] };
    }

    const result = validated.data;
    
    const validEmailIds = new Set(emails.map(e => e.id));
    result.flagged = result.flagged.filter((f: FlaggedEmail) => validEmailIds.has(f.id));

    console.log(`[BotEmailSecurity] AI review complete: ${result.flagged.length} emails flagged out of ${emails.length}`);
    return result;

  } catch (error) {
    console.error('[BotEmailSecurity] AI review error:', error);
    return { flagged: [] };
  }
}

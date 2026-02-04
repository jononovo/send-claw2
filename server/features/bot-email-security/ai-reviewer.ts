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

const SYSTEM_PROMPT = `You are a security reviewer for an email service used by AI bots. 
Your job is to identify suspicious emails that may indicate:
- Potential scams (phishing, money requests, lottery/prize claims)
- Crypto schemes (wallet transfers, seed phrases, investment scams)
- Security threats (password harvesting, identity theft, malware distribution)
- Communications with unclear or deceptive intent

For each suspicious email, suggest a status:
- "flagged" - needs attention (concerning patterns, crypto mentions, unclear intent)
- "under_review" - serious concern (clear scam patterns, suspicious requests)
- "suspended" - immediate block (obvious fraud, security threats, malware)

ONLY return emails that are genuinely suspicious. Most emails are legitimate.
If all emails look normal, return an empty array.

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

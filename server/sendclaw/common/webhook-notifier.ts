interface WebhookPayload {
  event: string;
  botId: string;
  messageId: string;
  threadId: string;
  from: string;
  subject: string | null;
  receivedAt: string;
}

async function attemptWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyBotWebhook(webhookUrl: string, payload: WebhookPayload): Promise<void> {
  try {
    await attemptWebhook(webhookUrl, payload);
    console.log(`[SendClaw] Webhook delivered to ${webhookUrl}`);
  } catch (err1: any) {
    console.warn(`[SendClaw] Webhook attempt 1 failed for ${webhookUrl}: ${err1.message}`);
    setTimeout(async () => {
      try {
        await attemptWebhook(webhookUrl, payload);
        console.log(`[SendClaw] Webhook delivered on retry to ${webhookUrl}`);
      } catch (err2: any) {
        console.warn(`[SendClaw] Webhook attempt 2 failed for ${webhookUrl}: ${err2.message}`);
      }
    }, 3000);
  }
}

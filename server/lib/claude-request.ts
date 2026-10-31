import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";

/** The current model of each tier. A retired model id returns 404, so every caller takes its model from here. */
export const CLAUDE_SONNET_MODEL = "claude-sonnet-5-5";
export const CLAUDE_OPUS_MODEL = "claude-opus-5-5";

/** On a safety decline the API retries on the model Anthropic recommends for that category. */
export const CLAUDE_REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const claude = new Anthropic(); // reads ANTHROPIC_API_KEY

export const CLAUDE_REQUEST_DEFAULTS = {
  // Thinking is on by default and counts toward max_tokens, so this leaves room for it and the reply
  max_tokens: 16000,
  // At low effort Claude skips thinking on most simple requests, such as chat, extraction and classification
  output_config: { effort: "low" as const },
  betas: [CLAUDE_REFUSAL_FALLBACK_BETA],
  // Accepted by the API but missing from this SDK version's types
  ...({ fallbacks: "default" } as {}),
};

/** A response can start with thinking blocks, so its text is found by block type rather than position. */
export function claudeMessageText(message: BetaMessage): string {
  return message.content
    .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
    .map((block) => block.text.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

/** Sends one prompt and returns Claude's reply. Throws if the request fails or Claude declines it. */
export async function requestClaudeText({
  model = CLAUDE_SONNET_MODEL,
  system,
  prompt,
}: {
  model?: string;
  system?: string;
  prompt: string;
}): Promise<string> {
  const message = await claude.beta.messages.create({
    ...CLAUDE_REQUEST_DEFAULTS,
    model,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined this request");
  }
  return claudeMessageText(message);
}

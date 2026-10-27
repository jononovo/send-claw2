/**
 * `apiRequest` throws `Error("<status>: <body>")`; this returns the server's `message` when the body
 * is the usual `{ message }` JSON, so a toast reads "The agent is already running…" instead of raw JSON.
 */
export function describeApiError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong";
  const body = error.message.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON: fall through to the raw text
  }
  return body || "Something went wrong";
}

import type { Request, Response, RequestHandler } from "express";

/**
 * Wraps an async agent API handler so a thrown error becomes a JSON 500 instead of an unhandled rejection.
 */
export function agentRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error) => {
      console.error(`[AgentAPI] ${req.method} ${req.originalUrl} failed:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal error" });
      }
    });
  };
}

export function parsePositiveIntParam(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

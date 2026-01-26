/**
 * SEO Route Rate Limiter
 * 
 * Protects public SEO pages from scraping abuse.
 * Applied to /api/companies/:id and /api/contacts/:id endpoints.
 * 
 * Rate limit: 200 requests per minute per IP
 */

import rateLimit from "express-rate-limit";

export const seoRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[SEO Rate Limit] Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: 60
    });
  }
});

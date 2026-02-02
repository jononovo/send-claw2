// SendClaw: Email Service for AI Bots
// Add this to your shared/schema.ts file
// ============================================

import { pgTable, text, uuid, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";

// Assumes you have a users table - adjust the reference as needed
// import { users } from "./your-users-table";

export const bots = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id"), // .references(() => users.id, { onDelete: 'set null' }),
  address: text("address").notNull().unique(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  claimToken: text("claim_token").unique(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_bots_user_id').on(table.userId),
  index('idx_bots_address').on(table.address),
  index('idx_bots_api_key').on(table.apiKey),
  index('idx_bots_claim_token').on(table.claimToken)
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: 'cascade' }),
  direction: text("direction").notNull().$type<'inbound' | 'outbound'>(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  threadId: text("thread_id"),
  inReplyTo: text("in_reply_to"),
  messageId: text("message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_messages_bot_id').on(table.botId),
  index('idx_messages_thread_id').on(table.threadId),
  index('idx_messages_created_at').on(table.createdAt)
]);

export const quotaUsage = pgTable("quota_usage", {
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: 'cascade' }),
  date: text("date").notNull(),
  emailsSent: integer("emails_sent").notNull().default(0)
}, (table) => [
  index('idx_quota_usage_bot_date').on(table.botId, table.date)
]);

// Zod schemas for validation
export const insertBotSchema = z.object({
  name: z.string().min(1, "Bot name is required").max(100)
});

export const insertMessageSchema = z.object({
  to: z.string().email("Valid email address required"),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  inReplyTo: z.string().optional()
});

// TypeScript types
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

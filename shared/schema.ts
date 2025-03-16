import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  isConnected: boolean("is_connected").notNull().default(false),
  lastConnected: timestamp("last_connected"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  content: text("content").notNull(),
  sent: boolean("sent").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  to: true,
  content: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;

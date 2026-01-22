
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  guestId: text("guest_id").notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  keyCount: integer("key_count").default(0).notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const verificationPool = pgTable("verification_pool", {
  id: serial("id").primaryKey(),
  privateKey: text("private_key").notNull(),
  verifyUrl: text("verify_url").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'earning' or 'withdrawal'
  amount: integer("amount").notNull(),
  details: text("details"), // private key or withdrawal number/method
  status: text("status").default("completed"), // completed, pending
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).pick({
  guestId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// === API CONTRACT TYPES ===
export type LoginRequest = { guestId: string };
export type SubmitKeyRequest = { privateKey: string };
export type WithdrawRequest = { method: "bkash" | "nagad"; number: string; amount: number };

export type UserResponse = User;
export type TransactionResponse = Transaction;

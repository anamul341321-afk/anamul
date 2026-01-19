import { useTransactions } from "@/hooks/use-wallet";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function TransactionList() {
  const { data: transactions, isLoading } = useTransactions();

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading history...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl">
        <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-white/5 bg-white/5">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
        {transactions.map((tx) => (
          <div key={tx.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                tx.type === 'earning' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
              }`}>
                {tx.type === 'earning' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {tx.type === 'earning' ? 'Key Redeemed' : `Withdraw to ${tx.details}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.createdAt || Date.now()), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${
                tx.type === 'earning' ? 'text-green-400' : 'text-orange-400'
              }`}>
                {tx.type === 'earning' ? '+' : '-'}৳{tx.amount}
              </p>
              <p className={`text-xs capitalize ${
                tx.status === 'completed' ? 'text-primary' : 'text-yellow-500'
              }`}>
                {tx.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

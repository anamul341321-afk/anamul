import { useAuth } from "@/hooks/use-auth";
import { KeySubmitter } from "@/components/KeySubmitter";
import { WithdrawForm } from "@/components/WithdrawForm";
import { TransactionList } from "@/components/TransactionList";
import { LogOut, User, MessageCircle, Send } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b-0 rounded-none bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center border border-white/10">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">স্বাগতম,</p>
              <p className="font-bold text-sm truncate max-w-[120px]">{user.guestId}</p>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6 relative z-10">
        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-8 shadow-2xl shadow-primary/20 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
          
          <p className="text-white/80 font-medium mb-1 relative z-10">Total Balance</p>
          <h1 className="text-5xl font-bold mb-6 tracking-tight relative z-10">
            ৳{user.balance}
          </h1>
          
          <div className="flex items-center gap-2 text-white/60 text-sm relative z-10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            লাইভ আপডেট সক্রিয়
          </div>
        </motion.div>

        {/* Global Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-yellow-500">
          <p className="text-sm font-bold mb-1">গুরুত্বপূর্ণ নোটিশ:</p>
          <p className="text-xs leading-relaxed">
            সবাইকে জানানো যাচ্ছে যে, একটি প্রাইভেট কি শুধুমাত্র একবারই সাবমিট করা যাবে। একই কি বারবার সাবমিট করলে আপনার অ্যাকাউন্টটি ব্লক করে দেওয়া হতে পারে।
          </p>
        </div>

        {/* Actions */}
        <KeySubmitter />
        <WithdrawForm balance={user.balance} />
        
        {/* History */}
        <div className="pt-4">
          <h3 className="text-lg font-bold mb-4 px-2">Recent History</h3>
          <TransactionList />
        </div>

        {/* Support Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 mt-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">সাপোর্ট এবং আপডেট</h2>
          </div>
          
          <p className="text-sm text-emerald-100/80 mb-6 leading-relaxed">
            আমাদের অ্যাপের সকল নতুন আপডেট এবং পেমেন্ট প্রুফ সবার আগে জানতে টেলিগ্রাম চ্যানেলে জয়েন করুন। এছাড়া কোনো সমস্যা হলে আমাদের সাপোর্ট গ্রুপে মেসেজ দিন।
          </p>

          <div className="space-y-3">
            <a 
              href="https://t.me/anamul963050" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#24A1DE] hover:bg-[#24A1DE]/90 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              <Send className="w-5 h-5" /> চ্যানেলে জয়েন করুন
            </a>
            <a 
              href="https://t.me/+6a3iUf1_GAhiMWY1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              <MessageCircle className="w-5 h-5" /> সাপোর্ট গ্রুপে মেসেজ দিন
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

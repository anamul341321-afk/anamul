import { useState } from "react";
import { useSubmitKey } from "@/hooks/use-earn";
import { Key, Loader2, ArrowRight } from "lucide-react";
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
        <h2 className="text-xl font-bold">Submit Private Key</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Enter your 12-digit private key
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. 8266590938..."
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
            <>
              Submit Key <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Wait time: 2-5 minutes per validation
        </p>
      </form>
    </motion.div>
  );
}

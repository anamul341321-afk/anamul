
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Key, ShieldCheck, Loader2, ExternalLink, CheckCircle, Video, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import LZString from "lz-string";

export function KeySubmitter() {
  const [generatedWallet, setGeneratedWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  const generateWallet = () => {
    const wallet = ethers.Wallet.createRandom();
    setGeneratedWallet({
      address: wallet.address,
      privateKey: wallet.privateKey
    });
    setIsVerified(false);
    toast({ title: "নতুন অ্যাকাউন্ট তৈরি হয়েছে", description: "এখন ফেস ভেরিফিকেশন করুন" });
  };

  const checkVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!generatedWallet) return;
      const res = await apiRequest("POST", "/api/earn/check-verification", {
        address: generatedWallet.address
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.isVerified) {
        setIsVerified(true);
        toast({ title: "ভেরিফিকেশন সফল!", description: "এখন সাবমিট করুন" });
      } else {
        toast({ 
          title: "ভেরিফাই হয়নি", 
          description: "দয়া করে গুডডলার অ্যাপ থেকে ভেরিফিকেশন সম্পন্ন করুন",
          variant: "destructive"
        });
      }
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!generatedWallet || !isVerified) return;
      const res = await apiRequest("POST", api.earn.submitKey.path, {
        privateKey: generatedWallet.privateKey
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.transactions.path] });
      setGeneratedWallet(null);
      setIsVerified(false);
      toast({ title: "সফলভাবে সাবমিট হয়েছে", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
    }
  });

  const getGdVerifyUrl = () => {
    if (!generatedWallet) return "#";
    
    const requestObject = {
      v: "SecureEarn",
      web: window.location.origin,
      id: generatedWallet.address,
      r: ["identity"],
      cbu: window.location.origin
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(requestObject));
    return `https://goodid.gooddollar.org/?lz=${compressed}`;
  };

  const gdVerifyUrl = getGdVerifyUrl();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-3xl relative overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">অটোমেটিক ভেরিফিকেশন</h2>
      </div>

      <AnimatePresence mode="wait">
        {!generatedWallet ? (
          <motion.div
            key="generate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-400 font-bold mb-1">নির্দেশনা:</p>
              <ul className="text-xs text-emerald-100/80 space-y-2 list-disc pl-4">
                <li>নিচের বাটনে ক্লিক করলে গুডডলার ভেরিফিকেশন পেজ (GoodID) সরাসরি ওপেন হবে।</li>
                <li>সেখানে গিয়ে আপনার ফেস ভেরিফিকেশন সম্পন্ন করুন।</li>
                <li>ভেরিফিকেশন সফল হলে এই অ্যাপে ফিরে এসে স্ট্যাটাস চেক করুন।</li>
              </ul>
            </div>
            <button
              onClick={generateWallet}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" /> ফেস ভেরিফিকেশন শুরু করুন
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs text-muted-foreground mb-1 text-center">আপনার ভেরিফিকেশন এড্রেস</p>
              <p className="text-center font-mono text-[10px] break-all text-primary">{generatedWallet.address}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <a
                href={gdVerifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-4 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" /> Verify Now (Face)
              </a>

              <button
                onClick={() => checkVerificationMutation.mutate()}
                disabled={checkVerificationMutation.isPending || isVerified}
                className="btn-primary w-full py-4 bg-secondary border border-white/10 flex items-center justify-center gap-2"
              >
                {checkVerificationMutation.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : isVerified ? (
                  <><CheckCircle className="w-5 h-5 text-primary" /> ভেরিফিকেশন সফল</>
                ) : (
                  "ভেরিফিকেশন স্ট্যাটাস চেক করুন"
                )}
              </button>

              {isVerified && (
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="btn-primary w-full py-4 bg-primary text-black font-black text-lg animate-pulse"
                >
                  {submitMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : "সাবমিট এবং ইনকাম করুন"}
                </button>
              )}

              <button
                onClick={() => setGeneratedWallet(null)}
                className="text-xs text-muted-foreground hover:text-white transition-colors py-2"
              >
                আবার শুরু করুন
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Video className="w-5 h-5" />
          <h3 className="font-bold text-lg text-emerald-400">কিভাবে ভেরিফিকেশন করবেন?</h3>
        </div>
        <a 
          href="https://youtu.be/RvNhXcHKxl8?si=XU5IHbcqjL-hsf_2" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary flex items-center justify-center gap-2 text-sm w-full"
        >
          টিউটোরিয়াল ভিডিও দেখুন <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
}

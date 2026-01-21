import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserX, UserCheck, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", api.admin.login.path, { password });
      return res.json();
    },
    onSuccess: () => setIsLoggedIn(true),
    onError: () => toast({ title: "ভুল পাসওয়ার্ড", variant: "destructive" }),
  });

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: [api.admin.users.path],
    enabled: isLoggedIn,
  });

  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery<any[]>({
    queryKey: [api.admin.withdrawals.path],
    enabled: isLoggedIn,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, isBlocked }: { id: number; isBlocked: boolean }) => {
      await apiRequest("POST", buildUrl(api.admin.toggleBlock.path, { id }), { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "সফলভাবে আপডেট করা হয়েছে" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("POST", buildUrl(api.admin.updateWithdrawal.path, { id }), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.withdrawals.path] });
      toast({ title: "পেমেন্ট স্ট্যাটাস আপডেট করা হয়েছে" });
    },
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 rounded-3xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password..."
            className="input-field mb-4"
          />
          <button
            onClick={() => loginMutation.mutate()}
            className="btn-primary w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-primary" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">ব্যবহারকারী তালিকা (Users)</h2>
          <div className="grid gap-4">
            {users?.map((u) => (
              <div key={u.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold">{u.guestId}</p>
                  <p className="text-sm text-muted-foreground">ব্যালেন্স: ৳{u.balance}</p>
                </div>
                <button
                  onClick={() => blockMutation.mutate({ id: u.id, isBlocked: !u.isBlocked })}
                  className={`p-2 rounded-lg transition-colors ${u.isBlocked ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'}`}
                >
                  {u.isBlocked ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">পেন্ডিং উইথড্র (Withdrawals)</h2>
          <div className="grid gap-4">
            {withdrawals?.filter(w => w.status === 'pending').map((w) => (
              <div key={w.id} className="glass-card p-4 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <p className="font-bold text-lg">৳{w.amount}</p>
                  <p className="text-sm text-muted-foreground">{w.details}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => statusMutation.mutate({ id: w.id, status: 'completed' })}
                    className="flex-1 btn-primary py-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => statusMutation.mutate({ id: w.id, status: 'rejected' })}
                    className="flex-1 btn-primary py-2 bg-destructive hover:bg-destructive/90"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
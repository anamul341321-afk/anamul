import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserX, UserCheck, CheckCircle, XCircle, Loader2, Coins, Edit3 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newVerifyUrl, setNewVerifyUrl] = useState("");

  const { data: pool } = useQuery<any[]>({
    queryKey: ["/api/admin/verification-pool"],
    enabled: isLoggedIn,
  });

  const addPoolMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/verification-pool", { 
        privateKey: newPrivateKey, 
        verifyUrl: newVerifyUrl 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-pool"] });
      setNewPrivateKey("");
      setNewVerifyUrl("");
      toast({ title: "কি পুলে যোগ করা হয়েছে" });
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/verification-pool/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-pool"] });
      toast({ title: "কি ডিলিট করা হয়েছে" });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", api.admin.login.path, { password });
      return res.json();
    },
    onSuccess: () => setIsLoggedIn(true),
    onError: () => toast({ title: "ভুল পাসওয়ার্ড", variant: "destructive" }),
  });

  const { data: users } = useQuery<any[]>({
    queryKey: [api.admin.users.path],
    enabled: isLoggedIn,
  });

  const { data: withdrawals } = useQuery<any[]>({
    queryKey: [api.admin.withdrawals.path],
    enabled: isLoggedIn,
  });

  const { data: settingsData } = useQuery<any>({
    queryKey: [api.admin.getSettings.path],
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (settingsData?.rewardRate) {
      setRewardRate(settingsData.rewardRate.toString());
    }
  }, [settingsData]);

  const blockMutation = useMutation({
    mutationFn: async ({ id, isBlocked }: { id: number; isBlocked: boolean }) => {
      await apiRequest("POST", buildUrl(api.admin.toggleBlock.path, { id }), { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "সফলভাবে আপডেট করা হয়েছে" });
    },
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ id, balance }: { id: number; balance: number }) => {
      await apiRequest("POST", buildUrl(api.admin.updateBalance.path, { id }), { balance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      setEditingUserId(null);
      setNewBalance("");
      toast({ title: "ব্যালেন্স আপডেট করা হয়েছে" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rate: number) => {
      await apiRequest("POST", api.admin.updateSettings.path, { rewardRate: rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.getSettings.path] });
      toast({ title: "রিওয়ার্ড রেট আপডেট করা হয়েছে" });
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
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
        </header>

        {/* System Settings */}
        <section className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">সিস্টেম সেটিংস</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Reward Rate (TK per Key)</label>
              <input
                type="number"
                value={rewardRate}
                onChange={(e) => setRewardRate(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              onClick={() => rateMutation.mutate(parseInt(rewardRate))}
              className="btn-primary mt-6"
              disabled={rateMutation.isPending}
            >
              Update Rate
            </button>
          </div>
        </section>

        </section>

        {/* Verification Pool Management */}
        <section className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">ভেরিফিকেশন পুল (Keys & Links)</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Private Key..."
                value={newPrivateKey}
                onChange={(e) => setNewPrivateKey(e.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Verification Link (GoodID URL)..."
                value={newVerifyUrl}
                onChange={(e) => setNewVerifyUrl(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              onClick={() => addPoolMutation.mutate()}
              className="btn-primary w-full"
              disabled={addPoolMutation.isPending || !newPrivateKey || !newVerifyUrl}
            >
              Add to Pool
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {pool?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1 truncate mr-4">
                  <p className="text-xs font-mono truncate">{item.privateKey}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.verifyUrl}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.isUsed ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                    {item.isUsed ? 'USED' : 'READY'}
                  </span>
                  <button
                    onClick={() => deletePoolMutation.mutate(item.id)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">ব্যবহারকারী তালিকা (Users)</h2>
          <div className="grid gap-4">
            {users?.map((u) => (
              <div key={u.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold">{u.guestId}</p>
                  {editingUserId === u.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="input-field h-8 py-0 text-sm w-24"
                        placeholder="New Balance"
                      />
                      <button
                        onClick={() => balanceMutation.mutate({ id: u.id, balance: parseInt(newBalance) })}
                        className="text-primary text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="text-muted-foreground text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">ব্যালেন্স: ৳{u.balance}</p>
                      <button 
                        onClick={() => {
                          setEditingUserId(u.id);
                          setNewBalance(u.balance.toString());
                        }}
                        className="text-primary p-1 hover:bg-primary/10 rounded"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
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
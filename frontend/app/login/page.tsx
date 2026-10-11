"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Mail, Lock, User as UserIcon, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

function LoginInner() {
  const r = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    sp.get("mode") === "register" ? "register" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "OWNER", orgName: "" });

  useEffect(() => { if (sp.get("mode") === "register") setMode("register"); }, [sp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, fullName: form.fullName, role: form.role, orgName: form.orgName };
      const { data } = await api.post(url, body, {
      headers: { "Content-Type": "application/json" },
	  });
      localStorage.setItem("token", data.token);
      localStorage.setItem("me", JSON.stringify(data));
      toast.success("Welcome!");
      r.push(data.role === "TENANT" ? "/tenant" : "/owner");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-lg">ApartmentOS</span>
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to access your apartment dashboard." : "Set up your organization and start managing in minutes."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" required className="pl-9" placeholder="Ravi Kumar"
                      value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" required placeholder="Sai Enclave"
                    value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>I am an</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["OWNER", "TENANT"].map((rl) => (
                      <button type="button" key={rl} onClick={() => setForm({ ...form, role: rl })}
                        className={`rounded-lg border p-3 text-sm font-medium transition ${
                          form.role === rl ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                        }`}>
                        {rl === "OWNER" ? "Apartment owner" : "Tenant"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required className="pl-9" placeholder="you@example.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" required className="pl-9" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-medium text-primary hover:underline">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="relative z-10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" /> Trusted by apartment owners
          </div>
          <div>
            <blockquote className="text-3xl font-medium leading-snug">
              "Replaced 6 Excel files with one dashboard. I finally know my apartment's real ROI."
            </blockquote>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur grid place-items-center font-semibold">AR</div>
              <div>
                <div className="font-medium">Arun R.</div>
                <div className="text-sm text-white/70">Owner, 12 flats — Bengaluru</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            {[["₹1.2Cr+", "Tracked"], ["3,400+", "Invoices"], ["99.9%", "Uptime"]].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-semibold">{v}</div>
                <div className="text-white/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

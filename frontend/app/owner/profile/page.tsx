"use client";
import { useEffect, useState } from "react";
import { User as UserIcon, Mail, Shield, Building2, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api, getMe, type Me } from "@/lib/api";

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Seed from localStorage for instant render, then refresh from the API.
    setMe(getMe());
    api.get("/api/auth/me")
      .then((r) => {
        setMe(r.data);
        if (typeof window !== "undefined") localStorage.setItem("me", JSON.stringify(r.data));
      })
      .catch((e) => setError(e?.response?.data?.message ?? "Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const initials = (me?.fullName || "U")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details" />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold">{me?.fullName ?? (loading ? "Loading…" : "Guest")}</h2>
            <p className="text-sm text-muted-foreground">{me?.email ?? "—"}</p>
            {me?.role && (
              <Badge className="mt-3" variant="secondary">{me.role}</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Details tied to your login</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row icon={<UserIcon className="h-4 w-4" />} label="Full name" value={me?.fullName} />
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={me?.email} />
            <Row icon={<Shield className="h-4 w-4" />} label="Role" value={me?.role} />
            <Row icon={<Building2 className="h-4 w-4" />} label="Organisation ID" value={me?.orgId ? String(me.orgId) : undefined} />

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                {me?.googleConnected
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span className={me?.googleConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                  Google mail {me?.googleConnected ? "connected" : "not connected"}
                </span>
              </div>
              <a
                href="/oauth2/authorization/google"
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
              >
                {me?.googleConnected ? "Reconnect" : "Connect mail account"}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium truncate max-w-[60%] text-right">{value ?? "—"}</div>
    </div>
  );
}

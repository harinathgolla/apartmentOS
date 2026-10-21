"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getMe } from "@/lib/api";
import { toast } from "sonner";

const MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"];

export default function RemindersPage() {
  const [month, setMonth] = useState("April");
  const [year, setYear] = useState(new Date().getFullYear());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => { setMe(getMe()); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      api.get("/api/auth/me").then((r) => {
        const merged = { ...(getMe() ?? {}), ...r.data };
        localStorage.setItem("me", JSON.stringify(merged));
        setMe(merged);
        toast.success("Mail account connected");
      }).catch(() => {});
    }
  }, []);

  async function send() {
    setBusy(true);
    try {
      const { data } = await api.post("/api/owner/reminders/send", {
        month, year, customMessage: msg, sendToAll: true,
      });
      toast.success(`Sent ${data.sent}, failed ${data.failed}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Reminders" subtitle="Send rent reminders to your tenants via email" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Send reminders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
              <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Optional custom message to tenants…"
              className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
            />
            <Button variant="gradient" className="w-full" disabled={busy} onClick={send}>
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send to all tenants"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mail account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {me?.googleConnected ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Connected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reminders will be sent as <b>{me.email}</b>.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect your mail account once so reminders go out from your own address.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/oauth2/authorization/google">Connect mail account</a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
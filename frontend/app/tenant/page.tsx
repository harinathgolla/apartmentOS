"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Receipt, Zap, Download, ExternalLink, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api, getMe } from "@/lib/api";
import { fmtINR } from "@/lib/utils";

export default function TenantDashboard() {
  const r = useRouter();
  const [me, setMe] = useState<any>(null);
  const [rent, setRent] = useState<any[]>([]);
  const [meter, setMeter] = useState<any[]>([]);

  useEffect(() => {
    const m = getMe();
    if (!m) { r.push("/login"); return; }
    setMe(m);
    // Endpoint now returns a Spring Page; unwrap defensively.
    api.get<any>("/api/tenant/rent").then((x) => {
      const d = x.data;
      setRent(Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : []);
    }).catch(()=>{});
    api.get("/api/tenant/meter").then(x => setMeter(x.data)).catch(()=>{});
  }, [r]);

  const pending = rent.filter(x => !x.paid);
  const totalDue = pending.reduce((s, x) => s + Number(x.totalCollected || 0), 0);

  if (!me) return null;
  const initials = (me.fullName || "T").split(" ").map((s:string)=>s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <PageHeader
        title={`Hi ${me.fullName?.split(" ")[0]}`}
        subtitle="Your rent, electricity and payment history — all in one place."
        action={
          <Button variant="outline" onClick={() => { localStorage.clear(); r.push("/login"); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Monthly rent" value={fmtINR(rent[0]?.rentAmount ?? 0)} icon={Home} tone="info" />
        <KpiCard label="Amount due" value={fmtINR(totalDue)} icon={Receipt} tone={totalDue ? "warning" : "success"} />
        <KpiCard label="Pending bills" value={String(pending.length)} icon={Zap} tone={pending.length ? "danger" : "success"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Rent history</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead><TableHead>Rent</TableHead>
                  <TableHead>EBill</TableHead><TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.month} {r.year}</TableCell>
                    <TableCell>{fmtINR(r.rentAmount)}</TableCell>
                    <TableCell>{fmtINR(r.ebillAmount)}</TableCell>
                    <TableCell className="font-semibold">{fmtINR(r.totalCollected)}</TableCell>
                    <TableCell><Badge variant={r.paid ? "success" : "warning"}>{r.paid ? "Paid" : "Pending"}</Badge></TableCell>
                  </TableRow>
                ))}
                {rent.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No rent records yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback>{initials}</AvatarFallback></Avatar>
              <div>
                <div className="font-medium">{me.fullName}</div>
                <div className="text-xs text-muted-foreground">{me.email}</div>
              </div>
            </div>
            <Button variant="outline" className="w-full">View agreement <ExternalLink className="h-3.5 w-3.5" /></Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Electricity usage</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead><TableHead>Previous</TableHead><TableHead>Present</TableHead>
                <TableHead>Units</TableHead><TableHead>Rate</TableHead><TableHead>Bill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meter.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.month} {m.year}</TableCell>
                  <TableCell>{m.previousReading}</TableCell>
                  <TableCell>{m.presentReading}</TableCell>
                  <TableCell>{m.usageUnits}</TableCell>
                  <TableCell>₹{m.ratePerUnit}</TableCell>
                  <TableCell className="font-semibold">{fmtINR(m.billAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

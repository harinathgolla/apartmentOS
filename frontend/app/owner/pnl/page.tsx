"use client";
import { useEffect, useState } from "react";
import { Receipt, LineChart, ArrowUpRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PnlBarChart } from "@/components/charts/pnl-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";

export default function PnlPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [pnl, setPnl] = useState<any>(null);

  useEffect(() => {
    api.get("/api/owner/pnl", { params: { year } })
      .then((r) => setPnl(r.data))
      .catch(() => setPnl(null));
  }, [year]);

  const zero = { grossRent: 0, otherIncome: 0, operatingExpenses: 0, emiInterest: 0, netOperatingIncome: 0, roiPercent: 0, investedCapital: 0 };
  const d = pnl && typeof pnl === "object" ? { ...zero, ...pnl } : zero;

  const bars = [
    { name: "Gross Rent",  value: Number(d.grossRent) || 0 },
    { name: "Other Income",value: Number(d.otherIncome) || 0 },
    { name: "OpEx",        value: -Number(d.operatingExpenses || 0) },
    { name: "EMI Interest",value: -Number(d.emiInterest || 0) },
    { name: "Net Income",  value: Number(d.netOperatingIncome) || 0 },
  ];

  return (
    <>
      <PageHeader
        title="P&L / ROI"
        subtitle="How much your apartment actually earns you"
        action={<Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="w-28" />}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Gross rent"  value={fmtINR(d.grossRent)}           icon={Receipt}    tone="info" />
        <KpiCard label="Net income"  value={fmtINR(d.netOperatingIncome)}  icon={LineChart}  tone="success" />
        <KpiCard label="ROI"         value={`${Number(d.roiPercent || 0).toFixed(2)}%`} icon={ArrowUpRight} tone="warning" />
        <KpiCard label="Invested"    value={fmtINR(d.investedCapital)}     icon={Wallet}     tone="default" />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>P&amp;L breakdown — {year}</CardTitle></CardHeader>
        <CardContent><PnlBarChart data={bars} /></CardContent>
      </Card>
    </>
  );
}
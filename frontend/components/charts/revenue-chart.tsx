"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtINR } from "@/lib/utils";

export type TrendPoint = { month: string; income: number; expense: number };

export function RevenueChart({ data }: { data: TrendPoint[] | unknown }) {
  // Guard against non-array data (backend error payload, undefined, null)
  const safeData: TrendPoint[] = Array.isArray(data)
    ? (data as TrendPoint[]).map((d) => ({
        month: String(d?.month ?? ""),
        income: Number(d?.income ?? 0) || 0,
        expense: Number(d?.expense ?? 0) || 0,
      }))
    : [];

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Income vs Expense</CardTitle>
        <p className="text-sm text-muted-foreground">Monthly cash flow snapshot</p>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          {safeData.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No data yet — add some rent records to see the trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#6366f1"
                  fill="url(#income)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#f43f5e"
                  fill="url(#expense)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
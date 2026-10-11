"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtINR } from "@/lib/utils";

export type PnlBar = { name: string; value: number };

export function PnlBarChart({ data }: { data: PnlBar[] | unknown }) {
  const safeData: PnlBar[] = Array.isArray(data)
    ? (data as PnlBar[]).map((d) => ({
        name: String(d?.name ?? ""),
        value: Number(d?.value ?? 0) || 0,
      }))
    : [];

  if (safeData.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-muted-foreground">
        No P&amp;L data for this year yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip formatter={(v: number) => fmtINR(v)} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
            {safeData.map((d, i) => (
              <Cell key={i} fill={d.value < 0 ? "#f43f5e" : "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
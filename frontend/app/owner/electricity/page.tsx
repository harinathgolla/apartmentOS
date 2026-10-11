"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";

const MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"];

export default function ElectricityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("April");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/api/owner/meter", { params: { year, month } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  return (
    <>
      <PageHeader
        title="Electricity"
        subtitle="Meter readings, usage and billed amounts per flat"
        action={
          <div className="flex gap-2">
            <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="w-24" />
            <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        }
      />
      <Card>
        <CardHeader><CardTitle>{month} {year}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead><TableHead>Prev</TableHead><TableHead>Present</TableHead>
                <TableHead>Units</TableHead><TableHead>Rate</TableHead><TableHead>Bill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {loading ? "Loading…" : "No readings yet"}
                </TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.flatNo ?? `#${r.flatId}`}</TableCell>
                  <TableCell>{r.previousReading}</TableCell>
                  <TableCell>{r.presentReading}</TableCell>
                  <TableCell>{r.usageUnits}</TableCell>
                  <TableCell>₹{r.ratePerUnit}</TableCell>
                  <TableCell className="font-semibold">{fmtINR(r.billAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Check, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";
import { MeterReadingModal, type Flat, type MeterRow } from "@/components/utilities/meter-reading-modal";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function ElectricityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ existing: MeterRow | null } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/owner/meter", { params: { year, month } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<Flat[]>("/api/owner/flats").then((r) => setFlats(Array.isArray(r.data) ? r.data : [])).catch(() => setFlats([]));
  }, []);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    units: a.units + (Number(r.usageUnits) || 0),
    bill: a.bill + (Number(r.billAmount) || 0),
    paid: a.paid + (r.paid ? 1 : 0),
  }), { units: 0, bill: 0, paid: 0 }), [rows]);

  async function togglePaid(r: any) {
    setBusyId(r.id);
    try {
      await api.post(`/api/owner/meter/${r.id}/paid`, null, { params: { paid: !r.paid } });
      toast.success(!r.paid ? "Marked paid" : "Marked pending");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update");
    } finally { setBusyId(null); }
  }

  return (
    <>
      <PageHeader
        title="Electricity"
        subtitle="Meter readings, usage and billed amounts per flat"
        action={
          <div className="flex flex-wrap gap-2">
            <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="w-24" />
            <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <Button variant="gradient" onClick={() => setModal({ existing: null })} disabled={flats.length === 0}
              title={flats.length === 0 ? "Add flats first" : undefined}>
              <Plus className="h-4 w-4" /> Add reading
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Units</p><p className="mt-1 text-xl font-semibold">{totals.units.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Charges</p><p className="mt-1 text-xl font-semibold">{fmtINR(totals.bill)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Readings</p><p className="mt-1 text-xl font-semibold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Paid</p><p className="mt-1 text-xl font-semibold">{totals.paid}/{rows.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{month} {year}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flat</TableHead><TableHead>Prev</TableHead><TableHead>Present</TableHead>
                  <TableHead>Units</TableHead><TableHead>Rate</TableHead><TableHead>Bill</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…" : "No readings yet — click Add reading"}
                  </TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.flatNo ?? `#${r.flatId}`}</TableCell>
                    <TableCell>{r.previousReading ?? "—"}</TableCell>
                    <TableCell>{r.presentReading ?? "—"}</TableCell>
                    <TableCell>{r.usageUnits ?? "—"}</TableCell>
                    <TableCell>{r.ratePerUnit == null ? "—" : fmtINR(r.ratePerUnit)}</TableCell>
                    <TableCell className="font-semibold">{fmtINR(r.billAmount)}</TableCell>
                    <TableCell>
                      {r.paid ? (
                        <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Paid</Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost"
                          onClick={() => setModal({ existing: r as MeterRow })}>Edit</Button>
                        <Button size="sm" variant={r.paid ? "outline" : "gradient"}
                          disabled={busyId === r.id} onClick={() => togglePaid(r)}>
                          {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.paid ? "Unpay" : "Mark paid"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {modal && (
        <MeterReadingModal
          flats={flats}
          year={year}
          month={month}
          existing={modal.existing}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

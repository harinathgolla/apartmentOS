"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Droplets, Zap, ReceiptText, Gauge, IndianRupee, RefreshCw, Plus, Check, Clock, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";
import { MeterReadingModal, type Flat, type MeterRow } from "@/components/utilities/meter-reading-modal";
import { UtilityBillModal, type UtilityBill } from "@/components/utilities/utility-bill-modal";
import { CommonMeterModal } from "@/components/utilities/common-meter-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InlineLink } from "@/components/ui/inline-link";
import { QuickFlatModal, type QuickFlat } from "@/components/owner/quick-flat-modal";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type Tab = "overview" | "electricity" | "water" | "bills";

export default function UtilitiesPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("overview");
  const [rows, setRows] = useState<any[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<{ existing: MeterRow | null } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [billModal, setBillModal] = useState(false);
  const [commonModal, setCommonModal] = useState(false);
  const [waterRows, setWaterRows] = useState<any[]>([]);
  const [waterModal, setWaterModal] = useState<{ existing: MeterRow | null } | null>(null);
  const [flatEdit, setFlatEdit] = useState<QuickFlat | null>(null);

  async function reloadFlats() {
    const r = await api.get<Flat[]>("/api/owner/flats").catch(() => null);
    if (r) setFlats(Array.isArray(r.data) ? r.data : []);
  }

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/api/owner/meter", { params: { year, month } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        setRows([]);
        setError("Could not load electricity readings. Check your connection and try again.");
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => {
    api.get<Flat[]>("/api/owner/flats").then((r) => setFlats(Array.isArray(r.data) ? r.data : [])).catch(() => setFlats([]));
  }, []);

  const loadBills = useCallback(() => {
    api.get<UtilityBill[]>("/api/owner/utility-bills")
      .then((r) => setBills(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBills([]));
  }, []);
  useEffect(() => { loadBills(); }, [loadBills]);

  async function deleteBill(id: number) {
    const ok = await confirm({
      title: "Delete this bill?",
      description: "The utility bill and its linked expense entry will both be removed. This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete bill",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/owner/utility-bills/${id}`);
      toast.success("Bill deleted");
      loadBills();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete");
    }
  }

  const billTotals = useMemo(() => ({
    count: bills.length,
    amount: bills.reduce((s, b) => s + (Number(b.amount) || 0), 0),
  }), [bills]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    units: acc.units + (Number(r.usageUnits) || 0),
    bill: acc.bill + (Number(r.billAmount) || 0),
    paid: acc.paid + (r.paid ? 1 : 0),
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

  const loadWater = useCallback(() => {
    api.get("/api/owner/water", { params: { year, month } })
      .then((r) => setWaterRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setWaterRows([]));
  }, [year, month]);
  useEffect(() => { loadWater(); }, [loadWater, reloadKey]);

  const waterTotals = useMemo(() => waterRows.reduce((acc, r) => ({
    units: acc.units + (Number(r.usageUnits) || 0),
    bill: acc.bill + (Number(r.billAmount) || 0),
    paid: acc.paid + (r.paid ? 1 : 0),
  }), { units: 0, bill: 0, paid: 0 }), [waterRows]);

  async function toggleWaterPaid(r: any) {
    setBusyId(r.id);
    try {
      await api.post(`/api/owner/water/${r.id}/paid`, null, { params: { paid: !r.paid } });
      toast.success(!r.paid ? "Marked paid" : "Marked pending");
      loadWater();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update");
    } finally { setBusyId(null); }
  }

  const tabs: { id: Tab; label: string; icon: typeof Gauge }[] = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "electricity", label: "Electricity", icon: Zap },
    { id: "water", label: "Water", icon: Droplets },
    { id: "bills", label: "Utility bills", icon: ReceiptText },
  ];

  const electricityMetrics = (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600"><Zap className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">Electricity usage</p><p className="text-2xl font-semibold">{totals.units.toLocaleString("en-IN")} units</p><p className="text-xs text-muted-foreground">{month} {year}</p></div>
      </CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><IndianRupee className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">Electricity charges</p><p className="text-2xl font-semibold">{fmtINR(totals.bill)}</p><p className="text-xs text-muted-foreground">From recorded readings</p></div>
      </CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-sky-500/10 p-3 text-sky-600"><Gauge className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">Meters recorded</p><p className="text-2xl font-semibold">{rows.length}</p><p className="text-xs text-muted-foreground">For selected period</p></div>
      </CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600"><Check className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">Paid readings</p><p className="text-2xl font-semibold">{totals.paid}/{rows.length}</p><p className="text-xs text-muted-foreground">Marked settled</p></div>
      </CardContent></Card>
    </div>
  );

  const readingsTable = (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Electricity meter readings · {month} {year}</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCommonModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Common area
          </Button>
          <Button size="sm" variant="gradient" onClick={() => setModal({ existing: null })} disabled={flats.length === 0}
            title={flats.length === 0 ? "Add flats first" : undefined}>
            <Plus className="h-3.5 w-3.5" /> Add reading
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}<button className="ml-3 inline-flex items-center gap-1 underline" onClick={() => setReloadKey((v) => v + 1)}><RefreshCw className="h-3 w-3"/> Retry</button></div>}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Flat</TableHead><TableHead>Previous</TableHead><TableHead>Present</TableHead><TableHead>Units used</TableHead><TableHead>Rate / unit</TableHead><TableHead>Bill amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{loading ? "Loading readings…" : error ? "Readings unavailable" : "No electricity readings recorded for this period."}</TableCell></TableRow>}
              {rows.map((r) => <TableRow key={r.id}>
                <TableCell className="font-medium"><FlatCell flatId={r.flatId} flatNo={r.flatNo} flats={flats} onEdit={setFlatEdit} /></TableCell>
                <TableCell>{r.previousReading ?? "—"}</TableCell>
                <TableCell>{r.presentReading ?? "—"}</TableCell>
                <TableCell>{r.usageUnits ?? "—"}</TableCell>
                <TableCell>{r.ratePerUnit == null ? "—" : fmtINR(r.ratePerUnit)}</TableCell>
                <TableCell className="font-semibold">{fmtINR(r.billAmount)}</TableCell>
                <TableCell>
                  {r.paid ? <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Paid</Badge>
                         : <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setModal({ existing: r as MeterRow })}>Edit</Button>
                    <Button size="sm" variant={r.paid ? "outline" : "gradient"} disabled={busyId === r.id} onClick={() => togglePaid(r)}>
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.paid ? "Unpay" : "Mark paid"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="Utilities" subtitle="Manage meter readings, utility charges and bills in one place" action={
        <div className="flex gap-2">
          <Input aria-label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
          <select aria-label="Billing month" className="h-10 rounded-lg border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      } />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* OVERVIEW — per-tab summary metrics */}
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600"><Zap className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Electricity</p><p className="text-2xl font-semibold">{totals.units.toLocaleString("en-IN")} units</p><p className="text-xs text-muted-foreground">{fmtINR(totals.bill)} · {totals.paid}/{rows.length} paid</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-600"><Droplets className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Water</p><p className="text-2xl font-semibold">{waterTotals.units.toLocaleString("en-IN")} units</p><p className="text-xs text-muted-foreground">{fmtINR(waterTotals.bill)} · {waterTotals.paid}/{waterRows.length} paid</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-600"><ReceiptText className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Utility bills</p><p className="text-2xl font-semibold">{fmtINR(billTotals.amount)}</p><p className="text-xs text-muted-foreground">{billTotals.count} bill{billTotals.count === 1 ? "" : "s"} · linked to expenses</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600"><Gauge className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Meters recorded</p><p className="text-2xl font-semibold">{rows.length}</p><p className="text-xs text-muted-foreground">{month} {year}</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* ELECTRICITY */}
      {tab === "electricity" && (
        <>
          {electricityMetrics}
          {readingsTable}
        </>
      )}

      {/* WATER placeholder (next phase) */}
      {tab === "water" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-600"><Droplets className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">Water usage</p><p className="text-2xl font-semibold">{waterTotals.units.toLocaleString("en-IN")} units</p><p className="text-xs text-muted-foreground">{month} {year}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><IndianRupee className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">Water charges</p><p className="text-2xl font-semibold">{fmtINR(waterTotals.bill)}</p><p className="text-xs text-muted-foreground">From recorded readings</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600"><Gauge className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">Meters recorded</p><p className="text-2xl font-semibold">{waterRows.length}</p><p className="text-xs text-muted-foreground">For selected period</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><Check className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">Paid readings</p><p className="text-2xl font-semibold">{waterTotals.paid}/{waterRows.length}</p><p className="text-xs text-muted-foreground">Marked settled</p></div>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Water meter readings · {month} {year}</CardTitle>
              <Button size="sm" variant="gradient" onClick={() => setWaterModal({ existing: null })} disabled={flats.length === 0}
                title={flats.length === 0 ? "Add flats first" : undefined}>
                <Plus className="h-3.5 w-3.5" /> Add reading
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Flat</TableHead><TableHead>Previous</TableHead><TableHead>Present</TableHead><TableHead>Units used</TableHead><TableHead>Rate / unit</TableHead><TableHead>Bill amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {waterRows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No water readings recorded for this period.</TableCell></TableRow>}
                    {waterRows.map((r) => <TableRow key={r.id}>
                      <TableCell className="font-medium"><FlatCell flatId={r.flatId} flatNo={r.flatNo} flats={flats} onEdit={setFlatEdit} /></TableCell>
                      <TableCell>{r.previousReading ?? "—"}</TableCell>
                      <TableCell>{r.presentReading ?? "—"}</TableCell>
                      <TableCell>{r.usageUnits ?? "—"}</TableCell>
                      <TableCell>{r.ratePerUnit == null ? "—" : fmtINR(r.ratePerUnit)}</TableCell>
                      <TableCell className="font-semibold">{fmtINR(r.billAmount)}</TableCell>
                      <TableCell>
                        {r.paid ? <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Paid</Badge>
                               : <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setWaterModal({ existing: r as MeterRow })}>Edit</Button>
                          <Button size="sm" variant={r.paid ? "outline" : "gradient"} disabled={busyId === r.id} onClick={() => toggleWaterPaid(r)}>
                            {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.paid ? "Unpay" : "Mark paid"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* UTILITY BILLS */}
      {tab === "bills" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Utility bills</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{fmtINR(billTotals.amount)} across {billTotals.count} bill{billTotals.count === 1 ? "" : "s"}</p>
            </div>
            <Button size="sm" variant="gradient" onClick={() => setBillModal(true)}>
              <Plus className="h-3.5 w-3.5" /> Add bill
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Maint.</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bills.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No utility bills yet — click Add bill.</TableCell></TableRow>}
                  {bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.billDate}</TableCell>
                      <TableCell className="font-medium">{b.category?.replace(/_/g, " ").toLowerCase()}</TableCell>
                      <TableCell className="text-muted-foreground">{b.description ?? "—"}</TableCell>
                      <TableCell>{b.vendor ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.periodMonth ? `${b.periodMonth} ${b.periodYear ?? ""}` : "—"}</TableCell>
                      <TableCell className="font-semibold">{fmtINR(b.amount)}</TableCell>
                      <TableCell>{b.affectsMaintenance ? <Badge variant="info">Recover</Badge> : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteBill(b.id)} aria-label="Delete bill">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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

      {billModal && (
        <UtilityBillModal
          year={year}
          month={month}
          onClose={() => setBillModal(false)}
          onDone={() => { setBillModal(false); loadBills(); }}
        />
      )}

      {commonModal && (
        <CommonMeterModal
          year={year}
          month={month}
          onClose={() => setCommonModal(false)}
          onDone={() => { setCommonModal(false); loadBills(); }}
        />
      )}

      {waterModal && (
        <MeterReadingModal
          flats={flats}
          year={year}
          month={month}
          existing={waterModal.existing}
          endpoint="/api/owner/water"
          title="water reading"
          onClose={() => setWaterModal(null)}
          onDone={() => { setWaterModal(null); loadWater(); }}
        />
      )}

      {flatEdit && (
        <QuickFlatModal
          flat={flatEdit}
          onClose={() => setFlatEdit(null)}
          onDone={() => { setFlatEdit(null); reloadFlats(); load(); loadWater(); }}
        />
      )}
    </>
  );
}

/** Flat cell rendered as a hyperlink — click opens the inline flat editor. */
function FlatCell({
  flatId, flatNo, flats, onEdit,
}: {
  flatId: number;
  flatNo?: string | null;
  flats: Flat[];
  onEdit: (f: QuickFlat) => void;
}) {
  const fl = flats.find((f) => f.id === flatId);
  if (!fl) {
    return <InlineLink muted title="Flat not found">#{flatId}</InlineLink>;
  }
  return (
    <InlineLink onClick={() => onEdit(fl as QuickFlat)} title="Edit this flat">
      {flatNo ?? fl.flatNo}
    </InlineLink>
  );
}

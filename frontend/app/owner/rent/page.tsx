"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Plus, Check, CheckCircle2, Clock, Building2, Loader2, X, Home,
  Wallet, Receipt, TrendingUp, IndianRupee,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const PAYMENT_MODES = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE"];

type Apartment = { id: number; name: string; city?: string };
type Flat = {
  id: number; flatNo: string; apartmentId: number; floor?: number;
  nominalElectricityAmount?: number | null; nominalWaterAmount?: number | null;
};
type Tenancy = {
  id: number; flatId: number; apartmentId: number;
  tenantName: string; tenantEmail?: string; tenantPhone?: string;
  rentAmount?: number; frequency?: string; dueDay?: number; active: boolean;
  maintenanceAmount?: number; tenancyType?: string;
};
type RentRecord = {
  id?: number; tenancyId?: number; flatId: number; apartmentId: number;
  tenantName: string; month: string; year: number;
  rentAmount?: number; ebillAmount?: number; waterBill?: number; maintenanceCharge?: number;
  totalCollected?: number;
  paymentMode?: string; paid?: boolean; paidDate?: string; remarks?: string;
};
type MeterReading = {
  id: number; flatId: number; month: string; year: number;
  usageUnits?: number; ratePerUnit?: number; billAmount?: number;
};

type MeterCfg = {
  id: number; flatId?: number | null;
  utilityType: "ELECTRICITY" | "WATER";
  scope: "PUBLIC" | "PRIVATE";
};

type Row = {
  tenancy: Tenancy;
  flat?: Flat;
  existing?: RentRecord;
  meterBill?: number;
  meterUnits?: number;
  elecPublic?: boolean;
  waterPublic?: boolean;
  /** Fixed maintenance for the agreement term, from tenancy. */
  maintFixed?: number;
  /** Flat bills by nominal amount for this utility — meter is irrelevant. */
  elecNominal?: number;
  waterNominal?: number;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function RentPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectFor, setCollectFor] = useState<Row | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState("CASH");

  /* Load apartments */
  useEffect(() => {
    api.get<Apartment[]>("/api/owner/apartments")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setApartments(list);
        if (list.length > 0) setSelectedAptId(list[0].id);
      })
      .catch(() => setApartments([]));
  }, []);

  /* Load rows for month/apartment */
  const load = useCallback(async () => {
    if (!selectedAptId) { setRows([]); return; }
    setLoading(true);
    try {
      const [tenants, flats, rent, meter, meterCfg] = await Promise.all([
        // Include past/old tenancies so historical months show that agreement's rent.
        api.get<Tenancy[]>("/api/owner/tenants", { params: { apartmentId: selectedAptId, all: true } }),
        api.get<Flat[]>("/api/owner/flats", { params: { apartmentId: selectedAptId } }),
        api.get<RentRecord[]>("/api/owner/rent", { params: { year, month, apartmentId: selectedAptId } }),
        api.get<MeterReading[]>("/api/owner/meter", { params: { year, month } }).catch(() => ({ data: [] })),
        api.get<MeterCfg[]>("/api/owner/meters", { params: { apartmentId: selectedAptId } }).catch(() => ({ data: [] })),
      ]);
      const fs = Array.isArray(flats.data) ? flats.data : [];
      const rs = Array.isArray(rent.data) ? rent.data : [];
      const ms = Array.isArray(meter.data) ? meter.data : [];
      // Keep a tenancy if it is active OR it has a record for the selected period,
      // so an old agreement still surfaces with its own (historical) rent.
      const allTenancies = Array.isArray(tenants.data) ? tenants.data : [];
      const ts = allTenancies.filter(
        (t) => t.active || rs.some((r) => r.tenancyId === t.id)
      );

      const flatsById = new Map(fs.map((f) => [f.id, f]));
      const rentByTenancy = new Map(rs.filter((r) => r.tenancyId).map((r) => [r.tenancyId!, r]));
      const meterByFlat = new Map(ms.map((m) => [m.flatId, m]));
      const cfg = Array.isArray(meterCfg.data) ? meterCfg.data : [];
      const pubKey = new Set(cfg.filter((m) => m.scope === "PUBLIC" && m.flatId)
        .map((m) => `${m.flatId}:${m.utilityType}`));

      const computed: Row[] = ts.map((t) => {
        const f = flatsById.get(t.flatId);
        const existing = rentByTenancy.get(t.id);
        const mr = meterByFlat.get(t.flatId);
        return {
          tenancy: t,
          flat: f,
          existing,
          meterBill: mr?.billAmount != null ? Number(mr.billAmount) : undefined,
          meterUnits: mr?.usageUnits != null ? Number(mr.usageUnits) : undefined,
          elecPublic: pubKey.has(`${t.flatId}:ELECTRICITY`),
          waterPublic: pubKey.has(`${t.flatId}:WATER`),
          maintFixed: t.maintenanceAmount != null ? Number(t.maintenanceAmount) : undefined,
          elecNominal: f?.nominalElectricityAmount != null && Number(f.nominalElectricityAmount) > 0
            ? Number(f.nominalElectricityAmount) : undefined,
          waterNominal: f?.nominalWaterAmount != null && Number(f.nominalWaterAmount) > 0
            ? Number(f.nominalWaterAmount) : undefined,
        };
      });
      setRows(computed);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAptId, year, month]);

  useEffect(() => { load(); }, [load]);

  /* Suggested per-flat maintenance share (from recover-via-maintenance utility bills) */
  const [maintSuggestion, setMaintSuggestion] = useState(0);
  const [coverage, setCoverage] = useState<{
    expected?: number; collected?: number; commonAreaCost?: number;
    maintenanceExpenses?: number; outgo?: number; surplus?: number; covered?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!selectedAptId) { setMaintSuggestion(0); return; }
    api.get("/api/owner/utility-bills/maintenance-suggestion", { params: { year, month } })
      .then((r) => setMaintSuggestion(Number(r.data?.perFlat) || 0))
      .catch(() => setMaintSuggestion(0));
    api.get("/api/owner/rent/maintenance-coverage", { params: { year, month } })
      .then((r) => setCoverage(r.data ?? null))
      .catch(() => setCoverage(null));
  }, [selectedAptId, year, month]);

  /* Totals */
  const expected = rows.reduce((s, r) => s + num(r.tenancy.rentAmount), 0);
  const collected = rows.reduce((s, r) => s + (r.existing?.paid ? num(r.existing.totalCollected) : 0), 0);
  const pending = rows.reduce(
    (s, r) => s + (r.existing?.paid
      ? 0
      : num(r.existing?.totalCollected) ||
        (num(r.tenancy.rentAmount) + num(r.existing?.waterBill) +
         num(r.existing?.maintenanceCharge) +
         (r.existing?.ebillAmount != null ? num(r.existing.ebillAmount) : num(r.meterBill)))),
    0
  );

  async function bulkCollect() {
    if (!selectedAptId) return;
    try {
      const { data } = await api.post("/api/owner/rent/bulk-collect", {
        month, year, paymentMode: bulkMode, tenancyIds: null,
      });
      toast.success(`Marked ${data.collected} tenancies as paid (${bulkMode})`);
      setBulkOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk collect failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Rent collection"
        subtitle="Record rent payments and track who has paid for the month"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
            <Button
              variant="gradient"
              onClick={() => setBulkOpen(true)}
              disabled={rows.length === 0 || pending === 0}
            >
              <CheckCircle2 className="h-4 w-4" /> Collect all
            </Button>
          </div>
        }
      />

      {/* Apartment + period selector */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            className="h-10 rounded-lg border bg-background px-3 text-sm min-w-0 flex-1 md:flex-none md:min-w-[240px]"
            value={selectedAptId ?? ""}
            onChange={(e) => setSelectedAptId(e.target.value ? Number(e.target.value) : null)}
          >
            {apartments.length === 0 && <option value="">No apartments yet</option>}
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.city ? ` — ${a.city}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="w-24" />
          <select
            className="h-10 rounded-lg border bg-background px-3 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 mb-4">
        <KpiCard label="Expected" value={fmtINR(expected)} icon={Receipt} tone="info" />
        <KpiCard label="Collected" value={fmtINR(collected)} icon={Wallet} tone="success" />
        <KpiCard label="Pending" value={fmtINR(pending)} icon={Clock} tone={pending > 0 ? "warning" : "success"} />
        <KpiCard label="Active tenants" value={String(rows.length)} icon={Home} tone="default" />
      </div>

      {/* Maintenance coverage (owner only) */}
      {coverage && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Maintenance coverage — {month} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Expected</div>
                <div className="text-base font-semibold">{fmtINR(coverage.expected ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Collected</div>
                <div className="text-base font-semibold">{fmtINR(coverage.collected ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Common-area / maintenance outgo</div>
                <div className="text-base font-semibold">{fmtINR(coverage.outgo ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{coverage.covered ? "Surplus" : "Shortfall"}</div>
                <div className={`text-base font-semibold ${coverage.covered ? "text-emerald-600" : "text-destructive"}`}>
                  {fmtINR(Math.abs(coverage.surplus ?? 0))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {coverage.covered
                ? "Maintenance collected covers this period's common-area and maintenance outgo."
                : "Maintenance collected does not fully cover this period's common-area and maintenance outgo."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rent table */}
      <Card>
        <CardHeader>
          <CardTitle>{month} {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Water</TableHead>
                <TableHead>Maint.</TableHead>
                <TableHead>EBill</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…"
                      : !selectedAptId ? "Select an apartment"
                      : "No active tenants in this apartment"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const ebill = row.existing?.ebillAmount != null
                  ? num(row.existing.ebillAmount)
                  : num(row.meterBill);
                const water = num(row.existing?.waterBill);
                const maint = row.maintFixed != null && row.maintFixed > 0
                  ? row.maintFixed
                  : num(row.existing?.maintenanceCharge);
                const total = num(row.tenancy.rentAmount) + water + maint + ebill;
                const isPaid = row.existing?.paid === true;
                return (
                  <TableRow key={row.tenancy.id} className={isPaid ? "" : ""}>
                    <TableCell className="font-medium">{row.tenancy.tenantName}</TableCell>
                    <TableCell>
                      {row.flat ? (
                        <span className="inline-flex items-center gap-1">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          {row.flat.flatNo}
                        </span>
                      ) : `#${row.tenancy.flatId}`}
                    </TableCell>
                    <TableCell>{fmtINR(row.tenancy.rentAmount)}</TableCell>
                    <TableCell>{water ? fmtINR(water) : "—"}</TableCell>
                    <TableCell>{maint ? fmtINR(maint) : "—"}</TableCell>
                    <TableCell>
                      {fmtINR(ebill)}
                      {row.meterUnits != null && row.existing?.ebillAmount == null && (
                        <span className="block text-xs text-muted-foreground">
                          {row.meterUnits} units
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{fmtINR(total)}</TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge variant="success" className="gap-1">
                          <Check className="h-3 w-3" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                      {isPaid && row.existing?.paymentMode && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          {row.existing.paymentMode} · {row.existing.paidDate}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPaid ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCollectFor(row)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => setCollectFor(row)}
                        >
                          <IndianRupee className="h-3.5 w-3.5" /> Collect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {collectFor && (
        <CollectModal
          row={collectFor}
          month={month}
          year={year}
          maintSuggestion={maintSuggestion}
          onClose={() => setCollectFor(null)}
          onDone={() => { setCollectFor(null); load(); }}
        />
      )}

      {bulkOpen && (
        <BulkCollectModal
          count={rows.filter((r) => !r.existing?.paid).length}
          month={month}
          year={year}
          mode={bulkMode}
          setMode={setBulkMode}
          onClose={() => setBulkOpen(false)}
          onDone={bulkCollect}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Collect modal — per-tenant
   ═══════════════════════════════════════════════════════════════════ */
function CollectModal({
  row, month, year, maintSuggestion, onClose, onDone,
}: { row: Row; month: string; year: number; maintSuggestion?: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    rentAmount: row.existing?.rentAmount != null
      ? String(row.existing.rentAmount)
      : String(row.tenancy.rentAmount ?? ""),
    ebillAmount: row.existing?.ebillAmount != null
      ? String(row.existing.ebillAmount)
      : (row.meterBill != null ? String(row.meterBill) : ""),
    waterBill: row.existing?.waterBill != null ? String(row.existing.waterBill) : "",
    maintenanceCharge: row.maintFixed != null && row.maintFixed > 0
      ? String(row.maintFixed)
      : (row.existing?.maintenanceCharge != null
          ? String(row.existing.maintenanceCharge)
          : (maintSuggestion && maintSuggestion > 0 ? String(maintSuggestion) : "")),
    paymentMode: row.existing?.paymentMode ?? "CASH",
    paidDate: row.existing?.paidDate ?? new Date().toISOString().slice(0, 10),
    remarks: row.existing?.remarks ?? "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rent = num(form.rentAmount);
  const ebill = row.elecPublic ? 0 : num(form.ebillAmount);
  const water = row.waterPublic ? 0 : num(form.waterBill);
  const maint = num(form.maintenanceCharge);
  const total = rent + ebill + water + maint;

  async function submit() {
    setBusy(true);
    try {
      await api.post("/api/owner/rent/collect", {
        tenancyId: row.tenancy.id,
        month,
        year,
        rentAmount: rent,
        ebillAmount: row.elecPublic ? 0 : ebill,
        waterBill: row.waterPublic ? 0 : water,
        maintenanceCharge: maint,
        paymentMode: form.paymentMode,
        paidDate: form.paidDate || null,
        remarks: form.remarks || null,
      });
      toast.success(`Marked ${row.tenancy.tenantName} as paid`);
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to record payment");
    } finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Collect rent</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.tenancy.tenantName}
              {row.flat ? ` · Flat ${row.flat.flatNo}` : ""} · {month} {year}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div>
            <Label>Rent (₹)</Label>
            <Input type="number" value={form.rentAmount}
              onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} />
          </div>
          {(row.flat?.nominalElectricityAmount != null || row.flat?.nominalWaterAmount != null) && (
            <div className="md:col-span-2">
              <Label>Nominal fixed utility (from flat — read only)</Label>
              <div className="h-10 flex items-center gap-3 rounded-lg border bg-muted/40 px-3 text-sm">
                <span>Elec: {row.flat?.nominalElectricityAmount != null ? fmtINR(row.flat.nominalElectricityAmount) : "—"}</span>
                <span className="text-muted-foreground">·</span>
                <span>Water: {row.flat?.nominalWaterAmount != null ? fmtINR(row.flat.nominalWaterAmount) : "—"}</span>
              </div>
            </div>
          )}
          <div>
            <Label>
              Electricity (₹)
              {row.elecPublic ? (
                <span className="ml-1 text-xs text-sky-600 font-normal">
                  public meter — tenant pays directly
                </span>
              ) : row.meterUnits != null && row.existing?.ebillAmount == null && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  from meter · {row.meterUnits} units
                </span>
              )}
            </Label>
            <Input type="number" value={row.elecPublic ? "0" : form.ebillAmount}
              disabled={row.elecPublic}
              onChange={(e) => setForm({ ...form, ebillAmount: e.target.value })} />
          </div>
          <div>
            <Label>
              Water (₹)
              {row.waterPublic && (
                <span className="ml-1 text-xs text-sky-600 font-normal">
                  public meter — tenant pays directly
                </span>
              )}
            </Label>
            <Input type="number" value={row.waterPublic ? "0" : form.waterBill}
              disabled={row.waterPublic}
              onChange={(e) => setForm({ ...form, waterBill: e.target.value })} />
          </div>
          <div>
            <Label>
              Maintenance (₹)
              {row.maintFixed != null && row.maintFixed > 0 && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  fixed for agreement term
                </span>
              )}
            </Label>
            <Input type="number" value={form.maintenanceCharge}
              disabled={row.maintFixed != null && row.maintFixed > 0}
              onChange={(e) => setForm({ ...form, maintenanceCharge: e.target.value })} />
          </div>

          <div>
            <Label>Payment mode</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
            >
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Paid date</Label>
            <Input type="date" value={form.paidDate}
              onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Remarks</Label>
            <Input value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional note" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-4 md:p-5 border-t border-border/60 shrink-0 bg-muted/30">
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">Total collected</div>
            <div className="text-lg font-semibold">{fmtINR(total)}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="gradient" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark as paid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Bulk collect modal
   ═══════════════════════════════════════════════════════════════════ */
function BulkCollectModal({
  count, month, year, mode, setMode, onClose, onDone,
}: {
  count: number; month: string; year: number;
  mode: string; setMode: (m: string) => void;
  onClose: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function submit() {
    setBusy(true);
    try { await onDone(); } finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card rounded-2xl border border-border max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <div>
            <h2 className="text-lg font-semibold">Collect all pending</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {month} {year} · {count} tenant{count === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Every pending tenant will be marked as paid for {month} {year}. Rent amounts come from each tenancy.
            Existing records are updated, not duplicated.
          </p>
          <div>
            <Label>Payment mode</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border/60">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy || count === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm — mark {count} paid
          </Button>
        </div>
      </div>
    </div>
  );
}
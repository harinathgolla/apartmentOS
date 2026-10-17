"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users, Receipt, Zap, Wallet, Plus, RefreshCw, Building2,
  Pencil, Trash2, X, Loader2, MapPin, IndianRupee, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getMe } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

const MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];

type Summary = {
  hasApartment: boolean;
  apartmentId?: number;
  tenants: number;
  collectedThisMonth: number | string;
  pending: number | string;
  unitsThisMonth: number | string;
};

type TrendRow = { month: string; income: number; expense: number };

type Apartment = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  totalFloors?: number | null;
  purchaseValue?: number | null;
  purchaseDate?: string | null;
  loanAmount?: number | null;
  loanEmi?: number | null;
  loanInterestRate?: number | null;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function OwnerOverviewPage() {
  const [me, setMe] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMe(getMe()); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, a] = await Promise.all([
        api.get<Summary>("/api/owner/summary").catch(() => ({ data: null })),
        api.get<TrendRow[]>("/api/owner/trend", { params: { months: 6 } }).catch(() => ({ data: [] })),
        api.get<Apartment[]>("/api/owner/apartments").catch(() => ({ data: [] })),
      ]);
      setSummary(s.data ?? {
        hasApartment: false, tenants: 0,
        collectedThisMonth: 0, pending: 0, unitsThisMonth: 0,
      });
      setTrend(Array.isArray(t.data) ? t.data : []);
      setApartments(Array.isArray(a.data) ? a.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (me) refresh(); }, [me, refresh]);

  const chartData: TrendRow[] = trend.length > 0
    ? trend
    : MONTHS.slice(0, 6).map((m) => ({ month: m.slice(0, 3), income: 0, expense: 0 }));

  const hasApartment = apartments.length > 0;

  return (
    <>
      <PageHeader
        title={`Good evening, ${me?.fullName?.split(" ")[0] ?? ""}`}
        subtitle={
          hasApartment
            ? `Managing ${apartments.length} propert${apartments.length === 1 ? "y" : "ies"}`
            : "Create your first apartment to get started."
        }
        action={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {!hasApartment && <FirstApartmentCard onCreated={refresh} />}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard label="Active tenants"    value={String(summary?.tenants ?? 0)}                            icon={Users}   tone="info" />
        <KpiCard label="Collected (month)" value={fmtINR(num(summary?.collectedThisMonth))}                 icon={Receipt} tone="success" />
        <KpiCard label="Pending rent"      value={fmtINR(num(summary?.pending))}                            icon={Wallet}  tone="warning" />
        <KpiCard label="Units consumed"    value={`${num(summary?.unitsThisMonth).toLocaleString("en-IN")} kWh`} icon={Zap} tone="default" />
      </div>

      {/* Charts */}
      <div className="mt-5 md:mt-6 grid gap-4 lg:grid-cols-3">
        <RevenueChart data={chartData} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Collection rate</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              { label: "On-time", value: 78, tone: "bg-emerald-500" },
              { label: "Late",    value: 15, tone: "bg-amber-500" },
              { label: "Pending", value: 7,  tone: "bg-rose-500" },
            ].map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{r.label}</span>
                  <span className="font-medium">{r.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${r.tone}`} style={{ width: `${r.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity + Apartments */}
      <div className="mt-5 md:mt-6 grid gap-4 lg:grid-cols-2">
        <RecentActivityCard hasApartment={hasApartment} />
        <ApartmentsSection apartments={apartments} onRefresh={refresh} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   First-run onboarding (only shown when there are zero apartments)
   ═══════════════════════════════════════════════════════════════════ */
function FirstApartmentCard({ onCreated }: { onCreated: () => void }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="mb-6 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle>Create your first apartment</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                You need at least one apartment before adding flats, tenants, rent or meter readings.
              </p>
            </div>
            <Button variant="gradient" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Create apartment
            </Button>
          </div>
        </CardHeader>
      </Card>

      {showModal && (
        <ApartmentFormModal
          apartment={null}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); onCreated(); }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Recent activity (unchanged UI, guarded empty state)
   ═══════════════════════════════════════════════════════════════════ */
function RecentActivityCard({ hasApartment }: { hasApartment: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!hasApartment && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Activity will appear here once you create an apartment.
          </p>
        )}
        {hasApartment && [
          { t: "Rent received — Flat 101", a: "₹22,000", when: "2h ago", tone: "success" },
          { t: "Meter reading — Flat 302", a: "264 kWh", when: "5h ago", tone: "info" },
          { t: "Reminder sent — Flat 402", a: "Pending ₹2,340", when: "Yesterday", tone: "warning" },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl grid place-items-center text-xs font-semibold ${
              row.tone === "success" ? "bg-emerald-100 text-emerald-700"
              : row.tone === "info"  ? "bg-indigo-100 text-indigo-700"
              : "bg-amber-100 text-amber-700"
            }`}>{row.a[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{row.t}</div>
              <div className="text-xs text-muted-foreground">{row.when}</div>
            </div>
            <div className="text-sm font-medium shrink-0">{row.a}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Apartments section — dynamic list with add / edit / delete
   ═══════════════════════════════════════════════════════════════════ */
function ApartmentsSection({
  apartments, onRefresh,
}: { apartments: Apartment[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [showModal, setShowModal] = useState(false);

  function openNew() { setEditing(null); setShowModal(true); }
  function openEdit(a: Apartment) { setEditing(a); setShowModal(true); }
  function close() { setShowModal(false); setEditing(null); }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Apartments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {apartments.length === 0
                ? "No apartments yet"
                : `${apartments.length} registered`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {apartments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Click <span className="font-medium">Add</span> to create your first apartment.
            </p>
          )}
          {apartments.map((a) => {
            const location = [a.city, a.state].filter(Boolean).join(", ");
            return (
              <div
                key={a.id}
                className="group flex items-center gap-3 rounded-xl border p-3 hover:bg-accent/40 transition"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    {location ? (
                      <>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{location}</span>
                      </>
                    ) : (
                      <span>No location set</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0">
                  {a.purchaseValue != null && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {Number(a.purchaseValue).toLocaleString("en-IN")}
                    </span>
                  )}
                  {a.purchaseDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {a.purchaseDate}
                    </span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => openEdit(a)}
                  aria-label={`Edit ${a.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {showModal && (
        <ApartmentFormModal apartment={editing} onClose={close} onDone={() => { close(); onRefresh(); }} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Apartment form modal — create and edit share the same component
   ═══════════════════════════════════════════════════════════════════ */
function ApartmentFormModal({
  apartment, onClose, onDone,
}: { apartment: Apartment | null; onClose: () => void; onDone: () => void }) {
  const isEdit = apartment !== null;
  const [form, setForm] = useState({
    name: apartment?.name ?? "",
    address: apartment?.address ?? "",
    city: apartment?.city ?? "",
    state: apartment?.state ?? "",
    pincode: apartment?.pincode ?? "",
    totalFloors: apartment?.totalFloors ?? "",
    purchaseValue: apartment?.purchaseValue ?? "",
    purchaseDate: apartment?.purchaseDate ?? "",
    loanAmount: apartment?.loanAmount ?? "",
    loanEmi: apartment?.loanEmi ?? "",
    loanInterestRate: apartment?.loanInterestRate ?? "",
  });
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  // Lock body scroll while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!form.name.trim()) { toast.error("Apartment name is required"); return; }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address?.toString().trim() || null,
        city: form.city?.toString().trim() || null,
        state: form.state?.toString().trim() || null,
        pincode: form.pincode?.toString().trim() || null,
        totalFloors: form.totalFloors ? Number(form.totalFloors) : null,
        purchaseValue: form.purchaseValue ? Number(form.purchaseValue) : null,
        purchaseDate: form.purchaseDate || null,
        loanAmount: form.loanAmount ? Number(form.loanAmount) : null,
        loanEmi: form.loanEmi ? Number(form.loanEmi) : null,
        loanInterestRate: form.loanInterestRate ? Number(form.loanInterestRate) : null,
      };
      if (isEdit) {
        await api.put(`/api/owner/apartments/${apartment!.id}`, payload);
        toast.success("Apartment updated");
      } else {
        await api.post("/api/owner/apartments", payload);
        toast.success("Apartment created");
      }
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save apartment");
    } finally { setBusy(false); }
  }

  /**
   * Apartment delete is a hard cascade. Attempt without cascade first; if the
   * backend reports dependents (409) we surface the impact and require an
   * explicit second confirmation before sending cascade=true.
   */
  async function remove() {
    if (!apartment) return;
    setBusy(true);
    try {
      await api.delete(`/api/owner/apartments/${apartment.id}`);
      toast.success("Apartment deleted");
      onDone();
      return;
    } catch (e: any) {
      if (e?.response?.status !== 409) {
        toast.error(e?.response?.data?.message ?? "Failed to delete apartment");
        setBusy(false);
        return;
      }
    }

    // Dependent records exist — fetch the impact breakdown for the dialog.
    let impact: Record<string, any> | null = null;
    try {
      impact = (await api.get(`/api/owner/apartments/${apartment.id}/delete-impact`)).data;
    } catch { /* impact is optional context */ }

    const lines = impact
      ? Object.entries(impact)
          .map(([k, raw]) => ({ k, v: typeof raw === "number" ? raw : Number.NaN }))
          .filter((e) => Number.isFinite(e.v) && e.v > 0)
          .map((e) => `${e.v} ${e.k.replace(/([A-Z])/g, " $1").toLowerCase()}`)
      : [];

    const ok = await confirm({
      title: `Delete "${apartment.name}"?`,
      description: lines.length
        ? "Deleting this apartment permanently removes all of the following. This cannot be undone."
        : "This apartment will be permanently deleted. This cannot be undone.",
      details: lines,
      tone: "danger",
      confirmLabel: lines.length ? "Delete everything" : "Delete apartment",
    });
    if (!ok) { setBusy(false); return; }

    try {
      await api.delete(`/api/owner/apartments/${apartment.id}`, { params: { cascade: true } });
      toast.success("Apartment and all dependent records deleted");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete apartment");
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
        className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              {isEdit ? "Edit apartment" : "Add apartment"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? "Update details for this property" : "Fill in what you know — you can edit later"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Apartment name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sai Enclave"
              autoFocus
            />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="12th Main, Indiranagar"
            />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Karnataka" />
          </div>
          <div>
            <Label>Pincode</Label>
            <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="560038" />
          </div>
          <div>
            <Label>Total floors</Label>
            <Input type="number" value={form.totalFloors} onChange={(e) => setForm({ ...form, totalFloors: e.target.value })} placeholder="5" />
          </div>

          <div className="md:col-span-2 pt-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Investment (optional)
            </div>
          </div>

          <div>
            <Label>Purchase value (₹)</Label>
            <Input type="number" value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} placeholder="5000000" />
          </div>
          <div>
            <Label>Purchase date</Label>
            <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div>
            <Label>Loan amount (₹)</Label>
            <Input type="number" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} placeholder="3500000" />
          </div>
          <div>
            <Label>Monthly EMI (₹)</Label>
            <Input type="number" value={form.loanEmi} onChange={(e) => setForm({ ...form, loanEmi: e.target.value })} placeholder="45000" />
          </div>
          <div>
            <Label>Interest rate (%)</Label>
            <Input type="number" step="0.01" value={form.loanInterestRate} onChange={(e) => setForm({ ...form, loanInterestRate: e.target.value })} placeholder="8.5" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <div>
            {isEdit && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={remove}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="gradient" onClick={submit} disabled={busy || !form.name.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create apartment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
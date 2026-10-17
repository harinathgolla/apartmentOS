"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Plus, Mail, Phone, Home, Pencil, X, Loader2, UserCheck, UserX,
  Building2, AlertCircle, Trash2, Layers, Calendar, Repeat,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
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

type Apartment = { id: number; name: string; city?: string };
type Flat = {
  id: number; flatNo: string; floor?: number | null;
  meterSerialNo?: string | null; areaSqft?: number | null;
  bedrooms?: number | null; apartmentId: number;
  nominalElectricityAmount?: number | null; nominalWaterAmount?: number | null;
};
type Tenancy = {
  id: number; flatId: number; apartmentId: number;
  tenantName: string; tenantEmail?: string; tenantPhone?: string;
  rentAmount?: number; securityDeposit?: number;
  agreementStart?: string; agreementEnd?: string;
  frequency?: string; dueDay?: number;
  tenancyType?: string; maintenanceAmount?: number;
  leaseUpfrontAmount?: number; leaseUpfrontCollected?: number; leaseUpfrontNotes?: string | null;
  active: boolean;
};
type MeterCfg = {
  id: number; flatId?: number | null; label?: string | null; serialNo?: string | null;
  utilityType: "ELECTRICITY" | "WATER"; scope: "PUBLIC" | "PRIVATE";
};
type Filter = "active" | "inactive" | "all";

const FREQUENCIES = [
  { value: "MONTHLY",   label: "Monthly" },
  { value: "WEEKLY",    label: "Weekly" },
  { value: "DAILY",     label: "Daily" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY",    label: "Yearly" },
];

export default function TenantsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<Tenancy[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [meters, setMeters] = useState<MeterCfg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [tenantModal, setTenantModal] = useState<
    { mode: "create" } | { mode: "edit"; tenant: Tenancy } | null
  >(null);
  const [flatModal, setFlatModal] = useState<
    { mode: "create" } | { mode: "edit"; flat: Flat } | null
  >(null);
  const [showFlats, setShowFlats] = useState(false);

  useEffect(() => {
    api.get<Apartment[]>("/api/owner/apartments")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setApartments(list);
        if (list.length > 0 && selectedAptId === null) setSelectedAptId(list[0].id);
      })
      .catch(() => setApartments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!selectedAptId) {
      setTenants([]);
      setFlats([]);
      setMeters([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [t, f, m] = await Promise.all([
        api.get<Tenancy[]>("/api/owner/tenants", {
          params: { apartmentId: selectedAptId, all: filter !== "active" },
        }),
        api.get<Flat[]>("/api/owner/flats", {
          params: { apartmentId: selectedAptId },
        }),
        api.get<MeterCfg[]>("/api/owner/meters", {
          params: { apartmentId: selectedAptId },
        }).catch(() => ({ data: [] })),
      ]);
      let rows = Array.isArray(t.data) ? t.data : [];
      if (filter === "active") rows = rows.filter((r) => r.active);
      if (filter === "inactive") rows = rows.filter((r) => !r.active);
      setTenants(rows);
      setFlats(Array.isArray(f.data) ? f.data : []);
      setMeters(Array.isArray(m.data) ? m.data : []);
    } catch {
      setTenants([]);
      setFlats([]);
      setMeters([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAptId, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (flats.length === 0 && selectedAptId) setShowFlats(true);
  }, [flats.length, selectedAptId]);

  const flatsById = new Map(flats.map((f) => [f.id, f]));

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle={
          selectedAptId
            ? `${tenants.length} ${filter === "all" ? "total" : filter} tenant${tenants.length === 1 ? "" : "s"}`
            : "Select an apartment"
        }
        action={
          <Button
            variant="gradient"
            onClick={() => setTenantModal({ mode: "create" })}
            disabled={!selectedAptId || flats.length === 0}
            title={flats.length === 0 ? "Add flats to this apartment first" : undefined}
          >
            <Plus className="h-4 w-4" /> Onboard tenant
          </Button>
        }
      />

      {/* Apartment selector + filter tabs */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            className="h-10 rounded-lg border bg-background px-3 text-sm min-w-0 flex-1 md:flex-none md:min-w-[240px]"
            value={selectedAptId ?? ""}
            onChange={(e) =>
              setSelectedAptId(e.target.value ? Number(e.target.value) : null)
            }
          >
            {apartments.length === 0 && <option value="">No apartments yet</option>}
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.city ? ` — ${a.city}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex h-10 items-center rounded-xl bg-muted p-1 text-muted-foreground">
          {(["active", "inactive", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Flats section — collapsible */}
      {selectedAptId && (
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between">
            <button
              className="flex items-center gap-3 text-left flex-1"
              onClick={() => setShowFlats((s) => !s)}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Flats in this apartment
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({flats.length})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {flats.length === 0
                    ? "Add at least one flat to onboard tenants"
                    : "Click to " + (showFlats ? "collapse" : "expand")}
                </p>
              </div>
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowFlats(true);
                setFlatModal({ mode: "create" });
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add flat
            </Button>
          </CardHeader>

          {showFlats && flats.length > 0 && (
            <CardContent className="pt-0">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {flats.map((f) => {
                  const occupied = tenants.some(
                    (t) => t.flatId === f.id && t.active
                  );
                  return (
                    <div
                      key={f.id}
                      className="group flex items-center gap-3 rounded-xl border p-3 hover:bg-accent/40 transition"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-sm font-semibold">
                        {f.flatNo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {f.floor != null ? `Floor ${f.floor}` : "Flat"}
                          {f.bedrooms ? ` · ${f.bedrooms} BHK` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {f.meterSerialNo ? `Meter ${f.meterSerialNo}` : "No meter"}
                          {f.areaSqft ? ` · ${f.areaSqft} sqft` : ""}
                        </div>
                      </div>
                      <Badge
                        variant={occupied ? "info" : "secondary"}
                        className="shrink-0"
                      >
                        {occupied ? "Occupied" : "Vacant"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() => {
                          setShowFlats(true);
                          setFlatModal({ mode: "edit", flat: f });
                        }}
                        aria-label={`Edit ${f.flatNo}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}

          {showFlats && flats.length === 0 && (
            <CardContent className="pt-0">
              <div className="flex items-start gap-3 rounded-xl border-2 border-dashed border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/10 p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm flex-1">
                  <div className="font-medium text-amber-800 dark:text-amber-300">
                    No flats yet
                  </div>
                  <div className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Add your first flat (e.g. "101", "A-201") to start onboarding tenants.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => setFlatModal({ mode: "create" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add first flat
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Tenants table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "active"
              ? "Active tenants"
              : filter === "inactive"
              ? "Past tenants"
              : "All tenants"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    {loading
                      ? "Loading…"
                      : !selectedAptId
                      ? "Select an apartment to view tenants"
                      : flats.length === 0
                      ? "Add a flat above, then onboard a tenant"
                      : filter === "inactive"
                      ? "No past tenants yet"
                      : "No tenants yet — click Onboard tenant to add one"}
                  </TableCell>
                </TableRow>
              )}
              {tenants.map((t) => {
                const flat = flatsById.get(t.flatId);
                return (
                  <TableRow
                    key={t.id}
                    className={t.active ? "" : "opacity-60"}
                  >
                    <TableCell className="font-medium">{t.tenantName}</TableCell>
                    <TableCell>
                      {flat ? (
                        <span className="inline-flex items-center gap-1">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          {flat.flatNo}
                        </span>
                      ) : (
                        `#${t.flatId}`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.tenantEmail && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" /> {t.tenantEmail}
                        </div>
                      )}
                      {t.tenantPhone && (
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <Phone className="h-3 w-3" /> {t.tenantPhone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {fmtINR(num(t.rentAmount) + num(t.maintenanceAmount))}
                      </div>
                      {num(t.maintenanceAmount) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          incl. {fmtINR(t.maintenanceAmount)} maint.
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Repeat className="h-3 w-3 text-muted-foreground" />
                        <span className="capitalize">
                          {(t.frequency ?? "MONTHLY").toLowerCase()}
                        </span>
                        {t.dueDay != null && (
                          <span className="text-muted-foreground">
                            · day {t.dueDay}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.active ? "success" : "secondary"}>
                        {t.active ? "Active" : "Vacated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            setTenantModal({ mode: "edit", tenant: t })
                          }
                          aria-label={`Edit ${t.tenantName}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {t.active ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                            onClick={() => markInactive(t, load)}
                            title="Mark as vacated"
                            aria-label="Mark as vacated"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => markActive(t, load)}
                            title="Reactivate tenant"
                            aria-label="Reactivate tenant"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {tenantModal && selectedAptId && (
        <TenantFormModal
          mode={tenantModal.mode}
          apartmentId={selectedAptId}
          apartmentName={apartments.find((a) => a.id === selectedAptId)?.name}
          flats={flats}
          meters={meters}
          tenant={tenantModal.mode === "edit" ? tenantModal.tenant : null}
          onClose={() => setTenantModal(null)}
          onDone={() => {
            setTenantModal(null);
            load();
          }}
        />
      )}

      {flatModal && selectedAptId && (
        <FlatFormModal
          mode={flatModal.mode}
          apartmentId={selectedAptId}
          flat={flatModal.mode === "edit" ? flatModal.flat : null}
          onClose={() => setFlatModal(null)}
          onDone={() => {
            setFlatModal(null);
            load();
          }}
        />
      )}
    </>
  );
}

/* ─────────── helpers ─────────── */
const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

async function markInactive(t: Tenancy, reload: () => void) {
  if (
    !window.confirm(
      `Mark ${t.tenantName} as vacated? They'll move to the "Past tenants" tab.`
    )
  )
    return;
  try {
    await api.post(`/api/owner/tenants/${t.id}/deactivate`);
    toast.success(`${t.tenantName} marked as vacated`);
    reload();
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "Failed to deactivate");
  }
}

async function markActive(t: Tenancy, reload: () => void) {
  try {
    await api.post(`/api/owner/tenants/${t.id}/reactivate`);
    toast.success(`${t.tenantName} reactivated`);
    reload();
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "Failed to reactivate");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   FLAT FORM MODAL
   ═══════════════════════════════════════════════════════════════════ */
function FlatFormModal({
  mode, apartmentId, flat, onClose, onDone,
}: {
  mode: "create" | "edit";
  apartmentId: number;
  flat: Flat | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = mode === "edit" && flat;
  const [form, setForm] = useState({
    flatNo: flat?.flatNo ?? "",
    floor: flat?.floor != null ? String(flat.floor) : "",
    meterSerialNo: flat?.meterSerialNo ?? "",
    areaSqft: flat?.areaSqft != null ? String(flat.areaSqft) : "",
    bedrooms: flat?.bedrooms != null ? String(flat.bedrooms) : "",
    nominalElectricityAmount: flat?.nominalElectricityAmount != null ? String(flat.nominalElectricityAmount) : "",
    nominalWaterAmount: flat?.nominalWaterAmount != null ? String(flat.nominalWaterAmount) : "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!form.flatNo.trim()) {
      toast.error("Flat number is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        flatNo: form.flatNo.trim(),
        floor: form.floor ? Number(form.floor) : null,
        meterSerialNo: form.meterSerialNo.trim() || null,
        areaSqft: form.areaSqft ? Number(form.areaSqft) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        nominalElectricityAmount: form.nominalElectricityAmount ? Number(form.nominalElectricityAmount) : null,
        nominalWaterAmount: form.nominalWaterAmount ? Number(form.nominalWaterAmount) : null,
      };
      if (isEdit && flat) {
        toast.info("Editing flats is coming next — delete and re-add for now");
        onClose();
        return;
      }
      await api.post(`/api/owner/apartments/${apartmentId}/flats`, payload);
      toast.success(`Flat ${form.flatNo} added`);
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save flat");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!flat) return;
    if (!window.confirm(`Delete flat "${flat.flatNo}"? This cannot be undone.`))
      return;
    toast.info("Flat deletion endpoint coming next");
    onClose();
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
            <h2 className="text-base md:text-lg font-semibold">
              {isEdit ? "Edit flat" : "Add flat"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Update details for this flat"
                : "Add a flat to this apartment"}
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

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Flat number *</Label>
            <Input
              value={form.flatNo}
              onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
              placeholder="101"
              autoFocus
            />
          </div>
          <div>
            <Label>Floor</Label>
            <Input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              placeholder="1"
            />
          </div>
          <div>
            <Label>Bedrooms</Label>
            <Input
              type="number"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              placeholder="2"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Meter serial number</Label>
            <Input
              value={form.meterSerialNo}
              onChange={(e) =>
                setForm({ ...form, meterSerialNo: e.target.value })
              }
              placeholder="119926"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Area (sqft)</Label>
            <Input
              type="number"
              value={form.areaSqft}
              onChange={(e) => setForm({ ...form, areaSqft: e.target.value })}
              placeholder="1200"
            />
          </div>
          <div>
            <Label>Nominal electricity (Rs / month)</Label>
            <Input
              type="number"
              value={form.nominalElectricityAmount}
              onChange={(e) => setForm({ ...form, nominalElectricityAmount: e.target.value })}
              placeholder="For flats without a meter"
            />
          </div>
          <div>
            <Label>Nominal water (Rs / month)</Label>
            <Input
              type="number"
              value={form.nominalWaterAmount}
              onChange={(e) => setForm({ ...form, nominalWaterAmount: e.target.value })}
              placeholder="For flats without a meter"
            />
          </div>
        </div>

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
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={submit}
              disabled={busy || !form.flatNo.trim()}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add flat"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TENANT FORM MODAL — with frequency + due day
   ═══════════════════════════════════════════════════════════════════ */
function TenantFormModal({
  mode, apartmentId, apartmentName, flats, meters, tenant, onClose, onDone,
}: {
  mode: "create" | "edit";
  apartmentId: number;
  apartmentName?: string;
  flats: Flat[];
  meters: MeterCfg[];
  tenant: Tenancy | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = mode === "edit" && tenant;
  const [form, setForm] = useState({
    tenantName: tenant?.tenantName ?? "",
    tenantEmail: tenant?.tenantEmail ?? "",
    tenantPhone: tenant?.tenantPhone ?? "",
    flatId: tenant?.flatId ? String(tenant.flatId) : "",
    rentAmount: tenant?.rentAmount != null ? String(tenant.rentAmount) : "",
    securityDeposit:
      tenant?.securityDeposit != null ? String(tenant.securityDeposit) : "",
    startDate:
      tenant?.agreementStart ?? new Date().toISOString().slice(0, 10),
    endDate: tenant?.agreementEnd ?? "",
    frequency: tenant?.frequency ?? "MONTHLY",
    dueDay: tenant?.dueDay != null ? String(tenant.dueDay) : "5",
    tenancyType: tenant?.tenancyType ?? "RENTAL",
    maintenanceAmount: tenant?.maintenanceAmount != null ? String(tenant.maintenanceAmount) : "",
    leaseUpfrontAmount: tenant?.leaseUpfrontAmount != null ? String(tenant.leaseUpfrontAmount) : "",
    leaseUpfrontCollected: tenant?.leaseUpfrontCollected != null ? String(tenant.leaseUpfrontCollected) : "",
    leaseUpfrontNotes: tenant?.leaseUpfrontNotes ?? "",
  });

  const selectedFlat = flats.find((f) => String(f.id) === form.flatId);
  const flatMeters = meters.filter((m) => m.flatId === selectedFlat?.id);
  const selectedMeter = flatMeters[0];
  const isLease = form.tenancyType === "LEASE";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!form.tenantName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!isEdit && !form.flatId) {
      toast.error("Select a flat");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && tenant) {
        await api.put(`/api/owner/tenants/${tenant.id}`, {
          tenantName: form.tenantName.trim(),
          tenantEmail: form.tenantEmail.trim() || null,
          tenantPhone: form.tenantPhone.trim() || null,
          rentAmount: form.rentAmount ? Number(form.rentAmount) : null,
          securityDeposit: form.securityDeposit
            ? Number(form.securityDeposit)
            : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          active: tenant.active,
          frequency: form.frequency,
          dueDay: form.dueDay ? Number(form.dueDay) : 5,
          tenancyType: form.tenancyType,
          maintenanceAmount: form.maintenanceAmount ? Number(form.maintenanceAmount) : null,
          leaseUpfrontAmount: form.leaseUpfrontAmount ? Number(form.leaseUpfrontAmount) : null,
          leaseUpfrontCollected: form.leaseUpfrontCollected ? Number(form.leaseUpfrontCollected) : null,
          leaseUpfrontNotes: form.leaseUpfrontNotes.trim() || null,
        });
        toast.success("Tenant updated");
      } else {
        await api.post("/api/owner/tenants", {
          tenantName: form.tenantName.trim(),
          tenantEmail: form.tenantEmail.trim() || null,
          tenantPhone: form.tenantPhone.trim() || null,
          flatId: Number(form.flatId),
          rentAmount: form.rentAmount ? Number(form.rentAmount) : null,
          securityDeposit: form.securityDeposit
            ? Number(form.securityDeposit)
            : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          frequency: form.frequency,
          dueDay: form.dueDay ? Number(form.dueDay) : 5,
          tenancyType: form.tenancyType,
          maintenanceAmount: form.maintenanceAmount ? Number(form.maintenanceAmount) : null,
          leaseUpfrontAmount: form.leaseUpfrontAmount ? Number(form.leaseUpfrontAmount) : null,
          leaseUpfrontCollected: form.leaseUpfrontCollected ? Number(form.leaseUpfrontCollected) : null,
          leaseUpfrontNotes: form.leaseUpfrontNotes.trim() || null,
        });
        toast.success("Tenant onboarded");
      }
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save tenant");
    } finally {
      setBusy(false);
    }
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
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              {isEdit ? "Edit tenant" : "Onboard a new tenant"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Update tenant details for this apartment"
                : "Add a tenant to a flat in this apartment"}
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

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          {/* ── Basics ── */}
          <div className="md:col-span-2">
            <Label>Full name *</Label>
            <Input
              value={form.tenantName}
              onChange={(e) =>
                setForm({ ...form, tenantName: e.target.value })
              }
              placeholder="Ravi Kumar"
              autoFocus
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.tenantEmail}
              onChange={(e) =>
                setForm({ ...form, tenantEmail: e.target.value })
              }
              placeholder="tenant@example.com"
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                A tenant login is created with default password{" "}
                <code>tenant@123</code>.
              </p>
            )}
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={form.tenantPhone}
              onChange={(e) =>
                setForm({ ...form, tenantPhone: e.target.value })
              }
              placeholder="+91-9000000001"
            />
          </div>

          {/* ── Flat ── */}
          <div className="md:col-span-2">
            <Label>{isEdit ? "Flat (cannot be changed)" : "Flat *"}</Label>
            {isEdit ? (
              <div className="h-10 flex items-center rounded-lg border bg-muted/40 px-3 text-sm">
                <Home className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                {flats.find((f) => f.id === tenant?.flatId)?.flatNo ??
                  `#${tenant?.flatId}`}
              </div>
            ) : (
              <select
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                value={form.flatId}
                onChange={(e) =>
                  setForm({ ...form, flatId: e.target.value })
                }
              >
                <option value="">
                  Select flat{apartmentName ? ` in ${apartmentName}` : ""}
                </option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {apartmentName ? `${apartmentName} · ` : ""}
                    {f.flatNo}
                    {f.floor != null ? ` — Floor ${f.floor}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── Meter + nominal (read-only, from flat) ── */}
          {selectedFlat && (
            <>
              <div>
                <Label>Meter serial no.</Label>
                <div className="h-10 flex items-center rounded-lg border bg-muted/40 px-3 text-sm">
                  {selectedMeter?.serialNo || selectedFlat.meterSerialNo || "No meter assigned"}
                  {selectedMeter && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({selectedMeter.utilityType.toLowerCase()})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned to this flat in apartment setup.
                </p>
              </div>
              <div>
                <Label>Nominal utility (from flat)</Label>
                <div className="h-10 flex items-center gap-3 rounded-lg border bg-muted/40 px-3 text-sm">
                  <span>Elec: {selectedFlat.nominalElectricityAmount != null ? fmtINR(selectedFlat.nominalElectricityAmount) : "—"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>Water: {selectedFlat.nominalWaterAmount != null ? fmtINR(selectedFlat.nominalWaterAmount) : "—"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fixed monthly charge when the flat has no meter.
                </p>
              </div>
            </>
          )}

          {/* ── Rent terms ── */}
          <div className="md:col-span-2 pt-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Repeat className="h-3 w-3" /> Rent terms
            </div>
          </div>

          <div>
            <Label>Monthly rent (₹)</Label>
            <Input
              type="number"
              value={form.rentAmount}
              onChange={(e) =>
                setForm({ ...form, rentAmount: e.target.value })
              }
              placeholder="22000"
            />
          </div>

          <div>
            <Label>Security deposit (₹)</Label>
            <Input
              type="number"
              value={form.securityDeposit}
              onChange={(e) =>
                setForm({ ...form, securityDeposit: e.target.value })
              }
              placeholder="44000"
            />
          </div>

          <div>
            <Label>Rent frequency</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={form.frequency}
              onChange={(e) =>
                setForm({ ...form, frequency: e.target.value })
              }
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Due day of month</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.dueDay}
              onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rent reminders fire on this day each month.
            </p>
          </div>

          <div>
            <Label>Tenancy type</Label>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.tenancyType}
              onChange={(e) => setForm({ ...form, tenancyType: e.target.value })}
            >
              <option value="RENTAL">Rental (monthly, ~11 months)</option>
              <option value="LEASE">Lease (fixed term)</option>
            </select>
          </div>

          <div>
            <Label>Maintenance amount (Rs / month)</Label>
            <Input
              type="number"
              value={form.maintenanceAmount}
              onChange={(e) => setForm({ ...form, maintenanceAmount: e.target.value })}
              placeholder="1500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Stated separately in the agreement; collected monthly.
            </p>
          </div>

          {/* ── Lease upfront (one-time liability, not rent) ── */}
          {isLease && (
            <>
              <div className="md:col-span-2 pt-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Lease advance (one-time, refundable — not rent)
                </div>
              </div>
              <div>
                <Label>Upfront amount (₹)</Label>
                <Input type="number" value={form.leaseUpfrontAmount}
                  onChange={(e) => setForm({ ...form, leaseUpfrontAmount: e.target.value })}
                  placeholder="e.g. 3-month advance" />
              </div>
              <div>
                <Label>Already collected (₹)</Label>
                <Input type="number" value={form.leaseUpfrontCollected}
                  onChange={(e) => setForm({ ...form, leaseUpfrontCollected: e.target.value })}
                  placeholder="0" />
              </div>
              <div className="md:col-span-2">
                <Label>Label / notes</Label>
                <Input value={form.leaseUpfrontNotes}
                  onChange={(e) => setForm({ ...form, leaseUpfrontNotes: e.target.value })}
                  placeholder="3-month lease advance" />
                <p className="text-xs text-muted-foreground mt-1">
                  Tracked as a refundable liability on the Liabilities page — never counted as rent.
                </p>
              </div>
            </>
          )}

          {/* ── Agreement dates ── */}
          <div className="md:col-span-2 pt-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Agreement
            </div>
          </div>

          <div>
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>

          <div>
            <Label>End date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm({ ...form, endDate: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={submit}
            disabled={busy || !form.tenantName.trim()}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Onboard tenant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
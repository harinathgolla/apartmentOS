"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Plus, Gauge, Loader2, X, Trash2, Pencil, Zap, Droplets, Building2,
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
import { toast } from "sonner";

type Apartment = { id: number; name: string; city?: string };
type Flat = { id: number; flatNo: string; apartmentId: number; floor?: number };
type Meter = {
  id: number; apartmentId: number; flatId?: number | null;
  label?: string; serialNo?: string;
  utilityType: "ELECTRICITY" | "WATER";
  scope: "PUBLIC" | "PRIVATE";
  ratePerUnit?: number; active: boolean;
};

export default function MetersPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; meter: Meter } | null>(null);

  useEffect(() => {
    api.get<Apartment[]>("/api/owner/apartments")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setApartments(list);
        if (list.length > 0) setSelectedAptId(list[0].id);
      })
      .catch(() => setApartments([]));
  }, []);

  const load = useCallback(async () => {
    if (!selectedAptId) { setMeters([]); setFlats([]); return; }
    setLoading(true);
    try {
      const [m, f] = await Promise.all([
        api.get<Meter[]>("/api/owner/meters", { params: { apartmentId: selectedAptId } }),
        api.get<Flat[]>("/api/owner/flats", { params: { apartmentId: selectedAptId } }),
      ]);
      setMeters(Array.isArray(m.data) ? m.data : []);
      setFlats(Array.isArray(f.data) ? f.data : []);
    } catch {
      setMeters([]); setFlats([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAptId]);

  useEffect(() => { load(); }, [load]);

  const flatsById = new Map(flats.map((f) => [f.id, f]));

  async function remove(m: Meter) {
    if (!selectedAptId) return;
    if (!window.confirm(`Delete meter "${m.label ?? m.serialNo ?? m.id}"?`)) return;
    try {
      await api.delete(`/api/owner/meters/${m.id}`, { params: { apartmentId: selectedAptId } });
      toast.success("Meter deleted");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete meter");
    }
  }

  return (
    <>
      <PageHeader
        title="Meters"
        subtitle="Configure electricity and water meters per flat — public (tenant pays) or private (owner collects)"
        action={
          <Button
            variant="gradient"
            onClick={() => setModal({ mode: "create" })}
            disabled={!selectedAptId || flats.length === 0}
            title={flats.length === 0 ? "Add flats first" : undefined}
          >
            <Plus className="h-4 w-4" /> Add meter
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <select
          className="h-10 rounded-lg border bg-background px-3 text-sm min-w-[240px]"
          value={selectedAptId ?? ""}
          onChange={(e) => setSelectedAptId(e.target.value ? Number(e.target.value) : null)}
        >
          {apartments.length === 0 && <option value="">No apartments yet</option>}
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>{a.name}{a.city ? ` — ${a.city}` : ""}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Meters ({meters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Serial / Label</TableHead>
                <TableHead>Rate / unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…"
                      : !selectedAptId ? "Select an apartment"
                      : flats.length === 0 ? "Add flats first, then configure meters"
                      : "No meters yet — click Add meter"}
                  </TableCell>
                </TableRow>
              )}
              {meters.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.flatId ? (flatsById.get(m.flatId)?.flatNo ?? `#${m.flatId}`) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      {m.utilityType === "ELECTRICITY"
                        ? <Zap className="h-3.5 w-3.5 text-amber-500" />
                        : <Droplets className="h-3.5 w-3.5 text-sky-500" />}
                      {m.utilityType === "ELECTRICITY" ? "Electricity" : "Water"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.scope === "PUBLIC" ? "info" : "secondary"}>
                      {m.scope === "PUBLIC" ? "Public (tenant pays)" : "Private (owner collects)"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.serialNo || m.label || "—"}
                  </TableCell>
                  <TableCell>{m.ratePerUnit != null ? `₹${m.ratePerUnit}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.active ? "success" : "secondary"}>
                      {m.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => setModal({ mode: "edit", meter: m })}
                        aria-label="Edit meter">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(m)} aria-label="Delete meter">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal && selectedAptId && (
        <MeterFormModal
          mode={modal.mode}
          apartmentId={selectedAptId}
          flats={flats}
          meter={modal.mode === "edit" ? modal.meter : null}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

/* meter form modal */
function MeterFormModal({
  mode, apartmentId, flats, meter, onClose, onDone,
}: {
  mode: "create" | "edit";
  apartmentId: number;
  flats: Flat[];
  meter: Meter | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = mode === "edit" && meter;
  const [form, setForm] = useState({
    flatId: meter?.flatId ? String(meter.flatId) : (flats[0]?.id ? String(flats[0].id) : ""),
    utilityType: meter?.utilityType ?? "ELECTRICITY",
    scope: meter?.scope ?? "PRIVATE",
    label: meter?.label ?? "",
    serialNo: meter?.serialNo ?? "",
    ratePerUnit: meter?.ratePerUnit != null ? String(meter.ratePerUnit) : "",
    active: meter?.active ?? true,
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

  async function submit() {
    if (!form.flatId) { toast.error("Select a flat"); return; }
    setBusy(true);
    try {
      const payload = {
        flatId: Number(form.flatId),
        utilityType: form.utilityType,
        scope: form.scope,
        label: form.label.trim() || null,
        serialNo: form.serialNo.trim() || null,
        ratePerUnit: form.ratePerUnit ? Number(form.ratePerUnit) : null,
        active: form.active,
      };
      if (isEdit && meter) {
        await api.put(`/api/owner/meters/${meter.id}`, payload, { params: { apartmentId } });
        toast.success("Meter updated");
      } else {
        await api.post("/api/owner/meters", payload, { params: { apartmentId } });
        toast.success("Meter added");
      }
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save meter");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">{isEdit ? "Edit meter" : "Add meter"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">One meter per flat per utility</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Flat *</Label>
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.flatId} onChange={(e) => setForm({ ...form, flatId: e.target.value })}>
              <option value="">Select flat</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNo}{f.floor != null ? ` (Floor ${f.floor})` : ""}</option>)}
            </select>
          </div>
          <div>
            <Label>Utility *</Label>
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.utilityType} onChange={(e) => setForm({ ...form, utilityType: e.target.value as any })}>
              <option value="ELECTRICITY">Electricity</option>
              <option value="WATER">Water</option>
            </select>
          </div>
          <div>
            <Label>Scope *</Label>
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as any })}>
              <option value="PRIVATE">Private — owner collects</option>
              <option value="PUBLIC">Public — tenant pays directly</option>
            </select>
          </div>
          <div>
            <Label>Serial number</Label>
            <Input value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="119926" />
          </div>
          <div>
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Flat 101 meter" />
          </div>
          <div>
            <Label>Rate per unit (Rs)</Label>
            <Input type="number" value={form.ratePerUnit}
              onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })} placeholder="8" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" className="h-4 w-4" checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <Label>Active</Label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy || !form.flatId}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add meter"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getMe } from "@/lib/api";
import { toast } from "sonner";

/**
 * Lightweight flat create/edit popup that can be opened from ANY owner page
 * (electricity, utilities, rent, tenants, …) without navigating away.
 *
 * It talks to the same endpoints as the Flats section on the Tenants page:
 *   POST   /api/owner/apartments/{apartmentId}/flats
 *   PUT    /api/owner/apartments/{apartmentId}/flats/{flatId}
 *
 * The apartment is resolved from the flat when editing, otherwise from the
 * caller-provided `apartmentId` (falls back to the logged-in user's apartment).
 */
export type QuickFlat = {
  id: number;
  flatNo: string;
  apartmentId: number;
  floor?: number | null;
  bedrooms?: number | null;
  areaSqft?: number | null;
  meterSerialNo?: string | null;
  nominalElectricityAmount?: number | null;
  nominalWaterAmount?: number | null;
};

export function QuickFlatModal({
  flat,
  apartmentId,
  onClose,
  onDone,
}: {
  /** Pass a flat to edit; pass null to create. */
  flat: QuickFlat | null;
  /** Required when creating; ignored when editing (derived from the flat). */
  apartmentId?: number | null;
  onClose: () => void;
  onDone: (saved?: QuickFlat) => void;
}) {
  const isEdit = flat != null;
  const [form, setForm] = useState({
    flatNo: flat?.flatNo ?? "",
    floor: flat?.floor != null ? String(flat.floor) : "",
    bedrooms: flat?.bedrooms != null ? String(flat.bedrooms) : "",
    areaSqft: flat?.areaSqft != null ? String(flat.areaSqft) : "",
    meterSerialNo: flat?.meterSerialNo ?? "",
    nominalElectricityAmount: flat?.nominalElectricityAmount != null ? String(flat.nominalElectricityAmount) : "",
    nominalWaterAmount: flat?.nominalWaterAmount != null ? String(flat.nominalWaterAmount) : "",
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
    if (!form.flatNo.trim()) { toast.error("Flat number is required"); return; }
    const aptId = isEdit ? flat!.apartmentId : apartmentId ?? getMe()?.apartmentId;
    if (!aptId) { toast.error("No apartment selected"); return; }
    setBusy(true);
    try {
      const payload = {
        flatNo: form.flatNo.trim(),
        floor: form.floor ? Number(form.floor) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        areaSqft: form.areaSqft ? Number(form.areaSqft) : null,
        meterSerialNo: form.meterSerialNo.trim() || null,
        nominalElectricityAmount: form.nominalElectricityAmount ? Number(form.nominalElectricityAmount) : null,
        nominalWaterAmount: form.nominalWaterAmount ? Number(form.nominalWaterAmount) : null,
      };
      let saved: QuickFlat;
      if (isEdit) {
        const r = await api.put<QuickFlat>(
          `/api/owner/apartments/${aptId}/flats/${flat!.id}`, payload
        );
        saved = r.data;
        toast.success(`Flat ${payload.flatNo} updated`);
      } else {
        const r = await api.post<QuickFlat>(
          `/api/owner/apartments/${aptId}/flats`, payload
        );
        saved = r.data;
        toast.success(`Flat ${payload.flatNo} added`);
      }
      onDone(saved);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save flat");
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
        className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              {isEdit ? "Edit flat" : "Add flat"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? "Update this flat in place" : "Add a flat without leaving this page"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Flat number *</Label>
            <Input value={form.flatNo}
              onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
              placeholder="101" autoFocus />
          </div>
          <div>
            <Label>Floor</Label>
            <Input type="number" value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1" />
          </div>
          <div>
            <Label>Bedrooms</Label>
            <Input type="number" value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} placeholder="2" />
          </div>
          <div>
            <Label>Area (sqft)</Label>
            <Input type="number" value={form.areaSqft}
              onChange={(e) => setForm({ ...form, areaSqft: e.target.value })} placeholder="1200" />
          </div>
          <div>
            <Label>Meter serial no.</Label>
            <Input value={form.meterSerialNo}
              onChange={(e) => setForm({ ...form, meterSerialNo: e.target.value })} placeholder="119926" />
          </div>
          <div>
            <Label>Nominal electricity (₹ / month)</Label>
            <Input type="number" value={form.nominalElectricityAmount}
              onChange={(e) => setForm({ ...form, nominalElectricityAmount: e.target.value })}
              placeholder="Blank = metered" />
          </div>
          <div>
            <Label>Nominal water (₹ / month)</Label>
            <Input type="number" value={form.nominalWaterAmount}
              onChange={(e) => setForm({ ...form, nominalWaterAmount: e.target.value })}
              placeholder="Blank = metered" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy || !form.flatNo.trim()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add flat"}
          </Button>
        </div>
      </div>
    </div>
  );
}

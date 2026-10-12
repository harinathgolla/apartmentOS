"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";

export type Flat = { id: number; flatNo: string; apartmentId: number; meterSerialNo?: string | null };
export type MeterRow = {
  id?: number;
  flatId: number;
  year: number;
  month: string;
  previousReading?: number | string | null;
  presentReading?: number | string | null;
  ratePerUnit?: number | string | null;
  paid?: boolean;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Add / edit an electricity meter reading for a flat.
 * Computes usage = present - previous and bill = usage x rate live.
 */
export function MeterReadingModal({
  flats,
  year,
  month,
  existing,
  endpoint = "/api/owner/meter",
  title = "meter reading",
  onClose,
  onDone,
}: {
  flats: Flat[];
  year: number;
  month: string;
  existing?: MeterRow | null;
  endpoint?: string;
  title?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<{
    flatId: number | "";
    previousReading: string;
    presentReading: string;
    ratePerUnit: string;
    paid: boolean;
  }>({
    flatId: existing?.flatId ?? (flats[0]?.id ?? ""),
    previousReading: existing?.previousReading != null ? String(existing.previousReading) : "",
    presentReading: existing?.presentReading != null ? String(existing.presentReading) : "",
    ratePerUnit: existing?.ratePerUnit != null ? String(existing.ratePerUnit) : "",
    paid: existing?.paid ?? false,
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

  const usage = num(form.presentReading) - num(form.previousReading);
  const bill = usage * num(form.ratePerUnit);
  const isEdit = existing?.id != null;

  async function submit() {
    if (!form.flatId) { toast.error("Select a flat"); return; }
    setBusy(true);
    try {
      await api.post(endpoint, {
        flatId: Number(form.flatId),
        year,
        month,
        previousReading: num(form.previousReading),
        presentReading: num(form.presentReading),
        ratePerUnit: num(form.ratePerUnit),
        paid: form.paid,
      });
      toast.success(isEdit ? "Reading updated" : "Reading saved");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save reading");
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
            <h2 className="text-base md:text-lg font-semibold">{isEdit ? `Edit ${title}` : `Add ${title}`}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{month} {year}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Flat</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={form.flatId}
              disabled={isEdit}
              onChange={(e) => setForm({ ...form, flatId: e.target.value === "" ? "" : Number(e.target.value) })}
            >
              {flats.length === 0 && <option value="">No flats</option>}
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flatNo}{f.meterSerialNo ? ` · meter ${f.meterSerialNo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Previous reading</Label>
            <Input type="number" value={form.previousReading}
              onChange={(e) => setForm({ ...form, previousReading: e.target.value })} placeholder="0" />
          </div>
          <div>
            <Label>Present reading</Label>
            <Input type="number" value={form.presentReading}
              onChange={(e) => setForm({ ...form, presentReading: e.target.value })} placeholder="0" />
          </div>
          <div>
            <Label>Rate per unit (₹)</Label>
            <Input type="number" step="0.01" value={form.ratePerUnit}
              onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })} placeholder="0" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
              Mark as paid
            </label>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">Usage</span>
              <span className="font-semibold">{usage.toLocaleString("en-IN")} units</span>
            </div>
            <div className="text-right text-sm">
              <span className="text-muted-foreground">Bill</span>{" "}
              <span className="font-semibold">{fmtINR(bill)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy || !form.flatId}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Save reading"}
          </Button>
        </div>
      </div>
    </div>
  );
}

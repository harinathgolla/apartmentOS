"use client";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "GENERATOR_FUEL",    label: "Generator fuel" },
  { value: "LIFT_MAINTENANCE",  label: "Lift maintenance" },
  { value: "BUILDING_MAINTENANCE", label: "Building maintenance" },
  { value: "PROPERTY_TAX",      label: "Property tax" },
  { value: "MUNICIPAL_TAX",     label: "Municipal / building tax" },
  { value: "PLUMBING",          label: "Plumbing work" },
  { value: "ELECTRICAL",        label: "Electrical work" },
  { value: "REPAIRS",           label: "Building repairs" },
  { value: "OTHER",             label: "Other" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export type UtilityBill = {
  id: number;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  amount: number | string;
  billDate: string;
  vendor?: string | null;
  invoiceNo?: string | null;
  periodMonth?: string | null;
  periodYear?: number | null;
  affectsMaintenance?: boolean;
  expenseId?: number | null;
};

export function UtilityBillModal({
  year,
  month,
  onClose,
  onDone,
}: {
  year: number;
  month: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    category: "GENERATOR_FUEL",
    subcategory: "",
    description: "",
    amount: "",
    billDate: new Date().toISOString().slice(0, 10),
    vendor: "",
    invoiceNo: "",
    periodMonth: month,
    periodYear: String(year),
    affectsMaintenance: false,
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
    if (!form.amount || num(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      await api.post("/api/owner/utility-bills", {
        category: form.category,
        subcategory: form.subcategory || null,
        description: form.description || null,
        amount: num(form.amount),
        billDate: form.billDate,
        vendor: form.vendor || null,
        invoiceNo: form.invoiceNo || null,
        periodMonth: form.periodMonth || null,
        periodYear: form.periodYear ? Number(form.periodYear) : null,
        affectsMaintenance: form.affectsMaintenance,
      });
      toast.success("Utility bill added");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to add bill");
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
            <h2 className="text-base md:text-lg font-semibold">Add utility bill</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Links automatically to the Expenses dashboard</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 grid gap-3 grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="md:col-span-2">
            <Label>Category</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Diesel for generator — Oct refill" />
          </div>
          <div>
            <Label>Amount (₹) *</Label>
            <Input type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          <div>
            <Label>Bill date</Label>
            <Input type="date" value={form.billDate}
              onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
          </div>
          <div>
            <Label>Vendor</Label>
            <Input value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <Label>Invoice no.</Label>
            <Input value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <Label>Period month</Label>
            <select
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={form.periodMonth}
              onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
            >
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Period year</Label>
            <Input type="number" value={form.periodYear}
              onChange={(e) => setForm({ ...form, periodYear: e.target.value })} />
          </div>

          <div className="md:col-span-2 rounded-xl border bg-muted/30 p-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.affectsMaintenance}
                onChange={(e) => setForm({ ...form, affectsMaintenance: e.target.checked })} />
              <span>
                <span className="font-medium">Recover from tenants via maintenance</span>
                <span className="block text-xs text-muted-foreground">
                  Suggests a per-flat share when collecting rent (amount ÷ active flats).
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Add bill
          </Button>
        </div>
      </div>
    </div>
  );
}

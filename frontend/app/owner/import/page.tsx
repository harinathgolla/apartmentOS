"use client";
import { useState } from "react";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"electricity" | "houserent">("electricity");

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/api/owner/import/${kind}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Imported — ${data.flatsCreated} flats, ${data.tenanciesCreated} tenancies, ${data.recordsCreated} records`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Import failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Import Excel" subtitle="Bring your existing workbooks — we'll map them automatically" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Choose a workbook</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "electricity", t: "Electric consumption", d: "Meter Details + per-flat sheets" },
                { k: "houserent",   t: "House rent register",  d: "HouseRent sheet" },
              ].map(({ k, t, d: desc }) => (
                <button
                  key={k}
                  onClick={() => setKind(k as any)}
                  className={`rounded-xl border p-3 text-left transition ${
                    kind === k ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <FileSpreadsheet className="h-5 w-5 text-primary mb-2" />
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-8 text-center hover:bg-accent/40 transition">
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div>
                <FileSpreadsheet className="h-8 w-8 mx-auto text-primary mb-2" />
                <div className="text-sm font-medium">{file ? file.name : "Click to choose .xlsx file"}</div>
                <div className="text-xs text-muted-foreground mt-1">Max 10 MB</div>
              </div>
            </label>
            <Button variant="gradient" className="w-full" disabled={!file || busy} onClick={upload}>
              {busy ? "Importing…" : "Import file"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>What gets imported</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "Flats + meter serial numbers",
              "Monthly meter readings (prev, present, rate, bill)",
              "Tenants and rent agreements",
              "Rent records with shared bills and expenses",
            ].map((s) => (
              <div key={s} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
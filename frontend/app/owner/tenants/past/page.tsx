"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Loader2, Home, RotateCcw, History, IndianRupee,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";
import { toast } from "sonner";

type Apartment = { id: number; name: string; city?: string };
type Flat = { id: number; flatNo: string; apartmentId: number };
type Tenancy = {
  id: number; flatId: number; apartmentId: number;
  tenantName: string; tenantEmail?: string; tenantPhone?: string;
  rentAmount?: number; securityDeposit?: number; depositRefunded?: number;
  agreementStart?: string; agreementEnd?: string;
  tenancyType?: string; maintenanceAmount?: number;
  deductionAmount?: number; deductionReason?: string | null;
  vacateDate?: string | null; active: boolean;
};

export default function PastTenantsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);
  const [rows, setRows] = useState<Tenancy[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

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
    if (!selectedAptId) { setRows([]); setFlats([]); return; }
    setLoading(true);
    try {
      const [t, f] = await Promise.all([
        api.get<any>("/api/owner/tenants", {
          params: { apartmentId: selectedAptId, all: true },
        }),
        api.get<Flat[]>("/api/owner/flats", { params: { apartmentId: selectedAptId } }),
      ]);
      // The endpoint now returns a Spring Page; fall back to a plain array too.
      const pageData = t.data as any;
      const all: Tenancy[] = Array.isArray(pageData)
        ? pageData
        : Array.isArray(pageData?.content) ? pageData.content : [];
      setRows(all.filter((x) => !x.active));
      setFlats(Array.isArray(f.data) ? f.data : []);
    } catch {
      setRows([]); setFlats([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAptId]);

  useEffect(() => { load(); }, [load]);

  const flatsById = new Map(flats.map((f) => [f.id, f]));

  async function reactivate(t: Tenancy) {
    setBusyId(t.id);
    try {
      await api.post(`/api/owner/tenants/${t.id}/reactivate`);
      toast.success(`${t.tenantName} reactivated`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to reactivate");
    } finally { setBusyId(null); }
  }

  const totalDeducted = rows.reduce((s, r) => s + Number(r.deductionAmount ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Past tenants & audit"
        subtitle="Vacated tenants, deposit deductions kept as history, and quick reactivation"
      />

      <div className="mb-4 flex items-center gap-2">
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
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Vacated tenants ({rows.length})
            {totalDeducted > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                total deducted {fmtINR(totalDeducted)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Agreement</TableHead>
                <TableHead>Vacated</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Deduction</TableHead>
                <TableHead>Refundable</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…"
                      : !selectedAptId ? "Select an apartment"
                      : "No vacated tenants yet"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const deposit = Number(r.securityDeposit ?? 0);
                const deducted = Number(r.deductionAmount ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.tenantName}
                      {r.tenantPhone && (
                        <div className="text-xs text-muted-foreground">{r.tenantPhone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3 text-muted-foreground" />
                        {flatsById.get(r.flatId)?.flatNo ?? `#${r.flatId}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.tenancyType === "LEASE" ? "info" : "secondary"}>
                        {r.tenancyType === "LEASE" ? "Lease" : "Rental"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.agreementStart ?? "—"} → {r.agreementEnd ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.vacateDate ?? "—"}
                    </TableCell>
                    <TableCell>{fmtINR(deposit)}</TableCell>
                    <TableCell>
                      {deducted > 0 ? (
                        <>
                          <div className="font-medium text-destructive">−{fmtINR(deducted)}</div>
                          {r.deductionReason && (
                            <div className="text-xs text-muted-foreground">{r.deductionReason}</div>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtINR(Math.max(0, deposit - deducted))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={busyId === r.id}
                        onClick={() => reactivate(r)}>
                        {busyId === r.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RotateCcw className="h-3.5 w-3.5" />}
                        Reactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

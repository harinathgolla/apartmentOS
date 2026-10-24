"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Loader2, X, Wallet, ShieldCheck, HandCoins,
  ArrowDownToLine, History, Home,
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
import { InlineLink } from "@/components/ui/inline-link";
import { QuickFlatModal, type QuickFlat } from "@/components/owner/quick-flat-modal";

type Apartment = { id: number; name: string; city?: string };
type Row = {
  tenancyId: number; flatId: number; flatNo?: string | null;
  tenantName: string; tenancyType?: string; active: boolean;
  securityDeposit?: number; depositRefunded?: number; depositSettled?: number;
  depositOutstanding?: number;
  leaseUpfrontAmount?: number; leaseUpfrontCollected?: number;
  leaseUpfrontSettled?: number; leaseUpfrontOutstanding?: number;
  leaseUpfrontNotes?: string | null;
  totalOutstanding?: number;
};
type Overview = {
  rows: Row[];
  totalDepositOutstanding?: number;
  totalLeaseUpfrontOutstanding?: number;
  totalOutstanding?: number;
};

export default function LiabilitiesPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [settleFor, setSettleFor] = useState<Row | null>(null);
  const [flatEdit, setFlatEdit] = useState<QuickFlat | null>(null);

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
    if (!selectedAptId) { setData(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get<Overview>("/api/owner/liabilities", {
        params: { apartmentId: selectedAptId },
      });
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAptId]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Liabilities & refunds"
        subtitle="Security deposits and lease advances you hold — refundable, never counted as rent"
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

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 mb-4">
        <KpiCard label="Deposits held" value={fmtINR(data?.totalDepositOutstanding ?? 0)} icon={ShieldCheck} tone="info" />
        <KpiCard label="Lease advances held" value={fmtINR(data?.totalLeaseUpfrontOutstanding ?? 0)} icon={HandCoins} tone="warning" />
        <KpiCard label="Total refundable" value={fmtINR(data?.totalOutstanding ?? 0)} icon={Wallet} tone="default" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Security deposit</TableHead>
                <TableHead>Lease advance</TableHead>
                <TableHead>Total owed to tenant</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…"
                      : !selectedAptId ? "Select an apartment"
                      : "No tenants with deposits or advances"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.tenancyId} className={r.active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{r.tenantName}</TableCell>
                  <TableCell>
                    {r.flatNo ? (
                      <InlineLink
                        onClick={() => setFlatEdit({
                          id: r.flatId, flatNo: r.flatNo!, apartmentId: selectedAptId!,
                        })}
                        title="Edit this flat"
                      >
                        <Home className="h-3 w-3 text-muted-foreground" />{r.flatNo}
                      </InlineLink>
                    ) : (
                      <InlineLink muted title="Flat not found">#{r.flatId}</InlineLink>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.tenancyType === "LEASE" ? "info" : "secondary"}>
                      {r.tenancyType === "LEASE" ? "Lease" : "Rental"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{fmtINR(r.depositOutstanding ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">of {fmtINR(r.securityDeposit ?? 0)}</div>
                  </TableCell>
                  <TableCell>
                    {Number(r.leaseUpfrontCollected ?? 0) > 0 ? (
                      <>
                        <div className="font-medium">{fmtINR(r.leaseUpfrontOutstanding ?? 0)}</div>
                        <div className="text-xs text-muted-foreground">
                          of {fmtINR(r.leaseUpfrontCollected ?? 0)}
                          {r.leaseUpfrontNotes ? ` · ${r.leaseUpfrontNotes}` : ""}
                        </div>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-semibold">{fmtINR(r.totalOutstanding ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="gradient" onClick={() => setSettleFor(r)}>
                      <ArrowDownToLine className="h-3.5 w-3.5" /> Settle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {settleFor && selectedAptId && (
        <SettleModal
          row={settleFor}
          apartmentId={selectedAptId}
          onClose={() => setSettleFor(null)}
          onDone={() => { setSettleFor(null); load(); }}
        />
      )}

      {flatEdit && (
        <QuickFlatModal
          flat={flatEdit}
          onClose={() => setFlatEdit(null)}
          onDone={() => { setFlatEdit(null); load(); }}
        />
      )}
    </>
  );
}

function SettleModal({
  row, apartmentId, onClose, onDone,
}: { row: Row; apartmentId: number; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<"SECURITY_DEPOSIT" | "LEASE_UPFRONT">(
    Number(row.depositOutstanding ?? 0) > 0 ? "SECURITY_DEPOSIT" : "LEASE_UPFRONT"
  );
  const [amount, setAmount] = useState("");
  const [settledDate, setSettledDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    api.get(`/api/owner/liabilities/tenancy/${row.tenancyId}/history`, {
      params: { apartmentId },
    }).then((r) => setHistory(Array.isArray(r.data) ? r.data : [])).catch(() => setHistory([]));
  }, [row.tenancyId, apartmentId]);

  const maxFor = kind === "SECURITY_DEPOSIT"
    ? Number(row.depositOutstanding ?? 0)
    : Number(row.leaseUpfrontOutstanding ?? 0);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a positive amount"); return; }
    if (amt > maxFor) { toast.error(`Cannot settle more than ${fmtINR(maxFor)}`); return; }
    setBusy(true);
    try {
      await api.post(`/api/owner/liabilities/tenancy/${row.tenancyId}/settle`, {
        kind, amount: amt, settledDate: settledDate || null, notes: notes || null,
      }, { params: { apartmentId } });
      toast.success("Settlement recorded");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to settle");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Settle liability</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.tenantName}{row.flatNo ? ` · Flat ${row.flatNo}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 md:p-5 space-y-3 overflow-y-auto">
          <div>
            <Label>Liability</Label>
            <select className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
              value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="SECURITY_DEPOSIT">Security deposit — {fmtINR(row.depositOutstanding ?? 0)} outstanding</option>
              <option value="LEASE_UPFRONT">Lease advance — {fmtINR(row.leaseUpfrontOutstanding ?? 0)} outstanding</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={String(maxFor)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={settledDate} onChange={(e) => setSettledDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Vacate refund" />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <History className="h-3 w-3" /> Settlement history
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No settlements recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                    <span className="capitalize">{String(h.kind).toLowerCase().replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{h.settledDate}</span>
                    <span className="font-medium">{fmtINR(h.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-5 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy || maxFor <= 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Record refund
          </Button>
        </div>
      </div>
    </div>
  );
}

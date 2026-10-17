"use client";
import { useEffect, useState, useCallback } from "react";
import { History, Loader2, ChevronLeft, ChevronRight, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";

type AuditRow = {
  id: number; orgId?: number; userId?: number;
  entity: string; entityId?: number; action: string;
  beforeJson?: string | null; afterJson?: string | null;
  createdAt: string;
};
type PageResp = {
  content: AuditRow[]; totalElements: number; totalPages: number; number: number; size: number;
};

const ENTITIES = ["", "Tenancy", "RentRecord", "Apartment", "Flat", "UtilityBill", "LiabilitySettlement"];

const ACTION_TONE: Record<string, "success" | "warning" | "info" | "secondary"> = {
  CREATE: "success", UPDATE: "info", DELETE: "warning", DELETE_CASCADE: "warning",
  VACATE: "warning", SETTLE: "info", COLLECT: "success",
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<PageResp>("/api/owner/audit", {
        params: { entity: entity || undefined, page, size: 50 },
      });
      setRows(Array.isArray(data.content) ? data.content : []);
      setTotalPages(data.totalPages ?? 0);
      setTotal(data.totalElements ?? 0);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load audit log");
      setRows([]);
    } finally { setLoading(false); }
  }, [page, entity]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every create, update, delete, vacate, settle and collection — with the user who did it"
        action={
          <div className="flex gap-2">
            <select
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              value={entity}
              onChange={(e) => { setEntity(e.target.value); setPage(0); }}
            >
              {ENTITIES.map((e) => (
                <option key={e} value={e}>{e || "All entities"}</option>
              ))}
            </select>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Activity ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {loading ? "Loading…" : "No activity recorded yet"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {r.userId != null ? `#${r.userId}` : "system"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{r.entity}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_TONE[r.action] ?? "secondary"}>{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.entityId != null ? `#${r.entityId}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-3">
            <div className="text-xs text-muted-foreground">
              Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

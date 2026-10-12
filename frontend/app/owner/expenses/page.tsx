"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtINR } from "@/lib/utils";

export default function ExpensesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/owner/expenses")
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Expenses" subtitle="Every rupee spent on your apartments" />
      <Card>
        <CardHeader><CardTitle>Expense ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Source</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {loading ? "Loading…" : "No expenses yet"}
                </TableCell></TableRow>
              )}
              {rows.map((r) => {
                const src = r.source ?? "MANUAL";
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.expenseDate}</TableCell>
                    <TableCell><Badge variant="info">{r.category?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>
                      {src === "MANUAL" ? (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      ) : src === "UTILITY_BILL" ? (
                        <Badge variant="warning">Utility bill</Badge>
                      ) : (
                        <Badge variant="secondary">Common meter</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.vendor ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{fmtINR(r.amount)}</TableCell>
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
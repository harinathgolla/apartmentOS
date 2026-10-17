"use client";
import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

/**
 * Two-step hard-cascade delete.
 *
 * 1. DELETE without cascade → backend 409 with a message listing dependents.
 * 2. User confirms → DELETE ?cascade=true.
 *
 * If there are no dependents the first call succeeds outright.
 */
export function DeleteButton({
  url, impactUrl, label, description, onDeleted, className,
}: {
  url: string;
  impactUrl?: string;
  label: string;
  description?: string;
  onDeleted: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; impact?: any } | null>(null);

  async function attempt(cascade: boolean) {
    setBusy(true);
    try {
      await api.delete(url, { params: cascade ? { cascade: true } : {} });
      toast.success(`${label} deleted`);
      setConfirm(null);
      onDeleted();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? "Failed to delete";
      if (status === 409) {
        let impact: any = undefined;
        if (impactUrl) {
          try { impact = (await api.get(impactUrl)).data; } catch { /* ignore */ }
        }
        setConfirm({ message: msg, impact });
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="icon" variant="ghost"
        className={className ?? "h-8 w-8 text-destructive hover:bg-destructive/10"}
        disabled={busy}
        onClick={() => attempt(false)}
        title={description ?? `Delete ${label}`}
        aria-label={`Delete ${label}`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          onClick={() => setConfirm(null)} role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl border border-border max-w-md w-full"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-5 border-b border-border/60">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold">Delete {label}?</h2>
                <p className="text-xs text-muted-foreground mt-1">{confirm.message}</p>
              </div>
              <button onClick={() => setConfirm(null)} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {confirm.impact && (
              <div className="p-5 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Will be permanently removed
                </div>
                {(Object.entries(confirm.impact) as [string, unknown][])
                  .map(([k, raw]) => ({ k, v: typeof raw === "number" ? raw : Number.NaN }))
                  .filter((e) => Number.isFinite(e.v) && e.v > 0)
                  .map(({ k, v }) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {k.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 p-5 border-t border-border/60">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
              <Button variant="destructive" onClick={() => attempt(true)} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

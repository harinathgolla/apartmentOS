"use client";
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import {
  AlertTriangle, CheckCircle2, Info, X, Loader2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════════════════════════════
   Rich confirmation / alert dialog.

   Replaces window.confirm / window.alert with a themed, accessible modal
   that supports a warning list (e.g. cascade-delete impact) and returns a
   Promise<boolean> so call sites stay linear:

     if (!(await confirmDialog({ title, description }))) return;
   ═══════════════════════════════════════════════════════════════════ */

export type DialogTone = "danger" | "warning" | "info" | "success";

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** Bullet list rendered in a muted panel — cascade impact, warnings, etc. */
  details?: string[];
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Hide the cancel button (pure alert). */
  alertOnly?: boolean;
};

type Resolver = { resolve: (v: boolean) => void };

type Ctx = {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  alert: (o: Omit<ConfirmOptions, "alertOnly" | "cancelLabel">) => Promise<boolean>;
};

const ConfirmContext = createContext<Ctx | null>(null);

const TONE = {
  danger:  { icon: Trash2,         ring: "bg-destructive/10 text-destructive",  btn: "destructive" as const },
  warning: { icon: AlertTriangle,  ring: "bg-amber-500/10 text-amber-600",      btn: "default" as const },
  info:    { icon: Info,           ring: "bg-indigo-500/10 text-indigo-600",    btn: "default" as const },
  success: { icon: CheckCircle2,   ring: "bg-emerald-500/10 text-emerald-600",  btn: "default" as const },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.resolve(value);
    resolver.current = null;
    setOpen(null);
    setBusy(false);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = { resolve };
      setOpen(o);
    });
  }, []);

  const alert = useCallback((o: Omit<ConfirmOptions, "alertOnly" | "cancelLabel">) => {
    return confirm({ ...o, alertOnly: true, confirmLabel: o.confirmLabel ?? "OK" });
  }, [confirm]);

  // Esc to cancel, Enter to confirm; lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); settle(false); }
      if (e.key === "Enter" && !busy) { e.preventDefault(); settle(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, settle]);

  const tone = TONE[open?.tone ?? "warning"];
  const Icon = tone.icon;

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onClick={() => !busy && settle(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={open.description ? "confirm-desc" : undefined}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-border/60 p-5">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone.ring}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-base font-semibold leading-tight">
                  {open.title}
                </h2>
                {open.description && (
                  <p id="confirm-desc" className="mt-1 text-sm text-muted-foreground">
                    {open.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => !busy && settle(false)}
                className="rounded-lg p-1.5 hover:bg-accent"
                aria-label="Close"
                disabled={busy}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {open.details && open.details.length > 0 && (
              <div className="max-h-56 overflow-y-auto p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {open.tone === "danger" ? "Will be permanently removed" : "Details"}
                </div>
                <ul className="mt-2 space-y-1">
                  {open.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                      <span className="min-w-0 break-words">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 p-4">
              {!open.alertOnly && (
                <Button variant="outline" onClick={() => settle(false)} disabled={busy}>
                  {open.cancelLabel ?? "Cancel"}
                </Button>
              )}
              <Button
                variant={open.tone === "danger" ? "destructive" : "gradient"}
                onClick={() => settle(true)}
                disabled={busy}
                autoFocus
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {open.confirmLabel ?? (open.alertOnly ? "OK" : "Confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

function useConfirmCtx(): Ctx {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}

/** Rich confirm — resolves true when the user confirms. */
export function useConfirm() {
  return useConfirmCtx().confirm;
}

/** Rich alert — single OK button, resolves true. */
export function useAlert() {
  return useConfirmCtx().alert;
}

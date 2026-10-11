import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Props = {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const toneStyles: Record<NonNullable<Props["tone"]>, string> = {
  default: "from-slate-500/10 to-slate-500/0 text-slate-600 dark:text-slate-300",
  success: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
  warning: "from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-400",
  danger:  "from-rose-500/15 to-rose-500/0 text-rose-600 dark:text-rose-400",
  info:    "from-indigo-500/15 to-indigo-500/0 text-indigo-600 dark:text-indigo-400",
};

export function KpiCard({ label, value, delta, icon: Icon, tone = "default" }: Props) {
  return (
    <Card className="kpi-card group p-4 md:p-5">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
          toneStyles[tone]
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="mt-1.5 md:mt-2 text-xl md:text-2xl font-semibold tracking-tight truncate">
            {value}
          </p>
          {typeof delta === "number" && (
            <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium",
              delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}%
            </p>
          )}
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2 md:p-2.5 shrink-0", toneStyles[tone])}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>
    </Card>
  );
}
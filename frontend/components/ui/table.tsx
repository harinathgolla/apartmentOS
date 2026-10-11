import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-x-auto table-scroll rounded-xl border">
    <table className={cn("w-full caption-bottom text-sm min-w-[640px]", className)} {...p} />
  </div>
);

export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b bg-muted/40", className)} {...p} />
);

export const TableBody = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />
);

export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors hover:bg-muted/40", className)} {...p} />
);

export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-10 md:h-11 px-3 md:px-4 text-left align-middle text-[11px] md:text-xs",
      "font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
      className
    )}
    {...p}
  />
);

export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 md:px-4 py-3 align-middle whitespace-nowrap", className)} {...p} />
);
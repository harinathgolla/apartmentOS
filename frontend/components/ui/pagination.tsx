"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

const STORAGE_KEY = "apartmentos.pageSize";

export function readStoredPageSize(fallback: PageSize = 25): PageSize {
  if (typeof window === "undefined") return fallback;
  const raw = Number(window.localStorage.getItem(STORAGE_KEY));
  return (PAGE_SIZES as readonly number[]).includes(raw) ? (raw as PageSize) : fallback;
}

export function storePageSize(size: PageSize) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(size));
}

type Props = {
  page: number;              // 0-based
  totalPages: number;
  totalElements?: number;
  size: PageSize;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSizeChange: (size: PageSize) => void;
};

export function Pagination({
  page, totalPages, totalElements, size, loading,
  onPageChange, onSizeChange,
}: Props) {
  const canPrev = page > 0 && !loading;
  const canNext = page + 1 < totalPages && !loading;

  return (
    <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>
        {typeof totalElements === "number" && (
          <span className="hidden sm:inline">· {totalElements} total</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Rows</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={size}
            disabled={loading}
            onChange={(e) => {
              const next = Number(e.target.value) as PageSize;
              storePageSize(next);
              onSizeChange(next);
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => onPageChange(0)} className="hidden sm:inline-flex">
          First
        </Button>
        <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => onPageChange(Math.max(0, page - 1))}>
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <Button size="sm" variant="outline" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" disabled={!canNext} onClick={() => onPageChange(Math.max(0, totalPages - 1))} className="hidden sm:inline-flex">
          Last
        </Button>
      </div>
    </div>
  );
}

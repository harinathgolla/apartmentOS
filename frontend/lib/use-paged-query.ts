"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { type PageSize, readStoredPageSize } from "@/components/ui/pagination";

export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type Options = {
  /** Initial page size; falls back to the value persisted in localStorage. */
  defaultSize?: PageSize;
  /** Extra query params (filters). Changes to these reset the page to 0. */
  params?: Record<string, unknown>;
  /** Set false to defer the first fetch. */
  enabled?: boolean;
};

export function usePagedQuery<T>(url: string, opts: Options = {}) {
  const { defaultSize = 25, params, enabled = true } = opts;

  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(defaultSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted page size once on mount (client only).
  const restored = useRef(false);
  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      setSize(readStoredPageSize(defaultSize));
    }
  }, [defaultSize]);

  // Stable key for the filter params so we can reset paging when they change.
  const paramsKey = JSON.stringify(params ?? {});
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    setPage(0);
  }, [paramsKey, size]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PageResp<T>>(url, {
        params: { ...(paramsRef.current ?? {}), page, size },
      });
      setRows(Array.isArray(data.content) ? data.content : []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load data");
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [url, page, size, enabled]);

  useEffect(() => { load(); }, [load, paramsKey]);

  return {
    rows, page, size, totalPages, totalElements, loading, error,
    setPage, setSize, reload: load,
  };
}

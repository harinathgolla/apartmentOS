"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Tiny pub/sub that the axios interceptor drives.
 * Tracks in-flight request count so concurrent calls show one indicator.
 */
let pending = 0;
const listeners = new Set<(n: number) => void>();

function emit() {
  listeners.forEach((l) => l(pending));
}

export function trackStart() {
  pending += 1;
  emit();
}

export function trackEnd() {
  pending = Math.max(0, pending - 1);
  emit();
}

export function GlobalLoader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    listeners.add(setCount);
    setCount(pending);
    return () => { listeners.delete(setCount); };
  }, []);

  if (count === 0) return null;

  return (
    <>
      {/* top progress bar */}
      <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-[loader_1.1s_ease-in-out_infinite] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
      </div>
      {/* small floating pill for clarity on long calls */}
      <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="text-muted-foreground">Working…</span>
      </div>
      <style jsx global>{`
        @keyframes loader {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </>
  );
}

import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar hidden on mobile (mobile has its own bar in Sidebar) */}
        <div className="hidden md:block">
          <Topbar />
        </div>
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pt-16 md:pt-6">{children}</main>
      </div>
    </div>
  );
}
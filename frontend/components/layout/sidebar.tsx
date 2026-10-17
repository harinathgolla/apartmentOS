"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, LayoutDashboard, Receipt, Wallet, Droplets,
  Users, LineChart, Settings, Bell, FileSpreadsheet,
  Gauge, Menu, X, ShieldCheck, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/owner",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/owner/tenants",     label: "Tenants",     icon: Users },
  { href: "/owner/tenants/past", label: "Past tenants", icon: History },
  { href: "/owner/rent",        label: "Rent",        icon: Receipt },
  { href: "/owner/liabilities", label: "Liabilities", icon: ShieldCheck },
  { href: "/owner/utilities",   label: "Utilities",   icon: Droplets },
  { href: "/owner/meters",      label: "Meters",      icon: Gauge },
  { href: "/owner/expenses",    label: "Expenses",    icon: Wallet },
  { href: "/owner/pnl",         label: "P&L / ROI",   icon: LineChart },
  { href: "/owner/import",      label: "Import",      icon: FileSpreadsheet },
  { href: "/owner/reminders",   label: "Reminders",   icon: Bell },
];

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [path]);

  const navBody = (
    <>
      <div className="flex h-16 items-center justify-between px-5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-violet-500/30">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">ApartmentOS</span>
        </div>
        <button
          className="md:hidden rounded-lg p-1.5 hover:bg-accent"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/owner" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: only Settings — no profile, no sign-out */}
      <div className="p-3 border-t border-border/60 shrink-0">
        <Link
          href="/owner/settings"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-4 w-4 shrink-0" /> Settings
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b bg-background/90 backdrop-blur-xl">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 -ml-2 hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm">ApartmentOS</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] flex flex-col bg-card border-r border-border/60"
            onClick={(e) => e.stopPropagation()}
          >
            {navBody}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur">
        {navBody}
      </aside>
    </>
  );
}
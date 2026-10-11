"use client";
import { useState, useEffect } from "react";
import {
  Moon, Sun, Bell, Search, LogOut, User as UserIcon,
  ChevronDown, Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMe } from "@/lib/api";

export function Topbar() {
  const { setTheme, resolvedTheme } = useTheme();
  const [me, setMe] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMe(getMe());
  }, []);

  const initials = (me?.fullName || "U")
    .split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 md:gap-4 border-b bg-background/70 backdrop-blur-xl px-3 md:px-6">
      <div className="flex-1" />

      <div className="relative hidden lg:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants, invoices…"
          className="pl-9 w-72 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <Button variant="ghost" size="icon" className="relative h-9 w-9">
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
      </Button>

      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border bg-card pl-1 pr-2 md:pr-3 py-1 hover:bg-accent transition">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
              {me?.fullName ?? "Guest"}
            </span>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground truncate">
                {me?.fullName ?? "Guest"}
              </span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {me?.email ?? "Not signed in"}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/owner/profile" className="cursor-pointer">
              <UserIcon className="h-4 w-4" /> Profile
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/owner/settings" className="cursor-pointer">
              <Settings className="h-4 w-4" /> Settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
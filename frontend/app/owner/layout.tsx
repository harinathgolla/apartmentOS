"use client";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      window.location.href = "/login";
    }
  }, []);
  return <AppShell>{children}</AppShell>;
}
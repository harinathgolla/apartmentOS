import Link from "next/link";
import { ArrowRight, Building2, Receipt, Zap, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-lg">ApartmentOS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/login?mode=register"><Button variant="gradient">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Built for Indian apartment owners
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Your apartment's<br />
          <span className="gradient-text">financial operating system</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Track rent, electricity, expenses and true ROI — from one elegant dashboard. Import your Excel, connect Gmail, and send reminders in seconds.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login?mode=register"><Button size="lg" variant="gradient">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link href="/pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Receipt, title: "Rent tracking", desc: "Per-tenant ledgers with auto-generated invoices" },
            { icon: Zap, title: "Electricity", desc: "Meter readings, slab rates, shared bills" },
            { icon: LineChart, title: "True ROI", desc: "Net income, expenses and returns in one view" },
            { icon: ShieldCheck, title: "Multi-tenant", desc: "Every org is isolated with row-level security" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { Check, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  { name: "Trial", price: 0, tag: "14 days", perks: ["1 apartment", "10 flats", "All features"], cta: "Start free" },
  { name: "Starter", price: 499, tag: "per month", perks: ["1 apartment", "40 flats", "Email reminders", "Excel import", "Invoice PDF"], cta: "Start now" },
  { name: "Pro", price: 1499, tag: "per month", perks: ["5 apartments", "300 flats", "Everything in Starter", "P&L / ROI dashboard", "Razorpay pay-links", "Priority support"], cta: "Go Pro", popular: true },
  { name: "Enterprise", price: 4999, tag: "per month", perks: ["Unlimited apartments", "Unlimited flats", "White-label", "API access", "Dedicated manager"], cta: "Contact sales" },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">ApartmentOS</span>
        </Link>
        <Link href="/login"><Button variant="gradient">Sign in</Button></Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
        <Badge variant="info" className="mb-4"><Sparkles className="mr-1 h-3 w-3" /> Simple, transparent pricing</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Priced for every apartment</h1>
        <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you grow. Cancel anytime.</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 lg:grid-cols-4">
        {plans.map((p) => (
          <div key={p.name}
            className={`relative rounded-2xl border bg-card p-6 transition-all ${
              p.popular ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]" : "hover:-translate-y-1 hover:shadow-lg"
            }`}>
            {p.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most popular</Badge>
            )}
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{p.name}</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">₹{p.price}</span>
              <span className="text-sm text-muted-foreground">/{p.tag}</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {p.perks.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" /> {x}
                </li>
              ))}
            </ul>
            <Link href="/login?mode=register" className="mt-6 block">
              <Button variant={p.popular ? "gradient" : "outline"} className="w-full">{p.cta}</Button>
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}

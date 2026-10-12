"use client";
import { useEffect, useState } from "react";
import { Save, Loader2, Building2, Bell, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Apartment = {
  id: number;
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  totalFloors?: number | null;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [apt, setApt] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Apartment>>({});
  const [emailReminders, setEmailReminders] = useState(true);

  useEffect(() => {
    setMounted(true);
    api.get("/api/owner/apartments")
      .then((r) => {
        const list: Apartment[] = Array.isArray(r.data) ? r.data : [];
        const first = list[0] ?? null;
        setApt(first);
        setForm(first ?? {});
      })
      .catch(() => setApt(null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!apt?.id) return;
    setSaving(true);
    try {
      await api.put(`/api/owner/apartments/${apt.id}`, {
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        totalFloors: form.totalFloors != null ? Number(form.totalFloors) : null,
      });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof Apartment, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Apartment details, notifications and appearance"
        action={
          <Button onClick={save} disabled={saving || !apt?.id}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Apartment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Apartment
            </CardTitle>
            <CardDescription>Primary property details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !apt?.id ? (
              <p className="text-sm text-muted-foreground">
                No apartment yet. Create one from the dashboard first.
              </p>
            ) : (
              <>
                <Field label="Name" value={form.name ?? ""} onChange={(v) => set("name", v)} />
                <Field label="Address" value={form.address ?? ""} onChange={(v) => set("address", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" value={form.city ?? ""} onChange={(v) => set("city", v)} />
                  <Field label="State" value={form.state ?? ""} onChange={(v) => set("state", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pincode" value={form.pincode ?? ""} onChange={(v) => set("pincode", v)} />
                  <Field
                    label="Total floors"
                    type="number"
                    value={form.totalFloors != null ? String(form.totalFloors) : ""}
                    onChange={(v) => set("totalFloors", v)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
            <CardDescription>Email reminders for rent collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm">Send rent reminders via email</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Reminder scheduling is controlled from the Reminders page.
            </p>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" /> Appearance
            </CardTitle>
            <CardDescription>Theme preference</CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <div className="flex gap-2">
                {["light", "dark", "system"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg border px-4 py-2 text-sm capitalize transition ${
                      theme === t ? "bg-primary/15 text-primary border-primary/40" : "hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

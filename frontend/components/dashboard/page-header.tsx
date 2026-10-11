export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 md:mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex flex-wrap gap-2 md:flex-nowrap md:justify-end">{action}</div>
      )}
    </div>
  );
}
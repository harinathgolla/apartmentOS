"use client";
import { cn } from "@/lib/utils";

/**
 * Small inline "hyperlink" trigger used throughout owner pages to open an
 * add/edit popup without leaving the current page (no tab navigation).
 *
 * Rendered as a button so it is keyboard-accessible, but styled as a link so
 * the owner immediately understands "click me to edit / add here".
 */
export function InlineLink({
  children,
  onClick,
  title,
  className,
  muted,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
  /** Show placeholder styling (dashed underline) e.g. "— none —". */
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded text-left font-medium underline decoration-dotted underline-offset-2 transition-colors",
        "text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        muted && "text-muted-foreground hover:text-foreground decoration-muted-foreground/60",
        className
      )}
    >
      {children}
    </button>
  );
}

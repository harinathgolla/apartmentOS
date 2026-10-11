import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        info: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({ className, variant, ...p }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...p} />;
}
export { badgeVariants };

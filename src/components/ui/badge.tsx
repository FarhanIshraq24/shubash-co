import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold tracking-wide border",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface-subtle)] text-[var(--foreground)] border-[var(--border-subtle)]",
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent",
        success:
          "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]",
        warning:
          "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]",
        error:
          "bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]",
        info:
          "bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]",
        outline:
          "border-[var(--border-control)] text-[var(--foreground)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  indicator?: boolean;
}

function Badge({ className, variant, indicator = true, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {indicator && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            variant === "success" && "bg-[var(--status-success)]",
            variant === "warning" && "bg-[var(--status-warning)]",
            variant === "error" && "bg-[var(--status-error)]",
            variant === "info" && "bg-[var(--status-info)]",
            variant === "primary" && "bg-[var(--primary-foreground)]",
            (!variant || variant === "default" || variant === "outline") &&
              "bg-[var(--text-secondary)]"
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };

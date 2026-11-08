import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          id={id}
          className={cn(
            "flex h-11 w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-4 py-2 text-base text-[var(--text-strong)] transition-colors placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[var(--status-error)] focus-visible:ring-[var(--status-error)]"
              : "border-[var(--border-control)] hover:border-[var(--foreground)]",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error && id
              ? `${id}-error`
              : helperText && id
              ? `${id}-helper`
              : undefined
          }
          ref={ref}
          {...props}
        />
        {error && (
          <p
            id={id ? `${id}-error` : undefined}
            className="mt-1.5 text-sm font-medium text-[var(--status-error)] flex items-center gap-1"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={id ? `${id}-helper` : undefined}
            className="mt-1 text-sm text-[var(--text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

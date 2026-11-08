import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[#1E1D19] shadow-sm",
        secondary:
          "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-control)] hover:bg-[var(--surface-subtle)] active:bg-[#EAE4D5]",
        outline:
          "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-subtle)] active:bg-[#EAE4D5]",
        destructive:
          "bg-[var(--status-error)] text-white hover:bg-[#7F1D1D] active:bg-[#6B1818] shadow-sm",
        link:
          "text-[var(--text-strong)] underline-offset-4 hover:underline p-0 h-auto min-h-0",
      },
      size: {
        default: "h-11 px-6 py-2.5 rounded-[var(--radius-md)]",
        sm: "h-9 px-4 py-1.5 text-sm rounded-[var(--radius-sm)]",
        lg: "h-13 px-8 py-3.5 text-lg rounded-[var(--radius-md)]",
        icon: "h-11 w-11 rounded-[var(--radius-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

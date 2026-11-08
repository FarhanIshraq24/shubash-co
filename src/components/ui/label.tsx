import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-semibold text-[var(--text-strong)] mb-1.5 leading-none select-none",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[var(--status-error)] ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);
Label.displayName = "Label";

export { Label };

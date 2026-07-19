import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-graphite/12 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-moss focus:ring-2 focus:ring-moss/15",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-36 w-full resize-none rounded-md border border-graphite/12 bg-white px-3 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/40 focus:border-moss focus:ring-2 focus:ring-moss/15",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

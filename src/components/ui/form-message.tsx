import * as React from "react";

import { cn } from "@/lib/utils";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { FormMessage };

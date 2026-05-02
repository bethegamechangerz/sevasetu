"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ButtonProps, "onClick" | "disabled"> & {
  label?: string;
  redirectTo?: string;
  withIcon?: boolean;
};

export function SignOutButton({
  label = "Sign out",
  redirectTo = "/",
  withIcon = true,
  className,
  variant = "ghost",
  size,
  ...rest
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handle() {
    if (pending) return;
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handle}
      disabled={pending}
      aria-busy={pending}
      className={cn(className)}
      {...rest}
    >
      {withIcon ? <LogOut className="size-4" aria-hidden="true" /> : null}
      {pending ? "Signing out…" : label}
    </Button>
  );
}

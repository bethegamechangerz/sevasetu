"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AvailabilityToggleProps {
  initial: boolean;
  className?: string;
}

export function AvailabilityToggle({ initial, className }: AvailabilityToggleProps) {
  const [online, setOnline] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  const onToggle = (next: boolean) => {
    const previous = online;
    setOnline(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: next }),
        });
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        toast.success(next ? "You are now online" : "You are offline");
      } catch (err) {
        setOnline(previous); // rollback
        const msg = err instanceof Error ? err.message : "Could not update availability";
        toast.error(msg);
      }
    });
  };

  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-3 rounded-full border bg-card px-3 py-1.5 shadow-sm", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-2 rounded-full transition-colors",
          online ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" : "bg-muted-foreground/40",
        )}
      />
      <Label htmlFor={id} className="cursor-pointer text-xs font-medium">
        {online ? "Online" : "Offline"}
      </Label>
      <Switch
        id={id}
        checked={online}
        disabled={pending}
        onCheckedChange={onToggle}
        aria-label={online ? "Go offline" : "Go online"}
      />
      {pending ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : null}
    </div>
  );
}

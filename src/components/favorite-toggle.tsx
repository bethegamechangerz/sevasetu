"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteToggle({
  providerId,
  initialFavorited,
  className,
}: {
  providerId: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = React.useState(initialFavorited);
  const [pending, startTransition] = React.useTransition();

  const onClick = () => {
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId }),
        });
        if (!res.ok) {
          setFavorited(!next);
          const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? "Could not update favorite");
        }
        toast.success(next ? "Saved to favorites" : "Removed from favorites");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={favorited ? "secondary" : "outline"}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      disabled={pending}
      onClick={onClick}
      className={cn("rounded-full", className)}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          favorited ? "fill-rose-500 text-rose-500" : "text-foreground",
        )}
        aria-hidden
      />
    </Button>
  );
}

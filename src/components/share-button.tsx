"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareButton({ title, text }: { title: string; text?: string }) {
  const onShare = async () => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return;
    const url = window.location.href;
    const data = { title, text, url };
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Could not share. Copy the URL from the address bar.");
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onShare}>
      <Share2 className="h-4 w-4" aria-hidden /> Share
    </Button>
  );
}

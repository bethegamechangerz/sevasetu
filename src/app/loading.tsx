import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-svh place-items-center bg-background"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Loading… लोड हो रहा है…</p>
      </div>
    </div>
  );
}

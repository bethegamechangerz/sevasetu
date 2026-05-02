"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CANCEL_REASONS = [
  "Schedule no longer works for me",
  "Booked the wrong provider",
  "Found a better quote",
  "Provider hasn't responded",
  "Other",
] as const;

const MAX_REASON = 500;

export type CancelBookingDialogProps = {
  bookingId: string;
  trigger: React.ReactNode;
};

export function CancelBookingDialog({ bookingId, trigger }: CancelBookingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [preset, setPreset] = React.useState<string>(CANCEL_REASONS[0]);
  const [extra, setExtra] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const reason = React.useMemo(() => {
    const trimmed = extra.trim();
    if (preset === "Other") return trimmed || "Other";
    return trimmed ? `${preset} — ${trimmed}` : preset;
  }, [preset, extra]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancelledReason: reason }),
      });
      if (!res.ok) {
        const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(data.error?.message ?? "Could not cancel booking");
      }
      toast.success("Booking cancelled");
      setOpen(false);
      setExtra("");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            Tell us why so we can help find a better match. The provider will be notified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="space-y-2" disabled={submitting}>
            <legend className="text-sm font-medium">Reason</legend>
            {CANCEL_REASONS.map((r) => {
              const id = `cancel-reason-${r.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <label
                  key={r}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    id={id}
                    name="cancel-reason"
                    value={r}
                    checked={preset === r}
                    onChange={() => setPreset(r)}
                    className="size-4 accent-primary"
                  />
                  <span>{r}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-extra">
              {preset === "Other" ? "Tell us more" : "Add a note (optional)"}
            </Label>
            <Textarea
              id="cancel-extra"
              value={extra}
              onChange={(e) => setExtra(e.target.value.slice(0, MAX_REASON))}
              placeholder="Anything the provider should know"
              rows={3}
              disabled={submitting}
              required={preset === "Other"}
              aria-describedby="cancel-extra-counter"
            />
            <p id="cancel-extra-counter" className="text-right text-[11px] text-muted-foreground">
              {extra.length}/{MAX_REASON}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Keep booking
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Confirm cancellation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

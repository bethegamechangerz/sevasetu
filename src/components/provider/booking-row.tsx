"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Loader2,
  MapPin,
  Phone,
  PlayCircle,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface BookingRowData {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  serviceTitle?: string | null;
  scheduledAt: string;
  address: string;
  notes?: string | null;
  priceQuoted: number;
  status: BookingStatus;
}

const STATUS_TONE: Record<
  BookingStatus,
  { variant: "default" | "secondary" | "destructive" | "outline" | "success"; label: string }
> = {
  pending: { variant: "secondary", label: "Pending" },
  accepted: { variant: "default", label: "Accepted" },
  in_progress: { variant: "default", label: "In progress" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  no_show: { variant: "outline", label: "No show" },
};

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function BookingRow({ booking }: { booking: BookingRowData }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const tone = STATUS_TONE[booking.status];

  const update = (
    next: BookingStatus,
    extra?: { cancelledReason?: string },
  ) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next, ...extra }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(data?.error?.message ?? `Failed (${res.status})`);
        }
        toast.success(
          next === "accepted"
            ? "Booking accepted"
            : next === "in_progress"
            ? "Marked in progress"
            : next === "completed"
            ? "Booking completed"
            : next === "cancelled"
            ? "Booking cancelled"
            : "Updated",
        );
        setCancelOpen(false);
        setReason("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {booking.customerName}
            </h3>
            <Badge variant={tone.variant}>{tone.label}</Badge>
          </div>
          {booking.serviceTitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {booking.serviceTitle}
            </p>
          ) : null}
          <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-start gap-1.5">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{formatScheduled(booking.scheduledAt)}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{booking.address}</span>
            </div>
            {booking.customerPhone ? (
              <div className="flex items-start gap-1.5">
                <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${booking.customerPhone}`}
                  className="hover:text-foreground"
                >
                  {booking.customerPhone}
                </a>
              </div>
            ) : null}
          </dl>
          {booking.notes ? (
            <p className="mt-2 line-clamp-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
              {booking.notes}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatINR(booking.priceQuoted)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        {booking.status === "pending" ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => update("accepted")}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
            Accept
          </Button>
        ) : null}
        {booking.status === "accepted" ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => update("in_progress")}
          >
            <PlayCircle className="size-3.5" aria-hidden="true" />
            Start work
          </Button>
        ) : null}
        {booking.status === "in_progress" ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => update("completed")}
          >
            <Check className="size-3.5" aria-hidden="true" />
            Mark completed
          </Button>
        ) : null}
        {booking.status === "pending" ||
        booking.status === "accepted" ||
        booking.status === "in_progress" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
          >
            <X className="size-3.5" aria-hidden="true" />
            Cancel
          </Button>
        ) : null}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              Let the customer know why. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`cancel-reason-${booking.id}`}>Reason</Label>
            <Textarea
              id={`cancel-reason-${booking.id}`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unable to reach location"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={pending}
            >
              Keep booking
            </Button>
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                update("cancelled", { cancelledReason: reason.trim() })
              }
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

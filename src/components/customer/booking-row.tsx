"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  IndianRupee,
  MapPin,
  MessageSquarePlus,
  StickyNote,
  X,
} from "lucide-react";

import { CancelBookingDialog } from "@/components/customer/cancel-booking-dialog";
import { UpiPaymentCard } from "@/components/upi-payment-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { bookings } from "@/lib/db/schema";
import { formatINR, initials } from "@/lib/utils";

type BookingStatus = (typeof bookings.$inferSelect)["status"];
type PaymentStatus = (typeof bookings.$inferSelect)["paymentStatus"];

export type BookingRowData = {
  id: string;
  scheduledAt: string;
  address: string;
  notes: string | null;
  priceQuoted: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  upiTxnRef: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    image: string | null;
    headline: string;
    city: string;
    upiVpa: string | null;
  };
  hasReview: boolean;
  locale: "en" | "hi";
};

const STATUS_VARIANTS: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  pending: "secondary",
  accepted: "default",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const PAY_VARIANTS: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  unpaid: "outline",
  initiated: "secondary",
  paid: "success",
  refunded: "secondary",
  failed: "destructive",
};

function formatScheduled(iso: string, locale: "en" | "hi"): string {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function generateTxnRef(bookingId: string): string {
  const tail =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `SS-${bookingId.slice(0, 8)}-${tail}`;
}

export function BookingRow({ data }: { data: BookingRowData }) {
  const cancellable = data.status === "pending" || data.status === "accepted";
  const payable =
    (data.paymentStatus === "unpaid" || data.paymentStatus === "failed") &&
    data.status !== "cancelled" &&
    data.status !== "no_show";
  const reviewable = data.status === "completed" && !data.hasReview;

  return (
    <Card id={data.id}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <Avatar className="size-12 border">
          {data.provider.image ? <AvatarImage src={data.provider.image} alt="" /> : null}
          <AvatarFallback>{initials(data.provider.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/providers/${data.provider.id}`}
                className="truncate text-sm font-semibold hover:underline focus-visible:underline"
              >
                {data.provider.name}
              </Link>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {data.provider.headline}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_VARIANTS[data.status]}>{STATUS_LABELS[data.status]}</Badge>
              <Badge variant={PAY_VARIANTS[data.paymentStatus]} className="capitalize">
                {data.paymentStatus}
              </Badge>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Scheduled</dt>
              <dd>{formatScheduled(data.scheduledAt, data.locale)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <IndianRupee className="size-3.5 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Quoted price</dt>
              <dd className="font-semibold text-foreground">{formatINR(data.priceQuoted)}</dd>
            </div>
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Address</dt>
              <dd className="line-clamp-2">{data.address}</dd>
            </div>
            {data.notes ? (
              <div className="flex items-start gap-1.5 sm:col-span-2">
                <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <dt className="sr-only">Notes</dt>
                <dd className="line-clamp-2">{data.notes}</dd>
              </div>
            ) : null}
            {data.status === "cancelled" && data.cancelledReason ? (
              <div className="sm:col-span-2">
                <dt className="sr-only">Cancellation reason</dt>
                <dd className="text-destructive">Cancelled: {data.cancelledReason}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/providers/${data.provider.id}`}>
                <ExternalLink className="size-4" aria-hidden="true" />
                View provider
              </Link>
            </Button>

            {payable ? (
              <PayDialog
                bookingId={data.id}
                amount={data.priceQuoted}
                payeeName={data.provider.name}
                vpa={data.provider.upiVpa}
                txnRef={data.upiTxnRef ?? generateTxnRef(data.id)}
              />
            ) : null}

            {reviewable ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/providers/${data.provider.id}?review=${data.id}`}>
                  <MessageSquarePlus className="size-4" aria-hidden="true" />
                  Leave a review
                </Link>
              </Button>
            ) : null}

            {cancellable ? (
              <CancelBookingDialog
                bookingId={data.id}
                trigger={
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <X className="size-4" aria-hidden="true" />
                    Cancel
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PayDialog({
  bookingId,
  amount,
  payeeName,
  vpa,
  txnRef,
}: {
  bookingId: string;
  amount: number;
  payeeName: string;
  vpa: string | null;
  txnRef: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!vpa} aria-disabled={!vpa}>
          <IndianRupee className="size-4" aria-hidden="true" />
          Pay via UPI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {payeeName}</DialogTitle>
          <DialogDescription>
            UPI is settled directly between you and the provider. SevaSetu does not hold funds.
          </DialogDescription>
        </DialogHeader>
        {vpa ? (
          <UpiPaymentCard
            vpa={vpa}
            amountInr={amount}
            payeeName={payeeName}
            txnRef={txnRef}
            note={`SevaSetu booking ${bookingId.slice(0, 8)}`}
            onSettled={() => setOpen(false)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            This provider hasn&apos;t set up a UPI ID yet. Please contact them to arrange payment.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { Copy, ExternalLink, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/utils";

type Props = {
  vpa: string;
  amountInr: number;
  payeeName: string;
  txnRef: string;
  note?: string;
  onSettled?: () => void;
};

function buildIntent({
  vpa,
  amountInr,
  payeeName,
  txnRef,
  note,
}: Pick<Props, "vpa" | "amountInr" | "payeeName" | "txnRef" | "note">): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amountInr.toFixed(2),
    cu: "INR",
    tr: txnRef,
  });
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

export function UpiPaymentCard({ vpa, amountInr, payeeName, txnRef, note, onSettled }: Props) {
  const intent = React.useMemo(
    () => buildIntent({ vpa, amountInr, payeeName, txnRef, note }),
    [vpa, amountInr, payeeName, txnRef, note],
  );
  const [marking, setMarking] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const onPay = () => {
    if (typeof window === "undefined") return;
    window.location.href = intent;
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(vpa);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const onMarkPaid = async () => {
    setMarking(true);
    try {
      const res = await fetch("/api/upi/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnRef }),
      });
      if (!res.ok) {
        const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Could not mark as paid");
      }
      setDone(true);
      toast.success("Payment marked as settled");
      onSettled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMarking(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Pay via UPI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Payee</div>
            <div className="truncate text-sm font-medium">{payeeName}</div>
            <button
              type="button"
              onClick={onCopy}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
              aria-label="Copy UPI ID"
            >
              <span className="font-mono">{vpa}</span>
              <Copy className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Amount</div>
            <div className="text-lg font-semibold">{formatINR(amountInr)}</div>
          </div>
        </div>

        <div
          className="grid place-items-center rounded-md border border-dashed bg-muted/40 px-4 py-6 text-center"
          aria-label="UPI QR placeholder"
        >
          <QrCode className="mb-2 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)
          </p>
          <p className="mt-1 break-all text-[10px] text-muted-foreground/70">{intent}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onPay} className="flex-1" type="button">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Pay via UPI
          </Button>
          <Button
            type="button"
            variant={done ? "secondary" : "outline"}
            onClick={onMarkPaid}
            disabled={marking || done}
            className="flex-1"
          >
            {done ? "Marked as paid" : marking ? "Confirming…" : "Mark as paid"}
          </Button>
        </div>

        <Separator />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Reference {txnRef}. UPI is settled directly between you and the provider. SevaSetu does
          not hold funds.
        </p>
      </CardContent>
    </Card>
  );
}

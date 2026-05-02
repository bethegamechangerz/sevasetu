"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  gstinState,
  isValidGstinChecksum,
  isValidGstinFormat,
} from "@/lib/kyc/gst";
import { cn } from "@/lib/utils";

export interface GstFlowProps {
  initial?: {
    status: "unverified" | "pending" | "verified" | "failed";
    gstin?: string | null;
  };
  onVerified?: (info: { gstin: string; state: string | null }) => void;
  className?: string;
}

export function GstFlow({ initial, onVerified, className }: GstFlowProps) {
  const [verified, setVerified] = React.useState<{
    gstin: string;
    state: string | null;
  } | null>(
    initial?.status === "verified" && initial.gstin
      ? { gstin: initial.gstin, state: gstinState(initial.gstin) }
      : null,
  );
  const [gstin, setGstin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const upper = gstin.toUpperCase();
  const formatOk = isValidGstinFormat(upper);
  const checksumOk = formatOk && isValidGstinChecksum(upper);
  const liveState = formatOk ? gstinState(upper) : null;

  const submit = () => {
    setError(null);
    if (!formatOk) {
      setError("Enter a valid 15-character GSTIN");
      return;
    }
    if (!checksumOk) {
      setError("GSTIN check digit is invalid");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/kyc/gst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gstin: upper }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              status?: "VALID" | "INVALID";
              gstin?: string;
              state?: string | null;
              error?: { message?: string };
            }
          | null;
        if (!res.ok || data?.status !== "VALID") {
          throw new Error(data?.error?.message ?? "GSTIN verification failed");
        }
        const finalGstin = data.gstin ?? upper;
        const finalState = data.state ?? gstinState(finalGstin);
        setVerified({ gstin: finalGstin, state: finalState });
        onVerified?.({ gstin: finalGstin, state: finalState });
        toast.success("GSTIN verified");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "GSTIN verification failed";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  if (verified) {
    return (
      <Card className={cn("border-emerald-500/30 bg-emerald-500/5", className)}>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2
            className="size-5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">GSTIN verified</p>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">{verified.gstin}</code>
              {verified.state ? ` · ${verified.state}` : null}
            </p>
          </div>
          <Badge variant="success">Verified</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Optional.</strong> GSTIN format and checksum are validated
          locally. Live GSTN portal verification is simulated for the demo.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gstin">GSTIN (optional)</Label>
        <Input
          id="gstin"
          autoComplete="off"
          maxLength={15}
          placeholder="22AAAAA0000A1Z5"
          value={gstin}
          onChange={(e) =>
            setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "gstin-error" : "gstin-help"}
          className="font-mono uppercase tracking-[0.15em]"
        />
        {error ? (
          <p id="gstin-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : liveState ? (
          <p id="gstin-help" className="text-xs text-muted-foreground">
            State: <span className="font-medium">{liveState}</span>
            {checksumOk ? null : " · checksum pending"}
          </p>
        ) : (
          <p id="gstin-help" className="text-xs text-muted-foreground">
            15 characters, includes state code and PAN.
          </p>
        )}
      </div>
      <Button
        type="button"
        onClick={submit}
        disabled={pending || !formatOk || !checksumOk}
        className="w-full sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Verify GSTIN
          </>
        )}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidAadhaarFormat, lastFour } from "@/lib/kyc/aadhaar";
import { cn } from "@/lib/utils";

type Phase = "input" | "otp" | "verified";

export interface AadhaarFlowProps {
  initial?: {
    status: "unverified" | "pending" | "verified" | "failed";
    last4?: string | null;
  };
  onVerified?: (info: { last4: string }) => void;
  className?: string;
}

interface SendOtpResponse {
  txnId: string;
  sentTo: string;
  expiresInSec: number;
  demoOtp?: string;
}

export function AadhaarFlow({ initial, onVerified, className }: AadhaarFlowProps) {
  const [phase, setPhase] = React.useState<Phase>(
    initial?.status === "verified" ? "verified" : "input",
  );
  const [aadhaar, setAadhaar] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [txnId, setTxnId] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [demoOtp, setDemoOtp] = React.useState<string | null>(null);
  const [last4, setLast4] = React.useState<string | null>(initial?.last4 ?? null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const aadhaarValid = isValidAadhaarFormat(aadhaar);

  const sendOtp = () => {
    setError(null);
    if (!aadhaarValid) {
      setError("Enter a valid 12-digit Aadhaar number");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/kyc/aadhaar/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aadhaar: aadhaar.replace(/\D/g, "") }),
        });
        const data = (await res.json().catch(() => null)) as
          | (SendOtpResponse & { error?: { message?: string } })
          | null;
        if (!res.ok || !data?.txnId) {
          throw new Error(data?.error?.message ?? "Could not send OTP");
        }
        setTxnId(data.txnId);
        setSentTo(data.sentTo);
        setDemoOtp(data.demoOtp ?? null);
        setPhase("otp");
        toast.success("OTP sent");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Send failed";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  const verifyOtp = () => {
    setError(null);
    if (!txnId || otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/kyc/aadhaar/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txnId,
            otp,
            aadhaar: aadhaar.replace(/\D/g, ""),
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { verified?: boolean; error?: { message?: string } }
          | null;
        if (!res.ok || !data?.verified) {
          throw new Error(data?.error?.message ?? "Verification failed");
        }
        const l4 = lastFour(aadhaar);
        setLast4(l4);
        setPhase("verified");
        onVerified?.({ last4: l4 });
        toast.success("Aadhaar verified");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  if (phase === "verified" && last4) {
    return (
      <Card className={cn("border-emerald-500/30 bg-emerald-500/5", className)}>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2
            className="size-5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Aadhaar verified</p>
            <p className="text-xs text-muted-foreground">
              XXXX-XXXX-{last4}
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
          <strong>Demo verification.</strong> Real UIDAI integration requires a
          KUA/AUA license. This flow simulates the UIDAI send/verify shape.
        </p>
      </div>

      {phase === "input" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="aadhaar">Aadhaar number</Label>
            <Input
              id="aadhaar"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              placeholder="XXXX XXXX XXXX"
              value={aadhaar}
              onChange={(e) => {
                const cleaned = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 12)
                  .replace(/(\d{4})(?=\d)/g, "$1 ");
                setAadhaar(cleaned);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "aadhaar-error" : undefined}
            />
            {error ? (
              <p id="aadhaar-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                We&apos;ll only ever store the last 4 digits.
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={sendOtp}
            disabled={pending || !aadhaarValid}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending OTP…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" aria-hidden="true" />
                Send OTP
              </>
            )}
          </Button>
        </div>
      ) : null}

      {phase === "otp" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            OTP sent to <span className="font-medium">{sentTo}</span>.
          </p>
          {demoOtp ? (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-medium">Demo OTP:</span>{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-sm tracking-widest">
                {demoOtp}
              </code>
              <p className="mt-1 text-muted-foreground">
                Real UIDAI never returns OTP in the response. Shown here for testing only.
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="otp">6-digit OTP</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "otp-error" : undefined}
              className="font-mono text-base tracking-[0.3em]"
            />
            {error ? (
              <p id="otp-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={verifyOtp}
              disabled={pending || otp.length !== 6}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                "Verify OTP"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPhase("input");
                setOtp("");
                setError(null);
              }}
              disabled={pending}
            >
              Change number
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

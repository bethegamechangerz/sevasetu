"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidPanFormat, panEntityType } from "@/lib/kyc/pan";
import { cn } from "@/lib/utils";

export interface PanFlowProps {
  initial?: {
    status: "unverified" | "pending" | "verified" | "failed";
    pan?: string | null;
  };
  onVerified?: (info: { pan: string; entityType: string }) => void;
  className?: string;
}

export function PanFlow({ initial, onVerified, className }: PanFlowProps) {
  const [verified, setVerified] = React.useState<{
    pan: string;
    entityType: string;
  } | null>(
    initial?.status === "verified" && initial.pan
      ? { pan: initial.pan, entityType: panEntityType(initial.pan) }
      : null,
  );
  const [pan, setPan] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const upper = pan.toUpperCase();
  const formatOk = isValidPanFormat(upper);
  const entity = formatOk ? panEntityType(upper) : null;

  const submit = () => {
    setError(null);
    if (!formatOk) {
      setError("Enter a valid PAN (e.g. ABCDE1234F)");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/kyc/pan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pan: upper }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              status?: "VALID" | "INVALID";
              entityType?: string;
              pan?: string;
              error?: { message?: string };
            }
          | null;
        if (!res.ok || data?.status !== "VALID") {
          throw new Error(data?.error?.message ?? "PAN verification failed");
        }
        const finalPan = data.pan ?? upper;
        const finalType = data.entityType ?? panEntityType(finalPan);
        setVerified({ pan: finalPan, entityType: finalType });
        onVerified?.({ pan: finalPan, entityType: finalType });
        toast.success("PAN verified");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "PAN verification failed";
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
            <p className="text-sm font-medium">PAN verified</p>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">{verified.pan}</code> · {verified.entityType}
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
          <strong>Demo verification.</strong> Real NSDL/Protean PAN verification
          needs TIN-FC registration. We validate format here; real lookup is simulated.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pan">PAN number</Label>
        <Input
          id="pan"
          autoComplete="off"
          maxLength={10}
          placeholder="ABCDE1234F"
          value={pan}
          onChange={(e) =>
            setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "pan-error" : "pan-help"}
          className="font-mono uppercase tracking-[0.2em]"
        />
        {error ? (
          <p id="pan-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : entity ? (
          <p id="pan-help" className="text-xs text-muted-foreground">
            Detected entity: <span className="font-medium">{entity}</span>
          </p>
        ) : (
          <p id="pan-help" className="text-xs text-muted-foreground">
            10 characters, format AAAAA9999A.
          </p>
        )}
      </div>
      <Button
        type="button"
        onClick={submit}
        disabled={pending || !formatOk}
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
            Verify PAN
          </>
        )}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[sevasetu] route error", error);
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20"
          >
            <AlertTriangle className="size-5" />
          </span>
          <CardTitle className="text-xl tracking-tight">
            Something went wrong.
          </CardTitle>
          <CardDescription>
            कुछ गलत हो गया. We hit an unexpected error. Try again, and if it keeps
            happening, head back home.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="size-4" aria-hidden="true" />
              Go home
            </Link>
          </Button>
          {error.digest ? (
            <p className="ml-auto self-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              ref · {error.digest}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

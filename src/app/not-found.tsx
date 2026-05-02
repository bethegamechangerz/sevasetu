import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-12">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          404
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-2 text-balance text-muted-foreground" lang="hi">
          पृष्ठ नहीं मिला
        </p>
        <p className="mt-5 text-pretty text-muted-foreground">
          The page you were looking for doesn&apos;t exist or has moved. Try searching
          for a service instead.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="size-4" aria-hidden="true" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/browse">
              <Compass className="size-4" aria-hidden="true" />
              Browse services
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.3] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] dark:opacity-15" />
        <div className="absolute -top-32 right-[-10%] size-[36rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 left-[-10%] size-[32rem] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link
            href="/"
            aria-label="SevaSetu home"
            className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <svg viewBox="0 0 32 32" className="size-6" fill="none" strokeLinecap="round">
                <path d="M3 22 C 9 12, 14 12, 16 18" stroke="currentColor" strokeWidth="2.4" />
                <path d="M16 18 C 18 12, 23 12, 29 22" stroke="hsl(var(--accent))" strokeWidth="2.4" />
                <circle cx="16" cy="18" r="2.1" fill="currentColor" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight">
                Seva<span className="text-primary">Setu</span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                सेवा सेतु
              </span>
            </span>
          </Link>
        </div>

        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {"By continuing you agree to our "}
          <Link href="/legal/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          {" and "}
          <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

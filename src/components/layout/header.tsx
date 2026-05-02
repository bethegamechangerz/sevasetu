import { cookies, headers } from "next/headers";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth-helpers";
import { getServerLocale, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "./locale-toggle";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

async function resolveLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("sevasetu_locale")?.value;
  if (v === "en" || v === "hi") return v;
  const h = await headers();
  return getServerLocale(h.get("accept-language"));
}

function Logo({ className = "" }: { className?: string }) {
  // SevaSetu mark: two arcs forming a bridge (Setu) with a connecting node.
  // Emerald primary arc + saffron accent arc.
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="SevaSetu">
      <span
        aria-hidden="true"
        className="relative grid size-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
      >
        <svg viewBox="0 0 32 32" className="size-5" fill="none" strokeLinecap="round">
          <path
            d="M3 22 C 9 12, 14 12, 16 18"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path
            d="M16 18 C 18 12, 23 12, 29 22"
            stroke="hsl(var(--accent))"
            strokeWidth="2.4"
          />
          <circle cx="16" cy="18" r="2.1" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">
          Seva<span className="text-primary">Setu</span>
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          सेवा सेतु
        </span>
      </span>
    </span>
  );
}

export async function Header() {
  const [locale, user] = await Promise.all([resolveLocale(), getSessionUser()]);

  const navItems: { href: string; label: string }[] = [
    { href: "/browse", label: t(locale, "nav.browse") },
    { href: "/signup?role=provider", label: t(locale, "nav.becomeProvider") },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${process.env.NEXT_PUBLIC_APP_NAME ?? "SevaSetu"} home`}
          >
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:bg-accent/40 focus-visible:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/browse"
            aria-label={t(locale, "common.search")}
            className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground sm:inline-flex"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
          <LocaleToggle />
          <ThemeToggle />

          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t(locale, "nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/signup">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {t(locale, "nav.signup")}
                </Link>
              </Button>
            </div>
          )}

          <MobileNav
            locale={locale}
            isAuthed={!!user}
            navItems={navItems}
            labels={{
              dashboard: t(locale, "nav.dashboard"),
              bookings: t(locale, "nav.bookings"),
              signin: t(locale, "nav.signin"),
              signup: t(locale, "nav.signup"),
              open: locale === "hi" ? "मेनू खोलें" : "Open menu",
              close: locale === "hi" ? "बंद करें" : "Close",
              nav: locale === "hi" ? "नेविगेशन" : "Navigation",
            }}
          />
        </div>
      </div>
    </header>
  );
}

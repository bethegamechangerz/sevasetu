import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { Locale } from "@/lib/i18n";

const Icons = LucideIcons as unknown as Record<string, LucideIcon>;

function getIcon(name: string): LucideIcon {
  return Icons[name] ?? LucideIcons.Sparkles;
}

type Props = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function CategoryGrid({ locale, title, subtitle, className }: Props) {
  return (
    <section
      aria-labelledby="categories-heading"
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {locale === "hi" ? "श्रेणियाँ" : "Categories"}
          </p>
          <h2
            id="categories-heading"
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {title ??
              (locale === "hi" ? "हर सेवा, एक जगह" : "Every service, one place")}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
          ) : (
            <p className="mt-2 max-w-xl text-muted-foreground">
              {locale === "hi"
                ? "सत्यापित प्रदाता, पारदर्शी मूल्य, असली समीक्षाएँ।"
                : "Verified providers, transparent pricing, real reviews."}
            </p>
          )}
        </div>
        <Link
          href="/browse"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          {locale === "hi" ? "सभी देखें" : "View all"}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <ul
        role="list"
        className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        {CATEGORIES.map((c) => {
          const Icon = getIcon(c.icon);
          const name = locale === "hi" ? c.nameHi : c.nameEn;
          const subname = locale === "hi" ? c.nameEn : c.nameHi;
          return (
            <li key={c.slug}>
              <Link
                href={`/browse?category=${c.slug}`}
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:border-primary/30 focus-visible:shadow-md sm:p-5"
                aria-label={`${c.nameEn} · ${c.nameHi}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 opacity-0 transition-opacity group-hover:opacity-100"
                />
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 transition-colors group-hover:bg-primary/15"
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {name}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-muted-foreground"
                    lang={locale === "hi" ? "en" : "hi"}
                  >
                    {subname}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="absolute right-3 top-3 size-4 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

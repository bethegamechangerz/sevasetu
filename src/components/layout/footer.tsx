import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getServerLocale, t, type Locale } from "@/lib/i18n";

async function resolveLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("sevasetu_locale")?.value;
  if (v === "en" || v === "hi") return v;
  const h = await headers();
  return getServerLocale(h.get("accept-language"));
}

type Col = { heading: string; links: { href: string; label: string }[] };

export async function Footer() {
  const locale = await resolveLocale();
  const year = new Date().getFullYear();

  const columns: Col[] = [
    {
      heading: locale === "hi" ? "ग्राहक" : "Customers",
      links: [
        { href: "/browse", label: locale === "hi" ? "सेवाएँ खोजें" : "Browse services" },
        { href: "/how-it-works", label: locale === "hi" ? "कैसे काम करता है" : "How it works" },
        { href: "/safety", label: locale === "hi" ? "सुरक्षा" : "Safety" },
        { href: "/help", label: locale === "hi" ? "मदद चाहिए" : "Help center" },
      ],
    },
    {
      heading: locale === "hi" ? "सेवा प्रदाता" : "Providers",
      links: [
        { href: "/signup?role=provider", label: t(locale, "nav.becomeProvider") },
        { href: "/provider/guidelines", label: locale === "hi" ? "दिशानिर्देश" : "Guidelines" },
        { href: "/provider/payouts", label: locale === "hi" ? "भुगतान" : "Payouts" },
        { href: "/provider/verification", label: locale === "hi" ? "सत्यापन" : "Verification" },
      ],
    },
    {
      heading: locale === "hi" ? "कंपनी" : "Company",
      links: [
        { href: "/about", label: locale === "hi" ? "हमारे बारे में" : "About" },
        { href: "/careers", label: locale === "hi" ? "करियर" : "Careers" },
        { href: "/press", label: locale === "hi" ? "प्रेस" : "Press" },
        { href: "/contact", label: locale === "hi" ? "संपर्क" : "Contact" },
      ],
    },
    {
      heading: locale === "hi" ? "क़ानूनी" : "Legal",
      links: [
        { href: "/legal/terms", label: locale === "hi" ? "उपयोग की शर्तें" : "Terms" },
        { href: "/legal/privacy", label: locale === "hi" ? "गोपनीयता" : "Privacy" },
        { href: "/legal/dpdp", label: "DPDP Act 2023" },
        { href: "/legal/grievance", label: locale === "hi" ? "शिकायत निवारण" : "Grievance officer" },
      ],
    },
  ];

  return (
    <footer
      role="contentinfo"
      className="mt-24 border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
              >
                <svg viewBox="0 0 32 32" className="size-5" fill="none" strokeLinecap="round">
                  <path d="M3 22 C 9 12, 14 12, 16 18" stroke="currentColor" strokeWidth="2.4" />
                  <path d="M16 18 C 18 12, 23 12, 29 22" stroke="hsl(var(--accent))" strokeWidth="2.4" />
                  <circle cx="16" cy="18" r="2.1" fill="currentColor" />
                </svg>
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight">
                  Seva<span className="text-primary">Setu</span>
                </span>
                <span className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  सेवा सेतु
                </span>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm text-muted-foreground">
              {t(locale, "app.tagline")}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground" lang={locale === "en" ? "hi" : "en"}>
              {locale === "en"
                ? "विश्वसनीय स्थानीय सेवाएँ। सत्यापित। पास में।"
                : "Trusted local services. Verified. Nearby."}
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              ONDC discoverable · DPDP Act 2023 compliant
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-4">
            {columns.map((col) => (
              <div key={col.heading}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {col.heading}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} SevaSetu. {locale === "hi" ? "मेड इन इंडिया।" : "Made in India for India."}
          </p>
          <p className="text-xs text-muted-foreground">
            {locale === "hi"
              ? "कोई भी डेटा सहमति के बिना साझा नहीं किया जाता।"
              : "We never share your data without consent."}
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { cookies, headers } from "next/headers";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  CreditCard,
  Globe2,
  IndianRupee,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CategoryGrid } from "@/components/category-grid";
import { SearchBar } from "@/components/search-bar";
import { getServerLocale, t, type Locale } from "@/lib/i18n";

async function resolveLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("sevasetu_locale")?.value;
  if (v === "en" || v === "hi") return v;
  const h = await headers();
  return getServerLocale(h.get("accept-language"));
}

export default async function Home() {
  const locale = await resolveLocale();

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Hero locale={locale} />
        <CategoryGrid locale={locale} className="mt-20 sm:mt-24" />
        <HowItWorks locale={locale} />
        <Trust locale={locale} />
        <ProviderCta locale={locale} />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------- Hero ----------------------- */
function Hero({ locale }: { locale: Locale }) {
  const heroEn = "Trusted local help, verified and nearby.";
  const heroHi = "विश्वसनीय स्थानीय मदद, सत्यापित और पास में।";
  const subEn = t("en", "landing.heroSubtitle");
  const subHi = t("hi", "landing.heroSubtitle");

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/50"
    >
      {/* Background scenery: subtle, distinctive, not generic AI gradient slop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] dark:opacity-20" />
        <div className="absolute -top-32 right-[-10%] size-[42rem] rounded-full bg-primary/15 blur-3xl dark:bg-primary/10" />
        <div className="absolute -bottom-40 left-[-10%] size-[38rem] rounded-full bg-accent/10 blur-3xl dark:bg-accent/[0.07]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {locale === "hi"
              ? "ONDC-डिस्कवरेबल (सिमुलेटेड डेमो) · पूरे भारत में"
              : "ONDC-discoverable (simulated demo) · across India"}
          </span>

          <h1
            id="hero-heading"
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[5rem]"
          >
            <span className="block">
              {locale === "hi" ? heroHi : heroEn}
            </span>
            <span
              className="mt-3 block text-2xl font-medium leading-[1.3] tracking-tight text-muted-foreground sm:text-3xl lg:text-4xl"
              lang={locale === "hi" ? "en" : "hi"}
            >
              {locale === "hi" ? heroEn : heroHi}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {locale === "hi" ? subHi : subEn}
          </p>
        </div>

        {/* Search bar: front and centre */}
        <div className="mx-auto mt-10 max-w-4xl">
          <SearchBar locale={locale} />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              {locale === "hi" ? "Aadhaar सत्यापित" : "Aadhaar verified"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-3.5 text-primary" aria-hidden="true" />
              {locale === "hi" ? "पारदर्शी मूल्य" : "Transparent pricing"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5 text-primary" aria-hidden="true" />
              {locale === "hi" ? "UPI से भुगतान" : "Pay with UPI"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5 text-primary" aria-hidden="true" />
              {locale === "hi" ? "असली समीक्षाएँ" : "Real reviews"}
            </span>
          </div>
        </div>

        {/* Quick stats / social proof strip */}
        <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-3 divide-x divide-border/60 rounded-2xl border border-border/50 bg-background/60 backdrop-blur">
          <Stat
            value="20+"
            label={locale === "hi" ? "सेवा श्रेणियाँ" : "Service categories"}
          />
          <Stat
            value="100%"
            label={locale === "hi" ? "ID-सत्यापित प्रदाता" : "ID-verified providers"}
          />
          <Stat
            value="₹0"
            label={locale === "hi" ? "साइन-अप शुल्क" : "Sign-up fee"}
          />
        </dl>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-5 text-center sm:px-6 sm:py-6">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </dd>
    </div>
  );
}

/* ----------------------- How it works ----------------------- */
function HowItWorks({ locale }: { locale: Locale }) {
  const steps = [
    {
      n: "01",
      icon: Search,
      title: t(locale, "landing.step1Title"),
      body: t(locale, "landing.step1Body"),
    },
    {
      n: "02",
      icon: Compass,
      title: t(locale, "landing.step2Title"),
      body: t(locale, "landing.step2Body"),
    },
    {
      n: "03",
      icon: CreditCard,
      title: t(locale, "landing.step3Title"),
      body: t(locale, "landing.step3Body"),
    },
  ];
  return (
    <section
      aria-labelledby="how-heading"
      className="mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {locale === "hi" ? "तीन सरल चरण" : "Three simple steps"}
        </p>
        <h2
          id="how-heading"
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {t(locale, "landing.howItWorks")}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {locale === "hi"
            ? "खोजें, तुलना करें, बुक करें. मिनटों में।"
            : "Search, compare, book. In minutes."}
        </p>
      </div>

      <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
        />
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.n}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7"
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-sm font-medium tabular-nums text-muted-foreground/70">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ----------------------- Trust pillars ----------------------- */
function Trust({ locale }: { locale: Locale }) {
  const pillars = [
    {
      icon: BadgeCheck,
      title: t(locale, "landing.trustVerified"),
      body:
        locale === "hi"
          ? "हर प्रदाता का Aadhaar और PAN सत्यापित. सरकारी डेटाबेस से।"
          : "Every provider's Aadhaar and PAN is checked against government records.",
    },
    {
      icon: Globe2,
      title: t(locale, "landing.trustOndc"),
      body:
        locale === "hi"
          ? "ONDC के माध्यम से देशव्यापी पहुँच. एक प्रोफ़ाइल, हर जगह दिखें।"
          : "Discoverable across the Open Network for Digital Commerce. One profile, nationwide reach.",
    },
    {
      icon: Star,
      title: t(locale, "landing.trustReviews"),
      body:
        locale === "hi"
          ? "केवल पूरी हुई बुकिंग से समीक्षाएँ. कोई फ़र्जी रेटिंग नहीं।"
          : "Reviews only from completed bookings. No fake ratings, no paid stars.",
    },
    {
      icon: Wallet,
      title: t(locale, "landing.trustUpi"),
      body:
        locale === "hi"
          ? "किसी भी UPI ऐप से भुगतान करें। काम पूरा होने के बाद पैसे जारी।"
          : "Pay from any UPI app. Funds release only after the work is done.",
    },
  ];

  return (
    <section
      aria-labelledby="trust-heading"
      className="mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {locale === "hi" ? "भरोसा बनाया गया है" : "Trust, by design"}
        </p>
        <h2
          id="trust-heading"
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {t(locale, "landing.trustTitle")}
        </h2>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <li
              key={p.title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
              >
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ----------------------- Provider CTA ----------------------- */
function ProviderCta({ locale }: { locale: Locale }) {
  return (
    <section
      aria-labelledby="provider-cta-heading"
      className="mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-accent/[0.06] p-8 shadow-sm sm:p-12 lg:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-dots opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_60%)]"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {locale === "hi" ? "प्रदाताओं के लिए" : "For service providers"}
            </span>
            <h2
              id="provider-cta-heading"
              className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            >
              {locale === "hi"
                ? "अपना काम बढ़ाइए। SevaSetu पर शामिल हों।"
                : "Grow your work. List on SevaSetu."}
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">
              {locale === "hi"
                ? "₹0 साइन-अप। केवल पूरी हुई बुकिंग पर कमीशन। UPI में सीधे भुगतान। ONDC के ज़रिए पूरे भारत में मिलें।"
                : "Zero sign-up fee. Commission only on completed bookings. Direct UPI payouts. Reach customers nationwide via ONDC."}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup?role=provider">
                  {t(locale, "nav.becomeProvider")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/provider/guidelines">
                  {locale === "hi" ? "और जानें" : "Learn more"}
                </Link>
              </Button>
            </div>
          </div>

          <ul className="grid gap-3 text-sm">
            {[
              locale === "hi" ? "30 सेकंड में सेटअप" : "30-second setup",
              locale === "hi" ? "तत्काल UPI भुगतान" : "Instant UPI payouts",
              locale === "hi" ? "स्वयं की उपलब्धता" : "Set your own availability",
              locale === "hi" ? "ONDC नेटवर्क पर खोजे जाएँ" : "Discoverable on ONDC",
            ].map((line) => (
              <li
                key={line}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 backdrop-blur"
              >
                <BadgeCheck
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="font-medium">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

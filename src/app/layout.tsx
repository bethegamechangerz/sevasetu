import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getServerLocale, type Locale } from "@/lib/i18n";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: `${publicEnv.NEXT_PUBLIC_APP_NAME} · Trusted local services. Verified. Nearby.`,
    template: `%s · ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    "Book verified electricians, plumbers, tutors, cooks and more across India. Aadhaar + PAN verified providers, ONDC discoverable, UPI payments. सेवा सेतु · विश्वसनीय स्थानीय सेवाएँ।",
  applicationName: publicEnv.NEXT_PUBLIC_APP_NAME,
  keywords: [
    "local services India",
    "verified service providers",
    "ONDC",
    "UPI",
    "electrician near me",
    "plumber near me",
    "SevaSetu",
    "सेवा सेतु",
  ],
  authors: [{ name: "SevaSetu" }],
  openGraph: {
    type: "website",
    siteName: publicEnv.NEXT_PUBLIC_APP_NAME,
    title: `${publicEnv.NEXT_PUBLIC_APP_NAME} · Trusted local services. Verified. Nearby.`,
    description:
      "Verified local service providers across India. ONDC discoverable. UPI payments.",
    locale: "en_IN",
    alternateLocale: "hi_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${publicEnv.NEXT_PUBLIC_APP_NAME} · Trusted local services`,
    description:
      "Verified local service providers across India. ONDC discoverable. UPI payments.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function resolveLocale(): Promise<Locale> {
  const c = await cookies();
  const cookieLocale = c.get("sevasetu_locale")?.value;
  if (cookieLocale === "en" || cookieLocale === "hi") return cookieLocale;
  const h = await headers();
  return getServerLocale(h.get("accept-language"));
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await resolveLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${devanagari.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const COOKIE = "sevasetu_locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(): "en" | "hi" {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )sevasetu_locale=([^;]+)/);
  const v = m?.[1];
  return v === "hi" ? "hi" : "en";
}

export function LocaleToggle() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<"en" | "hi">("en");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setLocale(readCookie());
    setMounted(true);
  }, []);

  function toggle() {
    const next = locale === "en" ? "hi" : "en";
    document.cookie = `${COOKIE}=${next}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
    setLocale(next);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={`Switch language. Current: ${locale === "en" ? "English" : "Hindi"}`}
      className="h-9 gap-1.5 px-2.5 font-medium"
    >
      <Languages className="size-4" aria-hidden="true" />
      <span className="text-xs tabular-nums" aria-hidden={!mounted}>
        {mounted ? (locale === "en" ? "EN · हि" : "हि · EN") : "EN · हि"}
      </span>
    </Button>
  );
}

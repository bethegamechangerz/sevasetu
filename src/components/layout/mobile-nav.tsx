"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  isAuthed: boolean;
  navItems: { href: string; label: string }[];
  labels: {
    dashboard: string;
    bookings: string;
    signin: string;
    signup: string;
    open: string;
    close: string;
    nav: string;
  };
};

export function MobileNav({ locale, isAuthed, navItems, labels }: Props) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={labels.open}
          className="md:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-border/60 bg-background shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
              Seva<span className="text-primary">Setu</span>
              <span
                className="ml-2 align-middle text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                lang="hi"
              >
                सेवा सेतु
              </span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={labels.close}
                className="size-8"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            {labels.nav}
          </DialogPrimitive.Description>

          <nav
            aria-label={labels.nav}
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent/40 focus-visible:bg-accent/40"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border/60" />
            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent/40 focus-visible:bg-accent/40"
                >
                  {labels.dashboard}
                </Link>
                <Link
                  href="/bookings"
                  className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent/40 focus-visible:bg-accent/40"
                >
                  {labels.bookings}
                </Link>
              </>
            ) : (
              <div className="flex flex-col gap-2 p-2 pt-3">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">{labels.signin}</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/signup">{labels.signup}</Link>
                </Button>
              </div>
            )}
          </nav>

          <p
            className="border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground"
            lang={locale === "hi" ? "hi" : "en"}
          >
            {locale === "hi"
              ? "विश्वसनीय स्थानीय सेवाएँ। सत्यापित। पास में।"
              : "Trusted local services. Verified. Nearby."}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

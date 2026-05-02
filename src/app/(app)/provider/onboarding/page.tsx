import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/provider/onboarding-wizard";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Provider onboarding",
  description: "Set up your SevaSetu provider profile",
};

export default async function ProviderOnboardingPage() {
  const user = await requireRole(["provider", "admin"]);

  const existing = await db.query.providers.findFirst({
    where: eq(providers.userId, user.id),
  });
  if (existing) {
    redirect("/provider/dashboard");
  }

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          SevaSetu for Providers
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to SevaSetu
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Tell us about you, verify your identity, and you&apos;re live to nearby customers.
        </p>
      </header>
      <OnboardingWizard
        initialUser={{ id: user.id, name: user.name, email: user.email }}
      />
    </main>
  );
}

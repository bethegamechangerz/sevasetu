import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, providerCategories, providers, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { ProviderOnboardingSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = ProviderOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid provider onboarding data", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const existing = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (existing) {
    return NextResponse.json(
      { error: { code: "ALREADY_EXISTS", message: "Provider profile already exists" } },
      { status: 409 },
    );
  }

  const data = parsed.data;
  const participantId = `${user.id.slice(0, 8)}.bpp.sevasetu`;

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(providers)
      .values({
        userId: user.id,
        headline: data.headline,
        bio: data.bio,
        experienceYears: data.experienceYears,
        hourlyRateMin: data.hourlyRateMin,
        hourlyRateMax: data.hourlyRateMax,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        lat: data.lat,
        lng: data.lng,
        upiVpa: data.upiVpa && data.upiVpa.length > 0 ? data.upiVpa : null,
        ondcParticipantId: participantId,
        ondcSubscribedAt: new Date(),
      })
      .returning();

    if (data.categories.length > 0) {
      await tx
        .insert(providerCategories)
        .values(data.categories.map((slug) => ({ providerId: user.id, categorySlug: slug })));
    }

    await tx.update(users).set({ role: "provider", updatedAt: new Date() }).where(eq(users.id, user.id));

    await tx.insert(auditLog).values({
      actorId: user.id,
      action: "PROVIDER_CREATED",
      entity: "providers",
      entityId: user.id,
      metadata: JSON.stringify({ city: data.city, categories: data.categories }),
    });

    return row;
  });

  return NextResponse.json({ provider: created }, { status: 201 });
}

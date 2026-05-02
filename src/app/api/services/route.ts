import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, services } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { ServiceSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, user.id) });
  if (!provider) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "No provider profile" } }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = ServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid service", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const [row] = await db
    .insert(services)
    .values({
      providerId: user.id,
      categorySlug: data.categorySlug,
      title: data.title,
      description: data.description,
      price: data.price,
      priceUnit: data.priceUnit,
      durationMinutes: data.durationMinutes,
      isActive: data.isActive,
    })
    .returning();

  return NextResponse.json({ service: row }, { status: 201 });
}

import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { favorites, providers, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";

export const runtime = "nodejs";

const ToggleSchema = z.object({ providerId: z.string().min(1) }).strict();

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const rows = await db
    .select({
      providerId: favorites.providerId,
      createdAt: favorites.createdAt,
      provider: providers,
      user: { name: users.name, image: users.image },
    })
    .from(favorites)
    .innerJoin(providers, eq(providers.userId, favorites.providerId))
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt));
  return NextResponse.json({ items: rows });
}

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

  const parsed = ToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid body", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const { providerId } = parsed.data;

  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.providerId, providerId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.providerId, providerId)));
    return NextResponse.json({ favorited: false });
  }

  const provider = await db.query.providers.findFirst({ where: eq(providers.userId, providerId) });
  if (!provider) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Provider not found" } }, { status: 404 });
  }

  await db.insert(favorites).values({ userId: user.id, providerId });
  return NextResponse.json({ favorited: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId");
  if (!providerId) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "providerId is required" } }, { status: 400 });
  }
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.providerId, providerId)));
  return NextResponse.json({ ok: true });
}

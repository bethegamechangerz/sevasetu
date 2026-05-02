import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { PhoneSchema } from "@/lib/validators";

export const runtime = "nodejs";

const UserUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: PhoneSchema.optional(),
    locale: z.enum(["en", "hi"]).optional(),
  })
  .strict();

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  const u = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!u) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
  }
  return NextResponse.json({ user: u });
}

export async function PATCH(req: Request) {
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

  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid update", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ user: row });
}

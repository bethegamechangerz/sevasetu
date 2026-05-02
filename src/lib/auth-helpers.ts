import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "./db/schema";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "provider" | "admin";
  image: string | null;
  phone: string | null;
  locale: "en" | "hi";
};

/**
 * Returns the current session + a freshly-fetched user row (with role/phone).
 * Returns null if not signed in. Cached per-request via Next.js headers().
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as SessionUser["role"],
    image: u.image,
    phone: u.phone,
    locale: (u.locale === "hi" ? "hi" : "en") as "en" | "hi",
  };
}

export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`${redirectTo}?next=${encodeURIComponent("/")}`);
  return u;
}

export async function requireRole(role: SessionUser["role"] | SessionUser["role"][]): Promise<SessionUser> {
  const u = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(u.role)) redirect("/dashboard");
  return u;
}

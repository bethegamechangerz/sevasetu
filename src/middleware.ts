import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/bookings", "/settings", "/provider"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  // Better-auth session cookie. We don't decode it here - we just check presence.
  // Authoritative role checks happen server-side in the page (requireRole).
  const hasSession =
    req.cookies.get("sevasetu.session_token")?.value ||
    req.cookies.get("sevasetu.session-token")?.value;
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/bookings/:path*", "/settings/:path*", "/provider/:path*"],
};

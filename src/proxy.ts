import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 proxy (replaces middleware.ts).
 *
 * Zero external imports — safe for the Edge runtime.
 * Checks for the NextAuth session cookie to gate protected routes.
 * Full session validation still happens in server components / API routes
 * via `auth()` from @/auth (which runs in Node.js, not Edge).
 */
export default function proxy(req: NextRequest) {
  const { nextUrl } = req;

  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isProtectedPage =
    nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname === "/";

  // Public API routes that don't require authentication
  const isPublicApiRoute =
    nextUrl.pathname.startsWith("/api/workspace/invite/") &&
    req.method === "GET";

  const isProtected =
    isProtectedPage || (isApiRoute && !isAuthRoute && !isPublicApiRoute);

  if (!isProtected) return NextResponse.next();

  // NextAuth v5 session cookie names (covers http + https variants)
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token") ??
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (sessionCookie) {
    // Forward pathname so server components can read it for redirects.
    const res = NextResponse.next();
    res.headers.set("x-pathname", nextUrl.pathname);
    return res;
  }

  if (isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Root "/" just redirects to /dashboard anyway — skip the extra hop.
  const callbackPath =
    nextUrl.pathname === "/" ? "/dashboard" : nextUrl.pathname;
  const signInUrl = new URL("/sign-in", nextUrl);
  signInUrl.searchParams.set("callbackUrl", callbackPath);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    // Skip static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};

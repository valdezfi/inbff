/**
 * proxy.ts — Next.js 16 edge proxy (replaces middleware.ts)
 *
 * Role-based route protection:
 *   /dashboard/*  → "brand" role only
 *   /affiliate/*  → "creator" role only
 *
 * Reads the JWT session cookie directly at the edge (no DB call).
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me"
);

async function getRoleFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Brand dashboard: /dashboard/* ──────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const role = await getRoleFromRequest(req);
    if (!role) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Creators trying to access brand dashboard → redirect to their dashboard
    if (role === "creator") {
      return NextResponse.redirect(new URL("/affiliate/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Creator dashboard: /affiliate/* ───────────────────────────────────────
  if (pathname.startsWith("/affiliate")) {
    const role = await getRoleFromRequest(req);
    if (!role) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Brands trying to access creator dashboard → redirect to their dashboard
    if (role === "brand") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/affiliate/:path*"],
};

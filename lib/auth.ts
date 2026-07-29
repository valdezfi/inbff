import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// ── Production guard ──────────────────────────────────────────────────────────
// AUTH_SECRET must be set in production — a missing secret makes JWTs forgeable.
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error(
    "[inBFF] AUTH_SECRET environment variable is not set. " +
    "Run: openssl rand -hex 32  and set it in your .env.local or server environment."
  );
}

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me"
);

const COOKIE_NAME = "session";

// Session lifetime: 24h (was 30d — shorter = safer, roles can't be stale long)
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, role: string = "brand") {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      role:   (payload.role as string) ?? "brand",
    };
  } catch {
    // Token expired or invalid — treat as unauthenticated
    return null;
  }
}

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "session";

// Session lifetime: 24h


const SESSION_MAX_AGE = 60 * 60 * 24;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  // Guard runs at request time (not build time) so env vars are available
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[inBFF] AUTH_SECRET environment variable is not set. " +
        "Run: openssl rand -hex 32  and add it to your server environment."
      );
    }
    // Dev fallback — safe only for local development
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

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
    .sign(getSecret());

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
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role:   (payload.role as string) ?? "brand",
    };
  } catch {
    return null;
  }
}

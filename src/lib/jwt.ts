import jwt from "jsonwebtoken";

export const TOKEN_COOKIE = "auth_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/** Sign an HS256 JWT for an authenticated user. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

/** Verify a signed JWT. Returns null for missing/invalid/expired tokens. */
export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, secret());
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof (decoded as TokenPayload).email === "string"
    ) {
      return decoded as unknown as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set in the environment");
  return value;
}

export const tokenCookieOptions = {
  httpOnly: true,
  sameSite:
    process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TOKEN_TTL_SECONDS * 1000,
};

import { Request, Response, NextFunction } from "express";
import type { TokenPayload } from "./jwt";
import { TOKEN_COOKIE, verifyToken } from "./jwt";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  photoURL: string | null;
}

export function tokenFromRequest(req: Request): string | undefined {
  // Cookie first (used by the web client), then Authorization Bearer (tests/tools)
  if (req.cookies?.[TOKEN_COOKIE]) return req.cookies[TOKEN_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/** Resolve the authenticated user from the request, or null. */
export function getAuthUser(req: Request): AuthUser | null {
  const payload: TokenPayload | null = verifyToken(tokenFromRequest(req));
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    photoURL: payload.picture,
  };
}

/** Express middleware — reject requests without a valid JWT. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "You must be logged in to perform this action" });
    return;
  }
  res.locals.authUser = user;
  next();
}

/** 403 helper */
export function forbidden(res: Response, message = "You are not allowed to perform this action") {
  res.status(403).json({ error: message });
}

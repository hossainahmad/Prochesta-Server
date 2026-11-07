import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../lib/db";
import { getAuthUser } from "../lib/auth";
import { signToken, tokenCookieOptions, TOKEN_COOKIE } from "../lib/jwt";
import { loginSchema, registerSchema } from "../lib/validations";

const router = Router();

function toClientUser(user: { id: string; name: string; email: string; photoURL: string | null }) {
  return { id: user.id, name: user.name, email: user.email, image: user.photoURL };
}

/** GET /api/auth/providers — which OAuth providers are configured */
router.get("/providers", (_req: Request, res: Response) => {
  res.json({
    providers: {
      google: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

/** POST /api/auth/register — create an account (server-side password rules) */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      res.status(400).json({ error: firstError });
      return;
    }

    const { name, email, photoURL, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res
        .status(409)
        .json({ error: "An account with this email already exists. Please login instead." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { name, email: normalizedEmail, photoURL: photoURL || null, passwordHash },
    });

    res.status(201).json({
      message: "Registration successful! You can now login.",
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/** POST /api/auth/login — verify credentials and issue a JWT cookie */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.photoURL ?? null,
    });
    res.cookie(TOKEN_COOKIE, token, tokenCookieOptions);

    res.json({
      message: "Login successful!",
      user: toClientUser(user),
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/** POST /api/auth/logout — clear the auth cookie */
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(TOKEN_COOKIE, { ...tokenCookieOptions, maxAge: undefined });
  res.json({ message: "Logged out" });
});

/** GET /api/auth/me — current user from the JWT (for the client's auth context) */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Serve fresh profile data so the navbar follows profile updates
    const user = await db.user.findUnique({
      where: { email: auth.email },
      select: { id: true, name: true, email: true, photoURL: true },
    });
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({ user: toClientUser(user) });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ error: "Failed to load session" });
  }
});

/* ------------------------- Google OAuth (optional) ------------------------- */

router.get("/google", (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res
      .status(400)
      .json({ error: "Google login isn't configured in this environment" });
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("g_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 10 * 60 * 1000,
  });
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    include_granted_scopes: "true",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) {
    res.redirect(`${clientUrl}/login?error=google_not_configured`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const expectedState = req.cookies?.g_state;

  if (!code || !state || state !== expectedState) {
    res.redirect(`${clientUrl}/login?error=google_state`);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokens.access_token) throw new Error("token exchange failed");

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = (await infoRes.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!info.email || info.email_verified === false || !infoRes.ok) {
      throw new Error("userinfo failed");
    }

    const email = info.email.toLowerCase();
    const name = info.name?.trim() || email.split("@")[0];
    const photoURL = info.picture ?? null;

    // Upsert the OAuth user (MongoDB connector — relationMode emulated)
    const existing = await db.user.findUnique({ where: { email } });
    const user =
      existing ??
      (await db.user.create({
        data: { name, email, photoURL, passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10) },
      }));

    const token = signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.photoURL ?? null,
    });
    res.clearCookie("g_state");
    res.cookie(TOKEN_COOKIE, token, tokenCookieOptions);
    res.redirect(`${clientUrl}/login?oauth=success`);
  } catch (err) {
    console.error("GET /api/auth/google/callback error:", err);
    res.redirect(`${clientUrl}/login?error=google_failed`);
  }
});

export default router;

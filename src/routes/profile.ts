import { Router, Request, Response } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { profileSchema } from "../lib/validations";

const router = Router();

/** PUT /api/profile — update the logged-in user's name / photoURL */
router.put("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      res.status(400).json({ error: firstError });
      return;
    }

    const user = await db.user.update({
      where: { email: authUser.email },
      data: {
        name: parsed.data.name,
        photoURL: parsed.data.photoURL || null,
      },
      select: { id: true, name: true, email: true, photoURL: true },
    });

    res.json({
      message: "Profile updated successfully!",
      user: { id: user.id, name: user.name, email: user.email, image: user.photoURL },
    });
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/auth";

const router = Router();

/** GET /api/my-events  (JWT-protected) — events created by the current user */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;

    const events = await db.event.findMany({
      where: { creatorEmail: authUser.email },
      orderBy: { eventDate: "asc" },
      include: {
        _count: { select: { participants: true } },
      },
    });

    res.json({ events });
  } catch (err) {
    console.error("GET /api/my-events error:", err);
    res.status(500).json({ error: "Failed to load your events" });
  }
});

export default router;

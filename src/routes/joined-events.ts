import { Router, Request, Response } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * GET /api/joined-events  (JWT-protected)
 * All events joined by the logged-in user, sorted by event date (ascending).
 * Sorting is done in application code because MongoDB cannot order by
 * a relation field.
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;

    const participations = await db.participation.findMany({
      where: { userEmail: authUser.email },
      include: {
        event: {
          include: {
            creator: { select: { name: true, photoURL: true } },
            _count: { select: { participants: true } },
          },
        },
      },
    });

    const events = participations
      .map((p) => ({
        ...p.event,
        joinedAt: p.joinedAt,
      }))
      .sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );

    res.json({ events });
  } catch (err) {
    console.error("GET /api/joined-events error:", err);
    res.status(500).json({ error: "Failed to load joined events" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { db } from "../lib/db";
import { getAuthUser, requireAuth, forbidden } from "../lib/auth";
import { eventSchema, eventUpdateSchema } from "../lib/validations";

const router = Router();

function firstError(
  res: Response,
  error: { issues: Array<{ message?: string }> },
) {
  res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
}
router.get("/", async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 0, 100) : 0;

    const where: Record<string, unknown> = {
      eventDate: { gt: new Date() },
    };
    if (type && type !== "all") where.eventType = type;

    // MongoDB cannot index case-insensitive text via Prisma — filter in memory
    const searchLower = search?.toLowerCase().trim();

    const events = await db.event.findMany({
      where,
      orderBy: { eventDate: "asc" },
      // Fetch more when searching so in-memory filtering still fills the limit
      ...(limit > 0 ? { take: searchLower ? limit * 20 : limit } : {}),
      include: {
        _count: { select: { participants: true } },
        creator: { select: { name: true, photoURL: true } },
      },
    });

    const filtered = searchLower
      ? events.filter((e) =>
          [e.title, e.location, e.description].some((field) =>
            field.toLowerCase().includes(searchLower),
          ),
        )
      : events;

    res.json({ events: limit > 0 ? filtered.slice(0, limit) : filtered });
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

/** POST /api/events  (JWT-protected) — create an event */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      firstError(res, parsed.error);
      return;
    }

    const { title, description, eventType, thumbnailUrl, location, eventDate } =
      parsed.data;

    const event = await db.event.create({
      data: {
        title,
        description,
        eventType,
        thumbnailUrl,
        location,
        eventDate: new Date(eventDate),
        creatorEmail: authUser.email,
      },
    });

    res.status(201).json({ message: "Event created successfully!", event });
  } catch (err) {
    console.error("POST /api/events error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

/** GET /api/events/:id  (public — viewable without login, enriches viewer context) */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await db.event.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true, photoURL: true } },
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Enrich with viewer context when the requester happens to be logged in
    const authUser = getAuthUser(req);
    let joinedByMe = false;
    if (authUser) {
      const participation = await db.participation.findUnique({
        where: {
          eventId_userEmail: { eventId: id, userEmail: authUser.email },
        },
      });
      joinedByMe = Boolean(participation);
    }

    res.json({
      event,
      joinedByMe,
      isOwner: authUser ? event.creatorEmail === authUser.email : false,
    });
  } catch (err) {
    console.error("GET /api/events/:id error:", err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

/** PUT /api/events/:id  (JWT-protected, owner only) */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;
    const { id } = req.params;

    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.creatorEmail !== authUser.email) {
      forbidden(res, "You can only update events you created");
      return;
    }

    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      firstError(res, parsed.error);
      return;
    }

    const { title, description, eventType, thumbnailUrl, location, eventDate } =
      parsed.data;

    const updated = await db.event.update({
      where: { id },
      data: {
        title,
        description,
        eventType,
        thumbnailUrl,
        location,
        eventDate: new Date(eventDate),
      },
    });

    res.json({ message: "Event updated successfully!", event: updated });
  } catch (err) {
    console.error("PUT /api/events/:id error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

/** DELETE /api/events/:id  (JWT-protected, owner only) */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;
    const { id } = req.params;

    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.creatorEmail !== authUser.email) {
      forbidden(res, "You can only delete events you created");
      return;
    }

    // MongoDB does not enforce referential actions — remove participations first
    await db.participation.deleteMany({ where: { eventId: id } });
    await db.event.delete({ where: { id } });

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/events/:id error:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

/** POST /api/events/:id/join  (JWT-protected) */
router.post("/:id/join", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = res.locals.authUser;
    const { id } = req.params;

    const event = await db.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (event.eventDate.getTime() <= Date.now()) {
      res.status(400).json({ error: "This event has already taken place" });
      return;
    }

    if (event.creatorEmail === authUser.email) {
      res
        .status(403)
        .json({ error: "You created this event — you're already part of it!" });
      return;
    }

    const existing = await db.participation.findUnique({
      where: { eventId_userEmail: { eventId: id, userEmail: authUser.email } },
    });
    if (existing) {
      res.status(409).json({ error: "You have already joined this event" });
      return;
    }

    await db.participation.create({
      data: { eventId: id, userEmail: authUser.email },
    });

    const participantCount = await db.participation.count({
      where: { eventId: id },
    });

    res.status(201).json({
      message: `You joined "${event.title}"! See you there 🎉`,
      joined: true,
      participantCount,
    });
  } catch (err) {
    console.error("POST /api/events/:id/join error:", err);
    res.status(500).json({ error: "Failed to join event" });
  }
});

export default router;

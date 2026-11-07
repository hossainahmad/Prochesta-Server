import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import profileRoutes from "./routes/profile";
import myEventsRoutes from "./routes/my-events";
import joinedEventsRoutes from "./routes/joined-events";

const app = express();

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: [CLIENT_URL, "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health probe
app.get("/api", (_req, res) => {
  res.json({ name: "Volunify API", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/my-events", myEventsRoutes);
app.use("/api/joined-events", joinedEventsRoutes);
app.use("/api/events", eventRoutes);

// 404 for unknown API routes
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler (bad JSON etc.)
app.use(
  (
    err: Error & { type?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;

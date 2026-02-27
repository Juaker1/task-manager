import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { groupsRouter } from "./routes/groups.routes.js";
import { tasksRouter } from "./routes/tasks.routes.js";
import { subtasksRouter } from "./routes/subtasks.routes.js";

const app = new Hono();

// ── Middlewares globales ──────────────────────────────────────
app.use("*", corsMiddleware);

// ── Health check ──────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", message: "Task Manager API" }));

// ── Rutas de la API ───────────────────────────────────────────
app.route("/api/groups", groupsRouter);
app.route("/api/tasks", tasksRouter);

// Subtasks usa rutas mixtas (/tasks/:id/subtasks y /subtasks/:id)
// por eso se monta en /api directamente
app.route("/api", subtasksRouter);

// ── 404 Handler ───────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));

// ── Error Handler ─────────────────────────────────────────────
app.onError((err, c) => {
  console.error("[ERROR]", err.message);
  return c.json({ error: "Error interno del servidor" }, 500);
});

// ── Servidor ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`✅ Server running → http://localhost:${info.port}`);
});

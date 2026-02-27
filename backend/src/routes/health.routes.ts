import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { groups, tasks, subtasks } from "../db/schema.js";

export const healthRouter = new Hono();

// ── GET /health ───────────────────────────────────────────────
// Verifica el estado del servidor y la conectividad con cada tabla de la DB.
// Devuelve 200 si todo está bien, 503 si algún check falla.
healthRouter.get("/", async (c) => {
  const start = Date.now();

  type CheckResult =
    | { status: "ok"; count: number }
    | { status: "error"; message: string };

  const checks: Record<string, CheckResult> = {};

  // ── Check: tabla groups ───────────────────
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(groups);
    checks.groups = { status: "ok", count: Number(count) };
  } catch (err) {
    checks.groups = {
      status: "error",
      message: err instanceof Error ? err.message : "Error desconocido",
    };
  }

  // ── Check: tabla tasks ────────────────────
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks);
    checks.tasks = { status: "ok", count: Number(count) };
  } catch (err) {
    checks.tasks = {
      status: "error",
      message: err instanceof Error ? err.message : "Error desconocido",
    };
  }

  // ── Check: tabla subtasks ─────────────────
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subtasks);
    checks.subtasks = { status: "ok", count: Number(count) };
  } catch (err) {
    checks.subtasks = {
      status: "error",
      message: err instanceof Error ? err.message : "Error desconocido",
    };
  }

  // ── Resultado global ──────────────────────
  // Si algún check falló el status global pasa a "degraded"
  const allOk = Object.values(checks).every((ch) => ch.status === "ok");

  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - start}ms`,
      environment: process.env.NODE_ENV ?? "development",
      database: {
        engine: "SQLite (libsql)",
        checks,
      },
    },
    allOk ? 200 : 503
  );
});

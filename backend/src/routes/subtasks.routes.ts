import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { subtasks, tasks } from "../db/schema.js";
import {
  createSubtaskSchema,
  updateSubtaskSchema,
} from "../validators/subtask.validator.js";

export const subtasksRouter = new Hono();

// ── POST /api/tasks/:taskId/subtasks ─────────────────────────
// Crea una nueva subtarea dentro de una tarea existente.
subtasksRouter.post("/tasks/:taskId/subtasks", async (c) => {
  const taskId = Number(c.req.param("taskId"));

  if (isNaN(taskId)) {
    return c.json({ error: "ID de tarea inválido" }, 400);
  }

  // Verificamos que la tarea padre exista
  const parentTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    columns: { id: true },
  });

  if (!parentTask) {
    return c.json({ error: "Tarea no encontrada" }, 404);
  }

  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = createSubtaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const [created] = await db
      .insert(subtasks)
      .values({ ...parsed.data, taskId })
      .returning();

    return c.json({ data: created }, 201);
  } catch (error) {
    return c.json({ error: "Error al crear la subtarea" }, 500);
  }
});

// ── PUT /api/subtasks/:id ────────────────────────────────────
// Actualiza el título, el estado o el orden de una subtarea.
subtasksRouter.put("/subtasks/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = updateSubtaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const [updated] = await db
      .update(subtasks)
      .set(parsed.data)
      .where(eq(subtasks.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Subtarea no encontrada" }, 404);
    }

    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: "Error al actualizar la subtarea" }, 500);
  }
});

// ── DELETE /api/subtasks/:id ─────────────────────────────────
// Elimina una subtarea específica.
subtasksRouter.delete("/subtasks/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  try {
    const [deleted] = await db
      .delete(subtasks)
      .where(eq(subtasks.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Subtarea no encontrada" }, 404);
    }

    return c.json({ data: { id: deleted.id }, message: "Subtarea eliminada" });
  } catch (error) {
    return c.json({ error: "Error al eliminar la subtarea" }, 500);
  }
});

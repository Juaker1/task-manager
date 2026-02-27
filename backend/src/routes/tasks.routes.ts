import { Hono } from "hono";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

export const tasksRouter = new Hono();

// ── GET /api/tasks ───────────────────────────────────────────
// Devuelve todas las tareas incluyendo sus subtareas y grupo.
// Query params opcionales:
//   ?type=daily|regular   → filtra por tipo
//   ?groupId=1            → filtra por grupo
//   ?ungrouped=true       → solo tareas sin grupo
tasksRouter.get("/", async (c) => {
  try {
    const { type, groupId, ungrouped } = c.req.query();

    const allTasks = await db.query.tasks.findMany({
      with: {
        subtasks: {
          orderBy: (s, { asc }) => [asc(s.order)],
        },
        group: {
          columns: { id: true, name: true, color: true },
        },
      },
      where: (t, { eq, and, isNull }) => {
        const conditions = [];

        if (type === "daily" || type === "regular") {
          conditions.push(eq(t.type, type));
        }

        if (groupId) {
          conditions.push(eq(t.groupId, Number(groupId)));
        } else if (ungrouped === "true") {
          conditions.push(isNull(t.groupId));
        }

        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return c.json({ data: allTasks });
  } catch (error) {
    return c.json({ error: "Error al obtener las tareas" }, 500);
  }
});

// ── GET /api/tasks/:id ───────────────────────────────────────
// Devuelve una tarea específica con sus subtareas y grupo.
tasksRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        subtasks: {
          orderBy: (s, { asc }) => [asc(s.order)],
        },
        group: true,
      },
    });

    if (!task) {
      return c.json({ error: "Tarea no encontrada" }, 404);
    }

    return c.json({ data: task });
  } catch (error) {
    return c.json({ error: "Error al obtener la tarea" }, 500);
  }
});

// ── POST /api/tasks ──────────────────────────────────────────
// Crea una nueva tarea.
tasksRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const { dueDate, ...rest } = parsed.data;

    const [created] = await db
      .insert(tasks)
      .values({
        ...rest,
        // Convertimos el string ISO a Date para que Drizzle lo guarde como timestamp_ms
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    return c.json({ data: created }, 201);
  } catch (error) {
    return c.json({ error: "Error al crear la tarea" }, 500);
  }
});

// ── PUT /api/tasks/:id ───────────────────────────────────────
// Actualiza cualquier campo de una tarea (incluido completado/incompleto).
tasksRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const { dueDate, ...rest } = parsed.data;

    // Construimos el objeto de actualización dinámicamente
    const updateData: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };

    // Solo incluimos dueDate en la actualización si el campo fue enviado
    if ("dueDate" in parsed.data) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Tarea no encontrada" }, 404);
    }

    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: "Error al actualizar la tarea" }, 500);
  }
});

// ── DELETE /api/tasks/:id ────────────────────────────────────
// Elimina una tarea. Las subtareas se eliminan por CASCADE automáticamente.
tasksRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  try {
    const [deleted] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Tarea no encontrada" }, 404);
    }

    return c.json({ data: { id: deleted.id }, message: "Tarea eliminada" });
  } catch (error) {
    return c.json({ error: "Error al eliminar la tarea" }, 500);
  }
});

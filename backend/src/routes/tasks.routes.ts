import { Hono } from "hono";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

export const tasksRouter = new Hono();

// Helper: devuelve true si date cae en el día de hoy (hora local del servidor)
function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()
  );
}

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
      orderBy: (t, { asc, desc }) => [asc(t.order), desc(t.createdAt)],
    });

    // ── Reset automático de tareas diarias ──────────────────
    // Si la tarea diaria fue completada en un día anterior, se resetea.
    const toReset = allTasks.filter(
      (t) => t.type === "daily" && t.completed && !isToday(t.lastCompletedDate)
    );

    if (toReset.length > 0) {
      await db
        .update(tasks)
        .set({ completed: false, lastCompletedDate: null, updatedAt: new Date() })
        .where(inArray(tasks.id, toReset.map((t) => t.id)));

      // Reflejar el reset en la respuesta sin hacer una segunda query
      const resetIds = new Set(toReset.map((t) => t.id));
      for (const task of allTasks) {
        if (resetIds.has(task.id)) {
          (task as Record<string, unknown>).completed = false;
          (task as Record<string, unknown>).lastCompletedDate = null;
        }
      }
    }

    return c.json({ data: allTasks });
  } catch (error) {
    return c.json({ error: "Error al obtener las tareas" }, 500);
  }
});

// ── PUT /api/tasks/reorder ──────────────────────────────────
// Actualiza el campo `order` de múltiples tareas en una sola operación.
// Body: { tasks: [{id: number, order: number}] }
const reorderSchema = z.object({
  tasks: z.array(z.object({ id: z.number().int(), order: z.number().int() })).min(1),
});

tasksRouter.put("/reorder", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "El cuerpo de la petición es inválido" }, 400);

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    // Actualizamos cada tarea en una transacción para garantizar atomicidad
    await db.transaction(async (tx) => {
      for (const { id, order } of parsed.data.tasks) {
        await tx
          .update(tasks)
          .set({ order, updatedAt: new Date() })
          .where(eq(tasks.id, id));
      }
    });
    return c.json({ message: "Orden actualizado" });
  } catch (error) {
    return c.json({ error: "Error al reordenar las tareas" }, 500);
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

    // Si el payload incluye `completed`, actualizamos lastCompletedDate:
    //   true  → guardamos ahora como timestamp del momento de completado
    //   false → limpiamos (desmarcado manual)
    if ("completed" in parsed.data) {
      updateData.lastCompletedDate = parsed.data.completed ? new Date() : null;
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

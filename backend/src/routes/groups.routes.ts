import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { groups } from "../db/schema.js";
import {
  createGroupSchema,
  updateGroupSchema,
} from "../validators/group.validator.js";

export const groupsRouter = new Hono();

// ── GET /api/groups ──────────────────────────────────────────
// Devuelve todos los grupos con el conteo de tareas asociadas.
groupsRouter.get("/", async (c) => {
  try {
    const allGroups = await db.query.groups.findMany({
      with: {
        // Traemos las tareas para poder contar cuántas tiene cada grupo
        tasks: {
          columns: { id: true, completed: true },
        },
      },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
    });
    return c.json({ data: allGroups });
  } catch (error) {
    return c.json({ error: "Error al obtener los grupos" }, 500);
  }
});

// ── GET /api/groups/:id ──────────────────────────────────────
// Devuelve un grupo específico con todas sus tareas y subtareas.
groupsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  try {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
      with: {
        tasks: {
          with: { subtasks: true },
        },
      },
    });

    if (!group) {
      return c.json({ error: "Grupo no encontrado" }, 404);
    }

    return c.json({ data: group });
  } catch (error) {
    return c.json({ error: "Error al obtener el grupo" }, 500);
  }
});

// ── POST /api/groups ─────────────────────────────────────────
// Crea un nuevo grupo.
groupsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const [created] = await db
      .insert(groups)
      .values(parsed.data)
      .returning();

    return c.json({ data: created }, 201);
  } catch (error) {
    return c.json({ error: "Error al crear el grupo" }, 500);
  }
});

// ── PUT /api/groups/:id ──────────────────────────────────────
// Actualiza nombre, descripción o color de un grupo.
groupsRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "El cuerpo de la petición es inválido" }, 400);
  }

  const parsed = updateGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 422);
  }

  try {
    const [updated] = await db
      .update(groups)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Grupo no encontrado" }, 404);
    }

    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: "Error al actualizar el grupo" }, 500);
  }
});

// ── DELETE /api/groups/:id ───────────────────────────────────
// Elimina un grupo. Las tareas asociadas quedan con groupId = NULL (SET NULL).
groupsRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "ID inválido" }, 400);
  }

  try {
    const [deleted] = await db
      .delete(groups)
      .where(eq(groups.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Grupo no encontrado" }, 404);
    }

    return c.json({ data: { id: deleted.id }, message: "Grupo eliminado" });
  } catch (error) {
    return c.json({ error: "Error al eliminar el grupo" }, 500);
  }
});

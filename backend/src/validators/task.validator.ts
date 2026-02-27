import { z } from "zod";

// ── Crear tarea ──────────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(255),

  description: z.string().max(2000).optional().nullable(),

  // 'daily' = tarea diaria recurrente | 'regular' = tarea normal
  type: z.enum(["daily", "regular"]).default("regular"),

  priority: z.enum(["low", "medium", "high"]).default("medium"),

  // Fecha límite como string ISO 8601 (ej: "2026-03-15T00:00:00.000Z")
  // El handler la convierte a Date antes de insertar
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),

  groupId: z.number().int().positive().optional().nullable(),
});

// ── Actualizar tarea (todos los campos opcionales) ───────────
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
  type: z.enum(["daily", "regular"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  groupId: z.number().int().positive().optional().nullable(),
});

// Tipos TypeScript inferidos de los esquemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

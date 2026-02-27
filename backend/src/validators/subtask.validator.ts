import { z } from "zod";

// ── Crear subtarea ────────────────────────────────────────────
export const createSubtaskSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(255),

  // Posición dentro de la lista (para ordenamiento futuro)
  order: z.number().int().min(0).default(0),
});

// ── Actualizar subtarea ───────────────────────────────────────
export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;

import { z } from "zod";

// ── Crear grupo ──────────────────────────────────────────────
export const createGroupSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(35),

  description: z.string().max(500).optional().nullable(),

  // Color HEX válido (ej: "#6366f1"). Por defecto índigo.
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Debe ser un color HEX válido (ej: #6366f1)")
    .default("#6366f1"),
});

// ── Actualizar grupo ──────────────────────────────────────────
export const updateGroupSchema = z.object({
  name: z.string().min(1).max(35).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

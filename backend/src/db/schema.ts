import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
//   TABLA: groups
//   Representa un proyecto o categoría que agrupa tareas.
// ═══════════════════════════════════════════════════════════
export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Nombre visible del grupo (ej: "Trabajo", "Personal")
  name: text("name").notNull(),

  // Descripción opcional del grupo
  description: text("description"),

  // Color HEX para identificación visual en la UI (ej: "#6366f1")
  color: text("color").notNull().default("#6366f1"),

  // Timestamps almacenados como enteros Unix (milisegundos)
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),

  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════════
//   TABLA: tasks
//   Tarea principal con título, descripción, prioridad, etc.
// ═══════════════════════════════════════════════════════════
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Título corto y obligatorio de la tarea
  title: text("title").notNull(),

  // Descripción detallada opcional
  description: text("description"),

  // Estado de completado: false = pendiente, true = completada
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),

  // Tipo de tarea:
  //   'daily'   → tarea recurrente diaria
  //   'regular' → tarea con fecha límite o sin ella
  type: text("type", { enum: ["daily", "regular"] })
    .notNull()
    .default("regular"),

  // Prioridad visual para ordenar y destacar tareas
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),

  // Fecha límite opcional (Unix ms). NULL si no tiene deadline.
  dueDate: integer("due_date", { mode: "timestamp_ms" }),

  // Última vez que la tarea fue marcada como completada (Unix ms).
  // Solo relevante para tareas diarias: se usa para reset automático al día siguiente.
  // NULL si nunca fue completada o si fue desmarcada manualmente.
  lastCompletedDate: integer("last_completed_date", { mode: "timestamp_ms" }),

  // FK al grupo al que pertenece (opcional).
  // ON DELETE SET NULL: si se borra el grupo, la tarea queda sin grupo.
  groupId: integer("group_id").references(() => groups.id, {
    onDelete: "set null",
  }),

  // Posición de la tarea en la lista (para ordenamiento manual por drag & drop).
  // 0 por defecto; se actualiza vía PUT /api/tasks/reorder.
  order: integer("order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),

  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════════
//   TABLA: subtasks
//   Pasos o sub-ítems que pertenecen a una tarea padre.
// ═══════════════════════════════════════════════════════════
export const subtasks = sqliteTable("subtasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Texto descriptivo de la subtarea
  title: text("title").notNull(),

  // Estado de completado de la subtarea
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),

  // FK a la tarea padre. ON DELETE CASCADE: se eliminan con la tarea.
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),

  // Posición dentro de la lista de subtareas (para drag-and-drop futuro)
  order: integer("order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════════
//   RELACIONES (necesarias para la Drizzle Query API)
// ═══════════════════════════════════════════════════════════

export const groupsRelations = relations(groups, ({ many }) => ({
  // Un grupo puede tener muchas tareas
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  // Una tarea pertenece a un grupo (puede ser null)
  group: one(groups, {
    fields: [tasks.groupId],
    references: [groups.id],
  }),
  // Una tarea puede tener muchas subtareas
  subtasks: many(subtasks),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  // Una subtarea pertenece a una tarea
  task: one(tasks, {
    fields: [subtasks.taskId],
    references: [tasks.id],
  }),
}));

// ═══════════════════════════════════════════════════════════
//   TIPOS INFERIDOS DE TYPESCRIPT
// ═══════════════════════════════════════════════════════════
export type Group    = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type Task     = typeof tasks.$inferSelect;
export type NewTask  = typeof tasks.$inferInsert;

export type Subtask    = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;

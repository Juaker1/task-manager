// Tipos que reflejan exactamente la estructura del backend (schema.ts)

export type TaskType     = 'daily' | 'regular';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Subtask {
  id:        number;
  title:     string;
  completed: boolean;
  taskId:    number;
  order:     number;
  createdAt: string;
}

export interface Group {
  id:          number;
  name:        string;
  description: string | null;
  color:       string;
  createdAt:   string;
  updatedAt:   string;
}

export interface Task {
  id:          number;
  title:       string;
  description: string | null;
  completed:   boolean;
  type:        TaskType;
  priority:    TaskPriority;
  dueDate:     string | null;
  groupId:     number | null;
  group?:      Pick<Group, 'id' | 'name' | 'color'> | null;
  subtasks?:   Subtask[];
  createdAt:   string;
  updatedAt:   string;
}

// Payload para crear una tarea nueva (campos que acepta el backend)
export interface CreateTaskPayload {
  title:       string;
  description?: string | null;
  type?:        TaskType;
  priority?:    TaskPriority;
  dueDate?:     string | null;
  groupId?:     number | null;
}

// Payload para actualizar una tarea existente (todos opcionales)
export type UpdateTaskPayload = Partial<CreateTaskPayload & { completed: boolean }>;

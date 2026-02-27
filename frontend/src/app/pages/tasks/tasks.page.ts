import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TaskFormCardComponent } from '../../components/task-form-card/task-form-card.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../services/task.service';
import type { Task, Subtask, CreateTaskPayload } from '../../models/task.model';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [TaskFormCardComponent, TaskCardComponent],
  templateUrl: './tasks.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage implements OnInit {
  private readonly taskService = inject(TaskService);

  // ── Estado ────────────────────────────────────────────────────
  readonly tasks       = signal<Task[]>([]);
  readonly showForm    = signal(false);
  readonly isLoading   = signal(false);
  readonly errorMsg    = signal<string | null>(null);

  // ── Contadores derivados con computed() ───────────────────────
  readonly totalTasks     = computed(() => this.tasks().length);
  readonly completedTasks = computed(() => this.tasks().filter((t) => t.completed).length);
  readonly pendingTasks   = computed(() => this.totalTasks() - this.completedTasks());

  // ── Ciclo de vida ─────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTasks();
  }

  // ── Cargar tareas desde la API ────────────────────────────────
  loadTasks(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.taskService.getAll().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo.');
        this.isLoading.set(false);
      },
    });
  }

  // ── Guardar nueva tarea ───────────────────────────────────────
  onTaskSaved(payload: CreateTaskPayload): void {
    this.taskService.create(payload).subscribe({
      next: (newTask) => {
        // Agregamos la nueva tarea al inicio de la lista sin recargar todo
        this.tasks.update((list) => [newTask, ...list]);
        this.showForm.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al guardar la tarea. Intenta de nuevo.');
      },
    });
  }

  // ── Toggle completado ─────────────────────────────────────────
  // IMPORTANTE: el PUT devuelve solo la fila plana (sin subtasks ni group).
  // Fusionamos la respuesta con los datos relacionales existentes para no perderlos.
  onToggleCompleted(task: Task): void {
    this.taskService.update(task.id, { completed: !task.completed }).subscribe({
      next: (updated) => {
        this.tasks.update((list) =>
          list.map((t) =>
            t.id === updated.id
              ? { ...updated, subtasks: t.subtasks, group: t.group }
              : t
          )
        );
      },
      error: () => {
        this.errorMsg.set('Error al actualizar la tarea.');
      },
    });
  }

  // ── Eliminar tarea ────────────────────────────────────────────
  onDeleteTask(id: number): void {
    this.taskService.delete(id).subscribe({
      next: () => {
        this.tasks.update((list) => list.filter((t) => t.id !== id));
      },
      error: () => {
        this.errorMsg.set('Error al eliminar la tarea.');
      },
    });
  }

  // ── Actualizar subtareas localmente ──────────────────────────
  onSubtasksChanged({ taskId, subtasks }: { taskId: number; subtasks: Subtask[] }): void {
    this.tasks.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, subtasks } : t))
    );
  }
}

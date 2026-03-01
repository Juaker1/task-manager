import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TaskFormCardComponent } from '../../components/task-form-card/task-form-card.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../services/task.service';
import { LayoutService } from '../../services/layout.service';
import type { Task, Subtask, CreateTaskPayload, UpdateTaskPayload } from '../../models/task.model';

type TaskFilter = 'all' | 'daily' | 'today' | 'upcoming';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [TaskFormCardComponent, TaskCardComponent, CdkDropList, CdkDrag],
  templateUrl: './tasks.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly route       = inject(ActivatedRoute);
  readonly layout              = inject(LayoutService);

  readonly filter: TaskFilter = (this.route.snapshot.data['filter'] as TaskFilter) ?? 'all';

  // Tarea siendo editada actualmente (null = ninguna)
  readonly editingTask     = signal<Task | null>(null);
  // Incrementa cada vez que se abre el form para NUEVA tarea → aplica defaults
  readonly formOpenTrigger = signal(0);

  // El form se muestra si el panel de nueva tarea está abierto O hay una tarea en edición
  readonly showForm = computed(() => this.layout.showNewTaskForm() || !!this.editingTask());

  // Valores iniciales del form según la pestaña activa
  readonly formInitialIsDaily = computed(() => this.filter === 'daily');
  readonly formInitialDueDate = computed((): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (this.filter === 'today') {
      const d = new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    if (this.filter === 'upcoming') {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return '';
  });

  constructor() {
    // Cada vez que showNewTaskForm se activa en modo creación → incrementar
    // el trigger para que el form aplique los defaults del filtro activo.
    effect(() => {
      const isOpen = this.layout.showNewTaskForm();
      if (isOpen && !this.editingTask()) {
        this.formOpenTrigger.update((n) => n + 1);
      }
    });
  }

  readonly pageTitle =
    this.filter === 'daily'    ? 'Tareas diarias' :
    this.filter === 'today'    ? 'Hoy'             :
    this.filter === 'upcoming' ? 'Próximo'         :
    'Todas las tareas';

  readonly emptyMessage =
    this.filter === 'daily'    ? 'No hay tareas diarias.' :
    this.filter === 'today'    ? '¡No hay tareas para hoy!' :
    this.filter === 'upcoming' ? '¡No hay tareas próximas. Todo al día!' :
    'Usa el botón Nueva tarea para empezar.';

  // ── Estado ────────────────────────────────────────────────────
  readonly tasks       = signal<Task[]>([]);
  readonly isLoading   = signal(false);
  readonly errorMsg    = signal<string | null>(null);

  // ── Filtrado según la vista activa ────────────────────────────
  readonly displayedTasks = computed(() => {
    const all = this.tasks();

    if (this.filter === 'daily') {
      return all.filter((t) => t.type === 'daily');
    }

    if (this.filter === 'today') {
      // Tareas cuyo dueDate cae en el día calendario de hoy (UTC)
      const todayStr = new Date().toISOString().split('T')[0];
      return all.filter(
        (t) => !t.completed && !!t.dueDate &&
               new Date(t.dueDate).toISOString().split('T')[0] === todayStr
      );
    }

    if (this.filter === 'upcoming') {
      // Tareas con dueDate entre mañana y 3 días desde hoy (sin incluir hoy)
      const todayStr  = new Date().toISOString().split('T')[0];
      const limitDate = new Date();
      limitDate.setUTCDate(limitDate.getUTCDate() + 3);
      const limitStr  = limitDate.toISOString().split('T')[0];
      return all.filter((t) => {
        if (t.completed || !t.dueDate) return false;
        const dueDateStr = new Date(t.dueDate).toISOString().split('T')[0];
        return dueDateStr > todayStr && dueDateStr <= limitStr;
      });
    }

    return all;
  });

  // ── Contadores derivados con computed() ───────────────────────
  readonly totalTasks     = computed(() => this.displayedTasks().length);
  readonly completedTasks = computed(() => this.displayedTasks().filter((t) => t.completed).length);
  readonly pendingTasks   = computed(() => this.totalTasks() - this.completedTasks());
  // Sub-arrays para el drag & drop (excluyen la tarea en edición para que no "desaparezca" al arrastrar)
  readonly pendingDisplayed   = computed(() =>
    this.displayedTasks().filter((t) => !t.completed && t.id !== this.editingTask()?.id)
  );
  readonly completedDisplayed = computed(() =>
    this.displayedTasks().filter((t) => t.completed && t.id !== this.editingTask()?.id)
  );
  // ── Ciclo de vida ─────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTasks();
  }
  // ── Abrir / cerrar formulario ──────────────────────────────
  // Abre el form para NUEVA tarea (limpia cualquier edición activa)
  openNewTaskForm(): void {
    this.editingTask.set(null);
    this.layout.showNewTaskForm.set(true);
    // El effect del constructor detectará el cambio y aplicará los defaults
  }

  onFormCancelled(): void {
    this.editingTask.set(null);
    this.layout.showNewTaskForm.set(false);
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
        this.tasks.update((list) => [newTask, ...list]);
        this.layout.showNewTaskForm.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al guardar la tarea. Intenta de nuevo.');
      },
    });
  }
  // ── Abrir formulario de edición ──────────────────────────────
  onTaskEditRequested(task: Task): void {
    this.layout.showNewTaskForm.set(false); // cerrar form de nueva tarea si estaba abierto
    this.editingTask.set(task);             // establece la tarea a editar (abre el form)
  }

  // ── Guardar cambios de tarea editada ─────────────────────────
  // Recargamos todas las tareas para que los joins (group, subtasks) se reflejen correctamente.
  onTaskUpdated({ id, payload }: { id: number; payload: UpdateTaskPayload }): void {
    this.taskService.update(id, payload).subscribe({
      next: () => {
        this.editingTask.set(null);
        this.loadTasks();
      },
      error: () => {
        this.errorMsg.set('Error al actualizar la tarea.');
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
  // ── Drag & Drop ────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<Task[]>, section: 'pending' | 'completed'): void {
    if (event.previousIndex === event.currentIndex) return;

    const source   = section === 'pending' ? this.pendingDisplayed() : this.completedDisplayed();
    const reordered = [...source];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    const reorderPayload = reordered.map((t, i) => ({ id: t.id, order: i }));
    const movedIds       = new Set(source.map((t) => t.id));

    // Actualización optimista: reemplaza las tareas del grupo movido
    // manteniendo su nueva posición relativa dentro del signal
    this.tasks.update((all) => {
      let idx = 0;
      return all.map((t) => {
        if (movedIds.has(t.id)) {
          const replacement = reordered[idx++];
          return { ...replacement, order: idx - 1 };
        }
        return t;
      });
    });

    // Persiste en backend; revierte si falla
    this.taskService.reorder(reorderPayload).subscribe({
      error: () => this.loadTasks(),
    });
  }}

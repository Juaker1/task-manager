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
import { GroupService } from '../../services/group.service';
import { LayoutService } from '../../services/layout.service';
import type { Task, Subtask, Group, CreateTaskPayload, UpdateTaskPayload } from '../../models/task.model';

@Component({
  selector: 'app-group-page',
  standalone: true,
  imports: [TaskFormCardComponent, TaskCardComponent, CdkDropList, CdkDrag],
  templateUrl: './group.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPage implements OnInit {
  private readonly taskService  = inject(TaskService);
  private readonly groupService = inject(GroupService);
  private readonly route        = inject(ActivatedRoute);
  readonly layout               = inject(LayoutService);

  readonly groupId = Number(this.route.snapshot.paramMap.get('id'));

  // ── Estado del grupo ──────────────────────────────────────────
  readonly group = signal<Group | null>(null);

  // ── Estado de descripción ──────────────────────────────────────
  readonly isEditingDesc   = signal(false);
  readonly descriptionDraft = signal('');
  readonly isSavingDesc    = signal(false);

  // ── Estado del formulario ─────────────────────────────────────
  readonly editingTask     = signal<Task | null>(null);
  readonly formOpenTrigger = signal(0);

  readonly showForm = computed(() => this.layout.showNewTaskForm() || !!this.editingTask());

  constructor() {
    effect(() => {
      const isOpen = this.layout.showNewTaskForm();
      if (isOpen && !this.editingTask()) {
        this.formOpenTrigger.update((n) => n + 1);
      }
    });
  }

  // ── Estado de tareas ──────────────────────────────────────────
  readonly tasks     = signal<Task[]>([]);
  readonly isLoading = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  // Solo tareas que pertenecen a este grupo
  readonly displayedTasks = computed(() =>
    this.tasks().filter((t) => t.groupId === this.groupId)
  );

  readonly totalTasks     = computed(() => this.displayedTasks().length);
  readonly completedTasks = computed(() => this.displayedTasks().filter((t) => t.completed).length);
  readonly pendingTasks   = computed(() => this.totalTasks() - this.completedTasks());

  readonly pendingDisplayed   = computed(() =>
    this.displayedTasks().filter((t) => !t.completed && t.id !== this.editingTask()?.id)
  );
  readonly completedDisplayed = computed(() =>
    this.displayedTasks().filter((t) => t.completed && t.id !== this.editingTask()?.id)
  );

  // ── Ciclo de vida ─────────────────────────────────────────────
  ngOnInit(): void {
    this.loadGroup();
    this.loadTasks();
  }

  loadGroup(): void {
    this.groupService.getAll().subscribe({
      next: (groups) => {
        this.group.set(groups.find((g) => g.id === this.groupId) ?? null);
      },
    });
  }

  startEditDescription(): void {
    this.descriptionDraft.set(this.group()?.description ?? '');
    this.isEditingDesc.set(true);
  }

  cancelEditDescription(): void {
    this.isEditingDesc.set(false);
  }

  saveDescription(): void {
    const description = this.descriptionDraft().trim() || null;
    this.isSavingDesc.set(true);
    this.groupService.update(this.groupId, { description }).subscribe({
      next: () => {
        this.group.update((g) => g ? { ...g, description } : g);
        this.isEditingDesc.set(false);
        this.isSavingDesc.set(false);
      },
      error: () => { this.isSavingDesc.set(false); },
    });
  }

  onDescKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.cancelEditDescription(); }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.saveDescription();
    }
  }

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

  // ── Abrir / cerrar formulario ─────────────────────────────────
  openNewTaskForm(): void {
    this.editingTask.set(null);
    this.layout.showNewTaskForm.set(true);
  }

  onFormCancelled(): void {
    this.editingTask.set(null);
    this.layout.showNewTaskForm.set(false);
  }

  // ── CRUD ──────────────────────────────────────────────────────
  onTaskSaved(payload: CreateTaskPayload): void {
    // Siempre asignar la tarea al grupo actual
    this.taskService.create({ ...payload, groupId: this.groupId }).subscribe({
      next: (newTask) => {
        this.tasks.update((list) => [newTask, ...list]);
        this.layout.showNewTaskForm.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al guardar la tarea. Intenta de nuevo.');
      },
    });
  }

  onTaskEditRequested(task: Task): void {
    this.layout.showNewTaskForm.set(false);
    this.editingTask.set(task);
  }

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

  onSubtasksChanged({ taskId, subtasks }: { taskId: number; subtasks: Subtask[] }): void {
    this.tasks.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, subtasks } : t))
    );
  }

  // ── Drag & Drop ────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<Task[]>, section: 'pending' | 'completed'): void {
    if (event.previousIndex === event.currentIndex) return;

    const source    = section === 'pending' ? this.pendingDisplayed() : this.completedDisplayed();
    const reordered = [...source];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    const reorderPayload = reordered.map((t, i) => ({ id: t.id, order: i }));
    const movedIds       = new Set(source.map((t) => t.id));

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

    this.taskService.reorder(reorderPayload).subscribe({
      error: () => this.loadTasks(),
    });
  }
}

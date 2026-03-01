import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import type { Task, Subtask } from '../../models/task.model';
import { SubtaskService } from '../../services/subtask.service';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [FormsModule, CdkDragHandle],
  templateUrl: './task-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  private readonly subtaskService = inject(SubtaskService);

  // ── Inputs ────────────────────────────────────────────────────
  readonly task = input.required<Task>();

  // ── Outputs ───────────────────────────────────────────────────
  readonly toggleCompleted  = output<Task>();
  readonly deleteTask       = output<number>();  readonly editTask         = output<Task>();  // Notifica al padre que la lista de subtareas cambió
  // (necesario para que el padre refresque el signal de tasks)
  readonly subtasksChanged  = output<{ taskId: number; subtasks: Subtask[] }>();

  // ── Estado local ──────────────────────────────────────────────
  readonly isExpanded          = signal(false);
  readonly newSubtaskTitle     = signal('');
  readonly isSavingSubtask     = signal(false);
  readonly editingSubtaskId    = signal<number | null>(null);
  readonly editingSubtaskTitle = signal('');
  readonly confirmDeleteTask       = signal(false);
  readonly confirmDeleteSubtaskId  = signal<number | null>(null);

  // ── Computed: fecha formateada ────────────────────────────────
  readonly formattedDueDate = computed(() => {
    const raw = this.task().dueDate;
    if (!raw) return null;
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(raw));
  });

  // true si la fecha tiene una hora específica (no medianoche local)
  readonly hasTime = computed(() => {
    const raw = this.task().dueDate;
    if (!raw) return false;
    const d = new Date(raw);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  });

  // Hora formateada en HH:MM (solo cuando hasTime)
  readonly formattedDueTime = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || !this.hasTime()) return null;
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(raw));
  });

  // ── Computed: estados de fecha ────────────────────────────────

  // Fecha ya pasó y tarea pendiente → morado
  readonly isOverdue = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || this.task().completed) return false;
    // Con hora específica: comparación exacta de timestamps
    if (this.hasTime()) return new Date(raw).getTime() < Date.now();
    // Sin hora: comparación por bucket de día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(raw) < today;
  });

  // Vence hoy o en menos de 24 horas → rojo
  readonly isDueUrgent = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || this.task().completed || this.isOverdue()) return false;
    return new Date(raw).getTime() - Date.now() <= 24 * 60 * 60 * 1000;
  });

  // Vence en 1–3 días → amarillo
  readonly isDueSoon = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || this.task().completed || this.isOverdue() || this.isDueUrgent()) return false;
    const diffMs = new Date(raw).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  });

  // ── Computed: progreso de subtareas ──────────────────────────
  readonly subtasks = computed(() => this.task().subtasks ?? []);

  readonly subtaskCount = computed(() => this.subtasks().length);

  readonly completedSubtaskCount = computed(() =>
    this.subtasks().filter((s) => s.completed).length
  );

  // Porcentaje de subtareas completadas (0–100)
  readonly subtaskProgress = computed(() => {
    const total = this.subtaskCount();
    if (total === 0) return 0;
    return Math.round((this.completedSubtaskCount() / total) * 100);
  });

  // ── Handlers ─────────────────────────────────────────────────
  onToggle(): void {
    this.toggleCompleted.emit(this.task());
  }

  onEdit(): void {
    this.editTask.emit(this.task());
  }

  onDelete(): void {
    this.confirmDeleteTask.set(true);
  }

  onConfirmDeleteTask(): void {
    this.deleteTask.emit(this.task().id);
    this.confirmDeleteTask.set(false);
  }

  onCancelDeleteTask(): void {
    this.confirmDeleteTask.set(false);
  }

  onToggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  // Marca/desmarca una subtarea y notifica al padre.
  // Si todas quedan completadas → auto-completa la tarea.
  // Si una queda incompleta y la tarea estaba completa → la reabre.
  onToggleSubtask(subtask: Subtask): void {
    this.subtaskService.update(subtask.id, { completed: !subtask.completed }).subscribe({
      next: (updated) => {
        const updatedList = this.subtasks().map((s) =>
          s.id === updated.id ? updated : s
        );
        this.subtasksChanged.emit({ taskId: this.task().id, subtasks: updatedList });

        // Auto-complete / auto-reopen según estado global de subtareas
        const allDone = updatedList.length > 0 && updatedList.every((s) => s.completed);
        if (allDone && !this.task().completed) {
          this.toggleCompleted.emit(this.task());
        } else if (!allDone && this.task().completed) {
          this.toggleCompleted.emit(this.task());
        }
      },
    });
  }

  // ── Edición inline de subtarea ────────────────────────────────
  onStartEditSubtask(subtask: Subtask): void {
    this.editingSubtaskId.set(subtask.id);
    this.editingSubtaskTitle.set(subtask.title);
  }

  onCancelEditSubtask(): void {
    this.editingSubtaskId.set(null);
    this.editingSubtaskTitle.set('');
  }

  onSaveEditSubtask(subtask: Subtask): void {
    const title = this.editingSubtaskTitle().trim();
    if (!title) { this.onCancelEditSubtask(); return; }
    if (title === subtask.title) { this.onCancelEditSubtask(); return; }

    this.subtaskService.update(subtask.id, { title }).subscribe({
      next: (updated) => {
        const updatedList = this.subtasks().map((s) =>
          s.id === updated.id ? updated : s
        );
        this.subtasksChanged.emit({ taskId: this.task().id, subtasks: updatedList });
        this.onCancelEditSubtask();
      },
    });
  }

  onEditSubtaskKeydown(event: KeyboardEvent, subtask: Subtask): void {
    if (event.key === 'Enter') { event.preventDefault(); this.onSaveEditSubtask(subtask); }
    if (event.key === 'Escape') { this.onCancelEditSubtask(); }
  }

  // ── Eliminar subtarea ─────────────────────────────────────────
  onDeleteSubtask(subtask: Subtask): void {
    this.confirmDeleteSubtaskId.set(subtask.id);
  }

  onConfirmDeleteSubtask(subtask: Subtask): void {
    this.confirmDeleteSubtaskId.set(null);
    this.subtaskService.delete(subtask.id).subscribe({
      next: () => {
        const updatedList = this.subtasks().filter((s) => s.id !== subtask.id);
        this.subtasksChanged.emit({ taskId: this.task().id, subtasks: updatedList });
      },
    });
  }

  onCancelDeleteSubtask(): void {
    this.confirmDeleteSubtaskId.set(null);
  }

  // Crea una nueva subtarea
  onAddSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;

    this.isSavingSubtask.set(true);

    this.subtaskService.create(this.task().id, {
      title,
      order: this.subtaskCount(),
    }).subscribe({
      next: (created) => {
        const updatedList = [...this.subtasks(), created];
        this.subtasksChanged.emit({ taskId: this.task().id, subtasks: updatedList });
        this.newSubtaskTitle.set('');
        this.isSavingSubtask.set(false);
      },
      error: () => {
        this.isSavingSubtask.set(false);
      },
    });
  }

  // Permite agregar subtarea con Enter
  onSubtaskKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onAddSubtask();
    }
  }
}


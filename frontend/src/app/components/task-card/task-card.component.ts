import {
  Component,
  computed,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  templateUrl: './task-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  // ── Inputs ────────────────────────────────────────────────────
  readonly task = input.required<Task>();

  // ── Outputs ───────────────────────────────────────────────────
  readonly toggleCompleted = output<Task>();
  readonly deleteTask      = output<number>();

  // ── Computed: fecha formateada ────────────────────────────────
  // Devuelve la fecha en formato legible (ej: "15 mar 2026") o null
  readonly formattedDueDate = computed(() => {
    const raw = this.task().dueDate;
    if (!raw) return null;

    return new Intl.DateTimeFormat('es-AR', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
      timeZone: 'UTC', // Evita que el offset horario cambie el día
    }).format(new Date(raw));
  });

  // ── Computed: tarea vencida (fecha ya pasó) ───────────────────
  // true  → fecha ya pasó y la tarea sigue pendiente → morado
  readonly isOverdue = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || this.task().completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(raw) < today;
  });

  // ── Computed: vence hoy o en menos de 24 horas → rojo ────────
  readonly isDueUrgent = computed(() => {
    const raw = this.task().dueDate;
    if (!raw || this.task().completed || this.isOverdue()) return false;

    const due   = new Date(raw);
    const now   = new Date();
    const diffMs = due.getTime() - now.getTime();
    // Menos de 24 horas desde ahora, o mismo día calendario
    return diffMs <= 24 * 60 * 60 * 1000;
  });

  onToggle(): void {
    this.toggleCompleted.emit(this.task());
  }

  onDelete(): void {
    this.deleteTask.emit(this.task().id);
  }
}


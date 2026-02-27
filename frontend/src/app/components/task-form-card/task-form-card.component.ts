import {
  Component,
  computed,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { CreateTaskPayload } from '../../models/task.model';

@Component({
  selector: 'app-task-form-card',
  standalone: true,
  templateUrl: './task-form-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormCardComponent {
  // ── Outputs ───────────────────────────────────────────────────
  // Emite el payload cuando el usuario guarda
  readonly saved    = output<CreateTaskPayload>();
  // Emite cuando el usuario cancela
  readonly cancelled = output<void>();

  // ── Estado del formulario con Signals ─────────────────────────
  readonly title       = signal('');
  readonly description = signal('');
  // Fecha límite opcional — string 'YYYY-MM-DD' o vacío
  readonly dueDate     = signal('');
  // Muestra errores solo después del primer intento de guardar
  readonly submitted   = signal(false);

  // ── Validación con computed() ─────────────────────────────────
  readonly titleError = computed(() =>
    this.submitted() && this.title().trim().length === 0
      ? 'El título es obligatorio'
      : null
  );

  readonly descriptionError = computed(() =>
    this.submitted() && this.description().trim().length === 0
      ? 'La descripción es obligatoria'
      : null
  );

  // El formulario es válido solo si título y descripción tienen contenido.
  // dueDate es opcional, no bloquea el guardado.
  readonly isValid = computed(
    () =>
      this.title().trim().length > 0 &&
      this.description().trim().length > 0
  );

  // Fecha mínima seleccionable = hoy (evita fechas pasadas)
  readonly minDate = new Date().toISOString().split('T')[0];

  // ── Handlers ──────────────────────────────────────────────────
  onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onDueDateInput(event: Event): void {
    this.dueDate.set((event.target as HTMLInputElement).value);
  }

  onSave(): void {
    // Marcamos como "intentado" para mostrar los errores
    this.submitted.set(true);

    if (!this.isValid()) return;

    // Convertimos la fecha 'YYYY-MM-DD' a ISO 8601 si fue ingresada
    const dueDateISO = this.dueDate()
      ? new Date(this.dueDate() + 'T00:00:00').toISOString()
      : null;

    this.saved.emit({
      title:       this.title().trim(),
      description: this.description().trim(),
      dueDate:     dueDateISO,
    });

    // Reseteamos el formulario
    this.title.set('');
    this.description.set('');
    this.dueDate.set('');
    this.submitted.set(false);
  }

  onCancel(): void {
    this.title.set('');
    this.description.set('');
    this.dueDate.set('');
    this.submitted.set(false);
    this.cancelled.emit();
  }
}

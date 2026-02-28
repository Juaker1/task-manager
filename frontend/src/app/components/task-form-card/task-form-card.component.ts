import {
  Component,
  computed,
  inject,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GroupService } from '../../services/group.service';
import type { CreateTaskPayload } from '../../models/task.model';
import type { Group } from '../../models/task.model';

@Component({
  selector: 'app-task-form-card',
  standalone: true,
  templateUrl: './task-form-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormCardComponent {
  private readonly groupService = inject(GroupService);

  // ── Outputs ───────────────────────────────────────────────────
  readonly saved     = output<CreateTaskPayload>();
  readonly cancelled = output<void>();

  // ── Grupos disponibles (cargados desde el servicio) ───────────
  readonly groups = toSignal(this.groupService.getAll(), {
    initialValue: [] as Group[],
  });

  // ── Estado del formulario ─────────────────────────────────────
  readonly title           = signal('');
  readonly description     = signal('');
  readonly dueDate         = signal('');   // 'YYYY-MM-DD' o ''
  readonly dueTime         = signal('');   // 'HH:MM' o '' (opcional)
  readonly isDaily         = signal(false);
  readonly selectedGroupId = signal<number | null>(null);
  readonly submitted       = signal(false);

  // ── Validación ────────────────────────────────────────────────
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

  readonly isValid = computed(
    () => this.title().trim().length > 0 && this.description().trim().length > 0
  );

  // Opciones de hora en intervalos de 30 min para el selector
  readonly TIME_OPTIONS: { label: string; value: string }[] = Array.from(
    { length: 48 },
    (_, i) => {
      const h = Math.floor(i / 2).toString().padStart(2, '0');
      const m = i % 2 === 0 ? '00' : '30';
      return { label: `${h}:${m}`, value: `${h}:${m}` };
    }
  );

  // Fecha mínima seleccionable = hoy
  readonly minDate = new Date().toISOString().split('T')[0];

  // ── Handlers ──────────────────────────────────────────────────
  onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onDueDateInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.dueDate.set(val);
    // Si se borra la fecha, limpiar también la hora
    if (!val) this.dueTime.set('');
  }

  onDueTimeInput(event: Event): void {
    this.dueTime.set((event.target as HTMLSelectElement).value);
  }

  onToggleDaily(): void {
    const next = !this.isDaily();
    this.isDaily.set(next);
    // Las tareas diarias no tienen fecha límite
    if (next) {
      this.dueDate.set('');
      this.dueTime.set('');
    }
  }

  onGroupChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGroupId.set(val ? Number(val) : null);
  }

  onSave(): void {
    this.submitted.set(true);
    if (!this.isValid()) return;

    // Combinar fecha + hora en ISO 8601
    let dueDateISO: string | null = null;
    if (this.dueDate()) {
      const time = this.dueTime() || '00:00';
      dueDateISO = new Date(`${this.dueDate()}T${time}:00`).toISOString();
    }

    this.saved.emit({
      title:       this.title().trim(),
      description: this.description().trim(),
      type:        this.isDaily() ? 'daily' : 'regular',
      groupId:     this.selectedGroupId(),
      dueDate:     dueDateISO,
    });

    this.resetForm();
  }

  onCancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }

  private resetForm(): void {
    this.title.set('');
    this.description.set('');
    this.dueDate.set('');
    this.dueTime.set('');
    this.isDaily.set(false);
    this.selectedGroupId.set(null);
    this.submitted.set(false);
  }
}

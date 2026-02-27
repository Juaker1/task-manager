import {
  Component,
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

  onToggle(): void {
    this.toggleCompleted.emit(this.task());
  }

  onDelete(): void {
    this.deleteTask.emit(this.task().id);
  }
}

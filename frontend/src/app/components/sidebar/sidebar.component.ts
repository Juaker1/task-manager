import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { LayoutService } from '../../services/layout.service';
import type { Group } from '../../models/task.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  private readonly groupService  = inject(GroupService);
  readonly layout                = inject(LayoutService);

  // ── Estado de grupos ──────────────────────────────────────────
  readonly groups        = signal<Group[]>([]);
  readonly showAddForm   = signal(false);
  readonly newGroupName  = signal('');
  readonly newGroupColor = signal('#6366f1');
  readonly isSaving      = signal(false);

  // ── Paleta de colores predefinidos ────────────────────────────
  readonly PRESET_COLORS: string[] = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#0ea5e9', // sky
    '#94a3b8', // slate
  ];

  ngOnInit(): void {
    this.groupService.getAll().subscribe({
      next: (groups) => this.groups.set(groups),
    });
  }

  // Abre el formulario y resetea los campos
  openAddForm(): void {
    this.newGroupName.set('');
    this.newGroupColor.set('#6366f1');
    this.showAddForm.set(true);
  }

  cancelAddForm(): void {
    this.showAddForm.set(false);
  }

  saveGroup(): void {
    const name = this.newGroupName().trim();
    if (!name) return;

    this.isSaving.set(true);
    this.groupService.create({ name, color: this.newGroupColor() }).subscribe({
      next: (created) => {
        this.groups.update((list) => [...list, created]);
        this.showAddForm.set(false);
        this.isSaving.set(false);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  onFormKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.saveGroup(); }
    if (event.key === 'Escape') { this.cancelAddForm(); }
  }
}

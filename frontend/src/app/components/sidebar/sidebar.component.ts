import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/task.model';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  private readonly groupService  = inject(GroupService);
  private readonly router        = inject(Router);
  readonly layout                = inject(LayoutService);

  // Caché reactiva del servicio — automáticamente al día para todos los consumers
  readonly groups = this.groupService.groups;

  // ── Formulario de nuevo proyecto ──────────────────────────────
  readonly showAddForm   = signal(false);
  readonly newGroupName  = signal('');
  readonly newGroupColor = signal('#6366f1');
  readonly isSaving      = signal(false);

  // ── Estado de edición inline ───────────────────────────────
  readonly editingGroupId    = signal<number | null>(null);
  readonly editingGroupName  = signal('');
  readonly editingGroupColor = signal('');
  readonly isUpdating        = signal(false);
  readonly confirmDeleteId   = signal<number | null>(null);
  readonly deleteTasksToo    = signal(false);

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
    this.groupService.load().subscribe();
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
    // El servicio actualiza groups() automáticamente vía tap()
    this.groupService.create({ name, color: this.newGroupColor() }).subscribe({
      next: () => {
        this.showAddForm.set(false);
        this.isSaving.set(false);
      },
      error: () => { this.isSaving.set(false); },
    });
  }

  onFormKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.saveGroup(); }
    if (event.key === 'Escape') { this.cancelAddForm(); }
  }

  // ── Edición de grupo ──────────────────────────────────────────
  startEditGroup(group: Group): void {
    this.confirmDeleteId.set(null);
    this.editingGroupId.set(group.id);
    this.editingGroupName.set(group.name);
    this.editingGroupColor.set(group.color);
  }

  cancelEditGroup(): void {
    this.editingGroupId.set(null);
  }

  saveEditGroup(): void {
    const id   = this.editingGroupId();
    const name = this.editingGroupName().trim();
    if (!id || !name) return;

    this.isUpdating.set(true);
    // El servicio actualiza groups() automáticamente vía tap()
    this.groupService.update(id, { name, color: this.editingGroupColor() }).subscribe({
      next: () => {
        this.editingGroupId.set(null);
        this.isUpdating.set(false);
      },
      error: () => { this.isUpdating.set(false); },
    });
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter')  { event.preventDefault(); this.saveEditGroup(); }
    if (event.key === 'Escape') { this.cancelEditGroup(); }
  }

  // ── Eliminación de grupo ──────────────────────────────────────
  askDeleteGroup(id: number): void {
    this.editingGroupId.set(null);
    this.deleteTasksToo.set(false);
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
    this.deleteTasksToo.set(false);
  }

  confirmDelete(id: number): void {
    // El servicio actualiza groups() automáticamente vía tap()
    this.groupService.delete(id, this.deleteTasksToo()).subscribe({
      next: () => {
        this.confirmDeleteId.set(null);
        this.deleteTasksToo.set(false);
        if (this.router.url.includes(`/groups/${id}`)) {
          this.router.navigate(['/']);
        }
      },
    });
  }
}

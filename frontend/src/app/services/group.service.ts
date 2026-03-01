import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Group } from '../models/task.model';

export interface CreateGroupPayload {
  name:         string;
  description?: string;
  color?:       string;
}

export interface UpdateGroupPayload {
  name?:        string;
  description?: string | null;
  color?:       string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/groups';

  // ── Caché compartida (signal global) ──────────────────────────────
  // Cualquier componente que inyecte GroupService lee este signal
  // y ve los cambios en tiempo real sin necesidad de recargar.
  readonly groups = signal<Group[]>([]);

  /** Carga los grupos desde la API y actualiza la caché. */
  load(): Observable<Group[]> {
    return this.http
      .get<{ data: Group[] }>(this.baseUrl)
      .pipe(
        map((r) => r.data),
        tap((list) => this.groups.set(list)),
      );
  }

  /** @deprecated Usar load() para mantener la caché sincronizada. */
  getAll(): Observable<Group[]> {
    return this.load();
  }

  create(payload: CreateGroupPayload): Observable<Group> {
    return this.http
      .post<{ data: Group }>(this.baseUrl, payload)
      .pipe(
        map((r) => r.data),
        tap((created) => this.groups.update((list) => [...list, created])),
      );
  }

  update(id: number, payload: UpdateGroupPayload): Observable<Group> {
    return this.http
      .put<{ data: Group }>(`${this.baseUrl}/${id}`, payload)
      .pipe(
        map((r) => r.data),
        tap((updated) => this.groups.update((list) => list.map((g) => (g.id === updated.id ? updated : g)))),
      );
  }

  delete(id: number, deleteTasks = false): Observable<{ id: number }> {
    const url = deleteTasks
      ? `${this.baseUrl}/${id}?deleteTasks=true`
      : `${this.baseUrl}/${id}`;
    return this.http
      .delete<{ data: { id: number } }>(url)
      .pipe(
        map((r) => r.data),
        tap(() => this.groups.update((list) => list.filter((g) => g.id !== id))),
      );
  }
}

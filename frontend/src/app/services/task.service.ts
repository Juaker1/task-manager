import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '../models/task.model';

// Respuesta genérica del backend: { data: T }
interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/tasks';

  // ── GET /api/tasks ────────────────────────────────────────────
  getAll(): Observable<Task[]> {
    return this.http
      .get<ApiResponse<Task[]>>(this.baseUrl)
      .pipe(map((res) => res.data));
  }

  // ── POST /api/tasks ───────────────────────────────────────────
  create(payload: CreateTaskPayload): Observable<Task> {
    return this.http
      .post<ApiResponse<Task>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  // ── PUT /api/tasks/:id ────────────────────────────────────────
  update(id: number, payload: UpdateTaskPayload): Observable<Task> {
    return this.http
      .put<ApiResponse<Task>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  // ── DELETE /api/tasks/:id ─────────────────────────────────────
  delete(id: number): Observable<{ id: number }> {
    return this.http
      .delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
  // ── PUT /api/tasks/reorder ────────────────────────────────────
  reorder(payload: { id: number; order: number }[]): Observable<void> {
    return this.http
      .put<void>(`${this.baseUrl}/reorder`, { tasks: payload });
  }}

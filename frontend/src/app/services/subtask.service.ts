import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Subtask } from '../models/task.model';

interface ApiResponse<T> {
  data: T;
}

export interface CreateSubtaskPayload {
  title: string;
  order?: number;
}

export interface UpdateSubtaskPayload {
  title?:     string;
  completed?: boolean;
  order?:     number;
}

@Injectable({ providedIn: 'root' })
export class SubtaskService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  // ── POST /api/tasks/:taskId/subtasks ──────────────────────────
  create(taskId: number, payload: CreateSubtaskPayload): Observable<Subtask> {
    return this.http
      .post<ApiResponse<Subtask>>(`${this.baseUrl}/tasks/${taskId}/subtasks`, payload)
      .pipe(map((res) => res.data));
  }

  // ── PUT /api/subtasks/:id ─────────────────────────────────────
  update(id: number, payload: UpdateSubtaskPayload): Observable<Subtask> {
    return this.http
      .put<ApiResponse<Subtask>>(`${this.baseUrl}/subtasks/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  // ── DELETE /api/subtasks/:id ──────────────────────────────────
  delete(id: number): Observable<{ id: number }> {
    return this.http
      .delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/subtasks/${id}`)
      .pipe(map((res) => res.data));
  }
}

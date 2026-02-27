import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Group } from '../models/task.model';

export interface CreateGroupPayload {
  name:         string;
  description?: string;
  color?:       string;
}

export interface UpdateGroupPayload {
  name?:        string;
  description?: string;
  color?:       string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/groups';

  getAll(): Observable<Group[]> {
    return this.http
      .get<{ data: Group[] }>(this.baseUrl)
      .pipe(map((r) => r.data));
  }

  create(payload: CreateGroupPayload): Observable<Group> {
    return this.http
      .post<{ data: Group }>(this.baseUrl, payload)
      .pipe(map((r) => r.data));
  }

  update(id: number, payload: UpdateGroupPayload): Observable<Group> {
    return this.http
      .put<{ data: Group }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((r) => r.data));
  }

  delete(id: number): Observable<{ id: number }> {
    return this.http
      .delete<{ data: { id: number } }>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.data));
  }
}

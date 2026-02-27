import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { vi } from 'vitest';
import { TaskCardComponent } from './task-card.component';
import type { Task } from '../../models/task.model';

// ── Mock base de una tarea ────────────────────────────────────
const mockTask: Task = {
  id:          1,
  title:       'Tarea de prueba',
  description: 'Descripción de la tarea',
  completed:   false,
  type:        'regular',
  priority:    'medium',
  dueDate:     null,
  groupId:     null,
  group:       null,
  subtasks:    [],
  createdAt:   new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
};

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture:   ComponentFixture<TaskCardComponent>;
  let componentRef: ComponentRef<TaskCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
    }).compileComponents();

    fixture      = TestBed.createComponent(TaskCardComponent);
    component    = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Input requerido: asignamos la tarea base
    componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  // ── formattedDueDate ─────────────────────────────────────────
  it('formattedDueDate debería ser null si la tarea no tiene fecha límite', () => {
    expect(component.formattedDueDate()).toBeNull();
  });

  it('formattedDueDate debería retornar una cadena si hay dueDate', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2026-12-31T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.formattedDueDate()).not.toBeNull();
    expect(typeof component.formattedDueDate()).toBe('string');
  });

  // ── isOverdue ─────────────────────────────────────────────────
  it('isOverdue debería ser false si no hay fecha límite', () => {
    expect(component.isOverdue()).toBe(false);
  });

  it('isOverdue debería ser true si la fecha ya pasó y la tarea está pendiente', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2020-01-01T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.isOverdue()).toBe(true);
  });

  it('isOverdue debería ser false si la tarea está completada aunque la fecha haya pasado', () => {
    componentRef.setInput('task', {
      ...mockTask,
      dueDate:   '2020-01-01T00:00:00.000Z',
      completed: true,
    });
    fixture.detectChanges();
    expect(component.isOverdue()).toBe(false);
  });

  it('isOverdue debería ser false si la fecha es futura', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2099-12-31T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.isOverdue()).toBe(false);
  });

  // ── isDueUrgent (vence hoy o en <24h → rojo) ───────────────────
  it('isDueUrgent debería ser false si no hay fecha límite', () => {
    expect(component.isDueUrgent()).toBe(false);
  });

  it('isDueUrgent debería ser false si la fecha está muy lejos', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2099-12-31T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.isDueUrgent()).toBe(false);
  });

  it('isDueUrgent debería ser false si la tarea ya está completada', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min desde ahora
    componentRef.setInput('task', { ...mockTask, dueDate: soon, completed: true });
    fixture.detectChanges();
    expect(component.isDueUrgent()).toBe(false);
  });

  it('isDueUrgent debería ser false si isOverdue es true', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2020-01-01T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.isDueUrgent()).toBe(false);
  });

  // ── Outputs ───────────────────────────────────────────────────
  it('debería emitir la tarea al llamar onToggle()', () => {
    const spy = vi.fn();
    component.toggleCompleted.subscribe(spy);

    component.onToggle();
    expect(spy).toHaveBeenCalledWith(mockTask);
  });

  it('debería emitir el id al llamar onDelete()', () => {
    const spy = vi.fn();
    component.deleteTask.subscribe(spy);

    component.onDelete();
    expect(spy).toHaveBeenCalledWith(mockTask.id);
  });
});

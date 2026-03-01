import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { TaskCardComponent } from './task-card.component';
import { SubtaskService } from '../../services/subtask.service';
import type { Task, Subtask } from '../../models/task.model';

// ── Mock base de una tarea ────────────────────────────────────
const mockSubtasks: Subtask[] = [
  { id: 10, title: 'Sub 1', completed: true,  taskId: 1, order: 0, createdAt: new Date().toISOString() },
  { id: 11, title: 'Sub 2', completed: false, taskId: 1, order: 1, createdAt: new Date().toISOString() },
  { id: 12, title: 'Sub 3', completed: false, taskId: 1, order: 2, createdAt: new Date().toISOString() },
];
const mockTask: Task = {
  id:                1,
  title:             'Tarea de prueba',
  description:       'Descripción de la tarea',
  completed:         false,
  type:              'regular',
  priority:          'medium',
  dueDate:           null,
  lastCompletedDate: null,
  groupId:           null,
  group:             null,
  order:             0,
  subtasks:          [],
  createdAt:         new Date().toISOString(),
  updatedAt:         new Date().toISOString(),
};

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture:   ComponentFixture<TaskCardComponent>;
  let componentRef: ComponentRef<TaskCardComponent>;

  const mockSubtaskService = {
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    mockSubtaskService.update.mockReturnValue(of({ ...mockSubtasks[0] }));
    mockSubtaskService.create.mockReturnValue(of(mockSubtasks[0]));

    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [
        { provide: SubtaskService, useValue: mockSubtaskService },
      ],
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

  // ── isDueSoon (vence en 1–3 días → amarillo) ─────────────────
  it('isDueSoon debería ser false si no hay fecha límite', () => {
    expect(component.isDueSoon()).toBe(false);
  });

  it('isDueSoon debería ser true si la fecha es en ~2 días', () => {
    const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    componentRef.setInput('task', { ...mockTask, dueDate: twoDays });
    fixture.detectChanges();
    expect(component.isDueSoon()).toBe(true);
  });

  it('isDueSoon debería ser false si isDueUrgent es true (<24h)', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min
    componentRef.setInput('task', { ...mockTask, dueDate: soon });
    fixture.detectChanges();
    expect(component.isDueSoon()).toBe(false);
  });

  it('isDueSoon debería ser false si la fecha está muy lejos', () => {
    componentRef.setInput('task', { ...mockTask, dueDate: '2099-12-31T00:00:00.000Z' });
    fixture.detectChanges();
    expect(component.isDueSoon()).toBe(false);
  });

  it('isDueSoon debería ser false si la tarea está completada', () => {
    const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    componentRef.setInput('task', { ...mockTask, dueDate: twoDays, completed: true });
    fixture.detectChanges();
    expect(component.isDueSoon()).toBe(false);
  });

  // ── subtaskProgress ───────────────────────────────────────────
  it('subtaskProgress debería ser 0 cuando no hay subtareas', () => {
    expect(component.subtaskProgress()).toBe(0);
  });

  it('subtaskProgress debería ser 33 cuando 1 de 3 está completa', () => {
    componentRef.setInput('task', { ...mockTask, subtasks: mockSubtasks });
    fixture.detectChanges();
    expect(component.subtaskProgress()).toBe(33);
  });

  it('subtaskProgress debería ser 100 cuando todas las subtareas están completas', () => {
    const allDone = mockSubtasks.map(s => ({ ...s, completed: true }));
    componentRef.setInput('task', { ...mockTask, subtasks: allDone });
    fixture.detectChanges();
    expect(component.subtaskProgress()).toBe(100);
  });

  // ── subtaskCount & completedSubtaskCount ──────────────────────
  it('subtaskCount debería retornar el total de subtareas', () => {
    componentRef.setInput('task', { ...mockTask, subtasks: mockSubtasks });
    fixture.detectChanges();
    expect(component.subtaskCount()).toBe(3);
  });

  it('completedSubtaskCount debería retornar las subtareas completadas', () => {
    componentRef.setInput('task', { ...mockTask, subtasks: mockSubtasks });
    fixture.detectChanges();
    expect(component.completedSubtaskCount()).toBe(1);
  });

  // ── isExpanded toggle ─────────────────────────────────────────
  it('isExpanded debería empezar en false', () => {
    expect(component.isExpanded()).toBe(false);
  });

  it('onToggleExpand debería alternar isExpanded', () => {
    component.onToggleExpand();
    expect(component.isExpanded()).toBe(true);

    component.onToggleExpand();
    expect(component.isExpanded()).toBe(false);
  });

  // ── subtasksChanged output ────────────────────────────────────
  it('onToggleSubtask debería emitir subtasksChanged con la lista actualizada', () => {
    const subtask = mockSubtasks[0];
    const updatedSubtask = { ...subtask, completed: !subtask.completed };
    mockSubtaskService.update.mockReturnValue(of(updatedSubtask));

    componentRef.setInput('task', { ...mockTask, subtasks: mockSubtasks });
    fixture.detectChanges();

    const spy = vi.fn();
    component.subtasksChanged.subscribe(spy);

    component.onToggleSubtask(subtask);

    expect(mockSubtaskService.update).toHaveBeenCalledWith(subtask.id, { completed: !subtask.completed });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: mockTask.id })
    );
  });
});

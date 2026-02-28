import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { TaskFormCardComponent } from './task-form-card.component';

describe('TaskFormCardComponent', () => {
  let component: TaskFormCardComponent;
  let fixture: ComponentFixture<TaskFormCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('isValid debería ser false cuando title y description están vacíos', () => {
    expect(component.isValid()).toBe(false);
  });

  it('isValid debería ser false si solo tiene título', () => {
    component.title.set('Mi tarea');
    expect(component.isValid()).toBe(false);
  });

  it('isValid debería ser false si solo tiene descripción', () => {
    component.description.set('Descripción');
    expect(component.isValid()).toBe(false);
  });

  it('isValid debería ser true cuando title y description tienen contenido', () => {
    component.title.set('Mi tarea');
    component.description.set('Descripción de prueba');
    expect(component.isValid()).toBe(true);
  });

  it('no debería mostrar errores antes del primer intento de guardar', () => {
    expect(component.titleError()).toBeNull();
    expect(component.descriptionError()).toBeNull();
  });

  it('debería mostrar error de título si se intenta guardar con título vacío', () => {
    component.onSave();
    expect(component.titleError()).toBe('El título es obligatorio');
  });

  it('debería mostrar error de descripción si se intenta guardar con descripción vacía', () => {
    component.title.set('Mi tarea');
    component.onSave();
    expect(component.descriptionError()).toBe('La descripción es obligatoria');
  });

  it('debería emitir el payload correcto al guardar con datos válidos', () => {
    // vi.fn() es el equivalente de jasmine.createSpy() en Vitest
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.title.set('Tarea de prueba');
    component.description.set('Descripción de prueba');
    component.onSave();

    // expect.objectContaining() es el equivalente de jasmine.objectContaining()
    expect(savedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title:       'Tarea de prueba',
        description: 'Descripción de prueba',
        dueDate:     null,
      })
    );
  });

  it('debería incluir dueDate en el payload si se ingresó una fecha', () => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.title.set('Tarea con deadline');
    component.description.set('Descripción');
    component.dueDate.set('2026-12-31');
    component.onSave();

    expect(savedSpy).toHaveBeenCalled();
    // mock.lastCall es el equivalente de spy.calls.mostRecent() en Vitest
    const payload = savedSpy.mock.lastCall![0];
    expect(payload.dueDate).not.toBeNull();
  });

  it('debería resetear todos los campos después de guardar', () => {
    component.title.set('Tarea');
    component.description.set('Descripción');
    component.dueDate.set('2026-12-31');
    component.onSave();

    expect(component.title()).toBe('');
    expect(component.description()).toBe('');
    expect(component.dueDate()).toBe('');
    expect(component.submitted()).toBe(false);
  });

  it('debería resetear los campos y emitir cancelled al cancelar', () => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.title.set('Tarea');
    component.description.set('Descripción');
    component.dueDate.set('2026-03-01');
    component.onCancel();

    expect(component.title()).toBe('');
    expect(component.description()).toBe('');
    expect(component.dueDate()).toBe('');
    expect(cancelledSpy).toHaveBeenCalled();
  });
});


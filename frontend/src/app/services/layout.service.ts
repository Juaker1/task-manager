import { Injectable, signal } from '@angular/core';

/**
 * Servicio de layout compartido entre la sidebar y las páginas.
 * Permite que la sidebar pueda disparar acciones en el contenido principal.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** true → muestra el formulario de nueva tarea en la página activa */
  readonly showNewTaskForm = signal(false);
}

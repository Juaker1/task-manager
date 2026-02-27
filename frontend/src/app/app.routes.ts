import { Routes } from '@angular/router';
import { TasksPage } from './pages/tasks/tasks.page';

export const routes: Routes = [
  // Ruta raíz → página de tareas
  { path: '', component: TasksPage },
  // Cualquier otra ruta redirige al inicio
  { path: '**', redirectTo: '' },
];

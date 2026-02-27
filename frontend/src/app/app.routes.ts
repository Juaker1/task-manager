import { Routes } from '@angular/router';
import { ShellComponent } from './pages/shell/shell.component';
import { TasksPage } from './pages/tasks/tasks.page';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '',         component: TasksPage, data: { filter: 'all' } },
      { path: 'daily',    component: TasksPage, data: { filter: 'daily' } },
      { path: 'today',    component: TasksPage, data: { filter: 'today' } },
      { path: 'upcoming', component: TasksPage, data: { filter: 'upcoming' } },
    ],
  },
  { path: '**', redirectTo: '' },
];

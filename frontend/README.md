# Task Manager — Frontend

Interfaz de usuario del gestor de tareas, construida con **Angular 21** en modo zoneless y estilos con **Tailwind CSS v4**.

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [Angular](https://angular.dev/) | ^21.2 | Framework principal |
| [Tailwind CSS](https://tailwindcss.com/) | ^4.1 | Estilos utilitarios |
| [RxJS](https://rxjs.dev/) | ~7.8 | Manejo de streams asíncronos |
| [Vitest](https://vitest.dev/) | ^4.0 | Test runner |
| TypeScript | ~5.9 | Lenguaje |

---

## Requisitos previos

- **Node.js** >= 18
- **pnpm** >= 9

---

## Instalación

```bash
# Desde la raíz del repositorio
cd frontend
pnpm install
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm start` | Inicia el servidor de desarrollo en `http://localhost:4200` |
| `pnpm build` | Genera el build de producción en `dist/` |
| `pnpm watch` | Build en modo watch para desarrollo |
| `pnpm test` | Ejecuta los tests unitarios con Vitest |

---

## Estructura del proyecto

```
frontend/src/
├── app/
│   ├── app.config.ts          # Configuración raíz de la aplicación (providers, HTTP client)
│   ├── app.routes.ts          # Definición de rutas
│   ├── components/
│   │   ├── sidebar/           # Navegación lateral con lista de proyectos (CRUD inline)
│   │   ├── task-card/         # Tarjeta individual de tarea con expansión, edición y subtareas
│   │   └── task-form-card/    # Formulario de creación y edición de tareas
│   ├── models/
│   │   └── task.model.ts      # Interfaces y tipos (Task, Subtask, Group, TaskPriority, etc.)
│   ├── pages/
│   │   ├── shell/             # Layout principal: sidebar + área de contenido
│   │   ├── tasks/             # Vista de tareas con filtros (todas, diarias, hoy, próximas)
│   │   └── group/             # Vista de tareas de un proyecto específico
│   └── services/
│       ├── group.service.ts   # CRUD de proyectos + signal compartida de lista
│       ├── task.service.ts    # CRUD de tareas
│       ├── subtask.service.ts # CRUD de subtareas
│       └── layout.service.ts  # Estado del layout (sidebar abierto/cerrado)
└── styles.css                 # Estilos globales + directivas Tailwind
```

### Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | TasksPage | Todas las tareas |
| `/daily` | TasksPage | Tareas diarias |
| `/today` | TasksPage | Tareas con vencimiento hoy |
| `/upcoming` | TasksPage | Tareas próximas a vencer |
| `/groups/:id` | GroupPage | Tareas de un proyecto específico |

---

## Arquitectura y patrones

- **Zoneless + OnPush:** la aplicación corre sin Zone.js. Todos los componentes usan `ChangeDetectionStrategy.OnPush` y dependen exclusivamente de signals para disparar la detección de cambios.
- **Signals como fuente de verdad:** el estado local de componentes y el estado compartido entre ellos (por ejemplo, la lista de proyectos en `GroupService`) se gestionan con `signal()` y `computed()` de Angular.
- **Componentes standalone:** no se usan NgModules. Todos los componentes, directivas y pipes se declaran como standalone y se importan directamente donde se necesitan.
- **Inyección con `inject()`:** los servicios se inyectan usando la función `inject()` en lugar del constructor.
- **Servicios singleton:** todos los servicios usan `providedIn: 'root'` para garantizar una única instancia compartida por toda la aplicación.

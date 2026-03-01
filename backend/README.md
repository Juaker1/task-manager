# Task Manager — Backend

API REST del gestor de tareas, construida con **Hono** sobre Node.js y **Drizzle ORM** con SQLite local.

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [Hono](https://hono.dev/) | ^4.12 | Framework HTTP |
| [@hono/node-server](https://github.com/honojs/node-server) | ^1.19 | Adaptador Node.js |
| [Drizzle ORM](https://orm.drizzle.team/) | ^0.45 | ORM + Query Builder |
| [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) | ^0.17 | Cliente SQLite (libSQL) |
| [Zod](https://zod.dev/) | ^4.3 | Validación de datos |
| TypeScript | ^5.8 | Lenguaje |
| tsx | ^4.7 | Ejecución directa de TS en desarrollo |

---

## Requisitos previos

- **Node.js** >= 18
- **pnpm** >= 9

---

## Instalación

```bash
# Desde la raíz del repositorio
cd backend
pnpm install
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor en modo desarrollo con hot-reload (tsx watch) |
| `pnpm build` | Compila TypeScript a JavaScript en `dist/` |
| `pnpm start` | Ejecuta el build compilado (node dist/index.js) |
| `pnpm db:push` | Aplica el esquema directamente a la base de datos (sin migraciones) |
| `pnpm db:generate` | Genera archivos de migración a partir de cambios en el esquema |
| `pnpm db:migrate` | Ejecuta las migraciones pendientes |
| `pnpm db:studio` | Abre Drizzle Studio (interfaz visual de la base de datos) |

El servidor corre en `http://localhost:3000` por defecto.

---

## Base de datos

Se usa **SQLite local** a través del cliente libSQL. El archivo de base de datos se genera automáticamente en `backend/sqlite.db` al ejecutar el servidor por primera vez.

Para inicializar el esquema en una base de datos nueva:

```bash
pnpm db:push
```

Los archivos de migración generados por `db:generate` se almacenan en `src/db/migrations/`.

---

## Estructura del proyecto

```
backend/
├── src/
│   ├── index.ts               # Punto de entrada: instancia Hono, registra middlewares y rutas
│   ├── db/
│   │   ├── index.ts           # Conexión a la base de datos (cliente libSQL + instancia Drizzle)
│   │   ├── schema.ts          # Definición de tablas (groups, tasks, subtasks) y relaciones
│   │   └── migrations/        # Archivos de migración generados por Drizzle Kit
│   ├── routes/
│   │   ├── groups.routes.ts   # CRUD de proyectos
│   │   ├── tasks.routes.ts    # CRUD de tareas + reset automático de tareas diarias
│   │   ├── subtasks.routes.ts # CRUD de subtareas
│   │   └── health.routes.ts   # Health check
│   ├── validators/
│   │   ├── group.validator.ts    # Schemas Zod para proyectos
│   │   ├── task.validator.ts     # Schemas Zod para tareas
│   │   └── subtask.validator.ts  # Schemas Zod para subtareas
│   └── middlewares/
│       └── cors.middleware.ts    # Configuración de CORS
├── drizzle.config.ts          # Configuración de Drizzle Kit
├── tsconfig.json
└── package.json
```

---

## Endpoints de la API

### Proyectos — `/api/groups`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/groups` | Lista todos los proyectos con conteo de tareas |
| `GET` | `/api/groups/:id` | Obtiene un proyecto con sus tareas y subtareas |
| `POST` | `/api/groups` | Crea un nuevo proyecto |
| `PUT` | `/api/groups/:id` | Actualiza nombre, descripción o color |
| `DELETE` | `/api/groups/:id` | Elimina el proyecto. Por defecto las tareas quedan sin proyecto; con `?deleteTasks=true` las elimina junto con sus subtareas |

### Tareas — `/api/tasks`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/tasks` | Lista todas las tareas con subtareas y proyecto asociado |
| `GET` | `/api/tasks?type=daily` | Filtra por tipo (daily o regular) |
| `GET` | `/api/tasks?groupId=1` | Filtra por proyecto |
| `GET` | `/api/tasks?ungrouped=true` | Solo tareas sin proyecto |
| `GET` | `/api/tasks/:id` | Obtiene una tarea con sus subtareas y proyecto |
| `POST` | `/api/tasks` | Crea una nueva tarea |
| `PUT` | `/api/tasks/reorder` | Actualiza el orden de múltiples tareas en una transacción |
| `PUT` | `/api/tasks/:id` | Actualiza cualquier campo de una tarea |
| `DELETE` | `/api/tasks/:id` | Elimina una tarea (subtareas eliminadas por CASCADE) |

### Subtareas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/tasks/:taskId/subtasks` | Crea una subtarea dentro de una tarea |
| `PUT` | `/api/subtasks/:id` | Actualiza título, estado u orden de una subtarea |
| `DELETE` | `/api/subtasks/:id` | Elimina una subtarea |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Verificación básica de estado (`{ status: "ok" }`) |
| `GET` | `/health` | Health check detallado |

---

## Arquitectura

El flujo de cada petición sigue el siguiente camino:

```
Petición HTTP
    → Middleware CORS
    → Router correspondiente (groups / tasks / subtasks)
    → Validación con Zod (safeParse)
    → Consulta a SQLite mediante Drizzle ORM
    → Respuesta JSON
```

**Decisiones técnicas relevantes:**

- **Reset automático de tareas diarias:** al hacer `GET /api/tasks`, el servidor detecta las tareas de tipo `daily` que fueron completadas en un día anterior y las resetea automáticamente antes de devolver la respuesta, sin necesidad de un proceso programado externo.
- **Borrado en cascada y SET NULL:** al eliminar una tarea, sus subtareas se borran por `CASCADE`. Al eliminar un proyecto, el comportamiento es configurable: por defecto las tareas quedan huérfanas (`groupId = NULL`), pero si se pasa el query param `?deleteTasks=true` las tareas y sus subtareas se eliminan junto con el proyecto.
- **Timestamps como enteros Unix (ms):** todos los campos de fecha se almacenan como `INTEGER` en milisegundos para compatibilidad con libSQL y simplicidad en la serialización/deserialización.

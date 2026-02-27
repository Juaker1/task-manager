import { defineConfig } from "drizzle-kit";

// Drizzle Kit: configuración para generar y aplicar migraciones.
// Usamos el dialecto 'turso' porque el cliente instalado es @libsql/client.
// Para SQLite local, la URL es simplemente 'file:<ruta>'.
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: "file:./sqlite.db",
  },
});

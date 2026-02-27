import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

// Resolvemos la ruta absoluta al archivo sqlite.db en la raíz del backend.
// Usamos import.meta.url para compatibilidad con ESM (NodeNext).
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dbPath = resolve(__dirname, "../../sqlite.db");

// Creamos el cliente de libsql apuntando al archivo local.
const client = createClient({
  url: `file:${dbPath}`,
});

// Instancia de Drizzle con el schema para habilitar la Query API (db.query.*)
export const db = drizzle(client, { schema });

export type DB = typeof db;

import { cors } from "hono/cors";

// Middleware de CORS configurado para aceptar peticiones del frontend de Angular.
// En desarrollo Angular corre en el puerto 4200.
export const corsMiddleware = cors({
  origin: ["http://localhost:4200", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // Cache preflight por 24 horas
});

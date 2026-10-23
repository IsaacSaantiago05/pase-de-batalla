# packages/shared

Codigo comun de `apps/user-app` y `apps/admin-app`. No se instala ni se compila por separado: cada app lo importa con el alias `@shared` (configurado en su `vite.config.ts` y `tsconfig.app.json`).

- `src/api.ts`: `createApiClient(baseUrl, getToken)` y `listData()`.
- `src/session.ts`: `createSessionStore(clave)` para guardar la sesion en localStorage.

Las pantallas no lo importan directamente: usan `src/lib/api.ts` y `src/lib/auth.ts` de su app, que son envoltorios de este paquete.

# packages/shared

Codigo comun de `apps/user-app` y `apps/admin-app`. No se instala ni se compila por separado: cada app lo importa con el alias `@shared` (configurado en su `vite.config.ts` y `tsconfig.app.json`).

- `src/api.ts`: `createApiClient(baseUrl, getToken)` y `listData()`.
- `src/session.ts`: `createSessionStore(clave)` para guardar la sesion en localStorage.
- `src/ui.tsx`: componentes del diseño de Figma (botones, tarjetas, barra de progreso, encabezados, estados, isla decorativa). Las pantallas los importan como `@shared/ui`.
- `src/theme.css`: colores, tipografias (Rajdhani, Nunito, JetBrains Mono) y animaciones del diseño. Cada app lo importa en su `index.css`.

Como esta carpeta no tiene `node_modules`, React se resuelve desde cada app (`resolve.dedupe` en `vite.config.ts` y `paths` de `react` en `tsconfig.app.json`).

Para la API y la sesion las pantallas no lo importan directamente: usan `src/lib/api.ts` y `src/lib/auth.ts` de su app, que son envoltorios de este paquete.

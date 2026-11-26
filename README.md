# Pase de Batalla

Plataforma de fidelizacion gamificada con puntos globales, niveles, QR, recompensas e isla personalizable.

Estado actual: Fase 1, Fase 2 base, Fase 3, Fase 4 (puntos globales), Fase 5 backend (QR transaccional), Fase 6 (recompensas/canjes transaccionales), Fase 7 (battle pass base) y Fase 8 (isla MVP) completadas.

## Estructura del proyecto

```
pase-de-batalla/
	apps/
		user-app/        # React + TS + Vite + Tailwind + PWA
		admin-app/       # React + TS + Vite + Tailwind + PWA
	backend/           # Laravel API REST
	tools/composer/    # composer.phar local
```

## Backend (Laravel)

### Modulos implementados

- Autenticacion API con Sanctum.
- Registro, login, logout, perfil autenticado y recuperacion de password.
- Roles: CLIENTE, ADMINISTRADOR_NEGOCIO, ADMINISTRADOR_GENERAL.
- Gestion inicial de usuarios y negocios con aislamiento por negocio.
- Motor de puntos globales con historial y recálculo de nivel. La plataforma solo maneja puntos, no dinero.
- Modulo QR transaccional con token unico, expiracion, uso unico y bloqueo de doble uso.
- Modulo de recompensas y canjes con descuento inmediato de stock/puntos y reposicion por cancelacion.
- Modulo de battle pass con tiers, progreso por puntos globales y reclamo por tier.
- Modulo de isla con catalogo por nivel, desbloqueo de elementos y guardado de posiciones.
- Validaciones con Form Requests.
- Respuestas API consistentes con formato success/message/data.

### Tablas/migraciones incluidas

- roles
- usuarios
- negocios
- movimientos_puntos
- codigos_qr
- niveles
- recompensas
- canjes
- elementos_isla
- usuario_elementos
- configuracion_isla
- pase_batalla_tiers
- usuario_pase_batalla
- personal_access_tokens (Sanctum)

### Seeders incluidos

- RoleSeeder
- LevelSeeder
- BusinessSeeder
- BattlePassTierSeeder
- IslandElementSeeder
- AdminGeneralSeeder

Usuario admin de desarrollo:

- correo: admin@pasedebatalla.local
- password: AdminDev1234

### Endpoints disponibles

Auth:

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me
- POST /api/auth/logout

Rate limit aplicado:

- /api/auth/register: 3 intentos por minuto por IP
- /api/auth/login: 5 intentos por minuto por IP + correo
- /api/auth/forgot-password: 3 intentos por minuto por IP
- /api/auth/reset-password: 5 intentos por minuto por IP
- /api/qr/redeem: 10 intentos por minuto por IP + usuario
- /api/redemptions: 10 intentos por minuto por IP + usuario

Usuarios:

- GET /api/users
- GET /api/users/{user}
- PUT /api/users/{user}
- PATCH /api/users/{user}/status

Negocios:

- GET /api/businesses
- GET /api/businesses/{business}
- POST /api/businesses (solo ADMINISTRADOR_GENERAL)
- PUT /api/businesses/{business}. El ADMINISTRADOR_NEGOCIO puede editar el suyo (asi cambia `descripcion`, `direccion` y `telefono` desde "Mi negocio"), pero no su `estado`. `descripcion` admite hasta 500 caracteres y `telefono` solo numeros, espacios y los signos + - ( ) . Un campo vacio borra el dato.
- PATCH /api/businesses/{business}/status

Perfil publico del negocio (el ADMINISTRADOR_NEGOCIO edita solo el suyo; el ADMINISTRADOR_GENERAL, el de cualquiera):

- POST /api/businesses/{business}/cover: foto de portada. Se envia como `multipart/form-data` en el campo `imagen` (JPG, PNG o WebP, maximo 2 MB).
- DELETE /api/businesses/{business}/cover
- POST /api/businesses/{business}/logo: foto de perfil, mismo formato que la portada.
- DELETE /api/businesses/{business}/logo
- PUT /api/businesses/{business}/links: reemplaza la lista de enlaces. Recibe `enlaces`, un arreglo de hasta 8 elementos `{ nombre, url }`; solo se aceptan direcciones http o https. Una lista vacia los borra.
- GET /api/media/{carpeta}/{archivo}: entrega la imagen (`negocios` para las de los negocios, `usuarios` para las fotos de perfil). Es publica (sin token) para poder usarse en etiquetas `<img>`; el nombre de cada archivo es aleatorio.

Las respuestas de negocios traen `logo_url`, `portada_url` y `enlaces`. Las imagenes se guardan en `storage/app/public/negocios` y se sirven por la ruta de arriba, asi que no hace falta ejecutar `php artisan storage:link`. El limite de 2 MB coincide con el `upload_max_filesize` que trae PHP por defecto; el panel reduce las fotos antes de subirlas.

Administradores (solo ADMINISTRADOR_GENERAL):

- GET /api/admin/administrators
- POST /api/admin/administrators
- GET /api/admin/administrators/{administrator}
- PUT /api/admin/administrators/{administrator}. Si se envia `password` (con `password_confirmation`, minimo 8 caracteres) se restablece la contrasena de esa cuenta y se cierran sus sesiones abiertas. La propia no se puede cambiar por aqui: va por PUT /api/profile, que exige `password_actual`.
- PATCH /api/admin/administrators/{administrator}/status

Puntos:

- GET /api/points/balance
- GET /api/points/history (cada movimiento incluye `negocio_nombre`)
- GET /api/points/business-history

Los puntos se otorgan con el QR de un producto (venta), o bien con un QR por cantidad de puntos o un ajuste manual, que son exclusivos del administrador general. El administrador de negocio no puede decidir cuantos puntos da un QR.

Productos (catalogo por negocio, con puntos fijos; la plataforma no maneja precios ni dinero):

- GET /api/products (cliente: solo activos; admin de negocio: los suyos; admin general: todos, filtro `negocio_id`). Acepta `activos=1` (solo activos) y `per_page` (1 a 100). Cada producto incluye `negocio_nombre`.
- POST /api/products (solo ADMINISTRADOR_NEGOCIO, se crea en su negocio)
- PUT /api/products/{product} (solo ADMINISTRADOR_GENERAL: corrige nombre, descripcion, puntos o estado)
- PATCH /api/products/{product}/status (ADMINISTRADOR_NEGOCIO sobre sus propios productos, o ADMINISTRADOR_GENERAL)

El administrador de negocio crea sus productos y los activa o desactiva, pero no puede cambiarles el nombre ni los puntos: esas correcciones las hace el administrador general.

Un producto inactivo no genera QR y se elimina solo a los 7 dias de haberse desactivado (`desactivado_en`; el campo `se_elimina_en` indica la fecha). Reactivarlo cancela el plazo. Cumplido el plazo deja de listarse y responde 404; el borrado fisico lo hace `php artisan model:prune`, programado a diario (requiere `php artisan schedule:work` o cron). Las ventas conservan su copia del nombre y los puntos.

Ventas (cada venta genera un QR de un solo uso con la suma de puntos de sus productos):

- POST /api/sales (solo ADMINISTRADOR_NEGOCIO). Cuerpo: `{"items": [{"producto_id": 1, "cantidad": 2}]}`. Solo productos activos de su negocio; guarda una copia fija de nombre y puntos.
- GET /api/sales (admin de negocio: las suyas; admin general: todas, filtro `negocio_id`)

Al canjear el QR de una venta, el movimiento de puntos guarda `venta_id` y `otorgado_por` (quien registro la venta).

Directorio y perfil (cualquier usuario autenticado):

- GET /api/directory/businesses (negocios activos con datos publicos, `logo_url`, `portada_url`, `enlaces` y `productos_activos`)
- GET /api/directory/businesses/{business} (perfil publico de un negocio activo: portada, foto de perfil, contacto y enlaces)
- PUT /api/profile (nombre, correo; para cambiar `password` se exige `password_actual` y se cierran las demas sesiones)
- POST /api/profile/photo: sube o cambia la foto de perfil propia. Se envia como `multipart/form-data` en el campo `imagen` (JPG, PNG o WebP, maximo 2 MB).
- DELETE /api/profile/photo: quita la foto de perfil propia.

`foto_url` solo aparece en el perfil de su dueño (GET /api/auth/me y las respuestas de /api/profile); los listados de usuarios que ven los administradores no la incluyen. Las fotos se guardan en `storage/app/public/usuarios`.

Clientes del negocio:

- GET /api/business-clients (ADMINISTRADOR_NEGOCIO: su negocio; ADMINISTRADOR_GENERAL: requiere `negocio_id`). Clientes con movimientos en el negocio, con puntos ganados, visitas y ultima visita.

Ajustes manuales (solo ADMINISTRADOR_GENERAL):

- GET /api/points/adjustments
- POST /api/points/adjustments. Cuerpo: `{"correo": "...", "cantidad": -10, "motivo": "...", "negocio_id": null}`. Motivo obligatorio (min. 5), solo clientes, nunca deja el saldo en negativo; guarda `otorgado_por` y `motivo`.

Estadisticas (ADMINISTRADOR_NEGOCIO: su negocio; ADMINISTRADOR_GENERAL: toda la plataforma o `negocio_id`):

- GET /api/statistics. Devuelve `qr` con tres periodos (`hoy`, `semana` = ultimos 7 dias, `mes` = ultimos 30 dias), cada uno con `generados`, `utilizados`, `expirados`, `cancelados` y `activos`. Los QR ACTIVO ya vencidos se cuentan como expirados. Solo para el ADMINISTRADOR_GENERAL agrega `clientes_activos` (clientes distintos que ganaron puntos en cada periodo) y `clientes_registrados`. El dia empieza a medianoche de `APP_LOCAL_TIMEZONE` (por defecto America/Mexico_City). No incluye ventas ni dinero.

QR:

- GET /api/qr (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL). Cada codigo incluye `negocio_nombre` y `productos` (los productos de la venta que lo origino; lista vacia si se genero por cantidad de puntos). Acepta `estado` con uno o varios estados separados por coma (`ACTIVO`, `UTILIZADO`, `EXPIRADO`, `CANCELADO`); se filtra por el estado real, asi que un ACTIVO ya vencido cuenta como EXPIRADO. El panel pide por defecto `estado=ACTIVO,UTILIZADO`.
- GET /api/qr/{qrCode} (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- GET /api/qr/{qrCode}/image (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- POST /api/qr/generate (solo ADMINISTRADOR_GENERAL). Cuerpo: `{"negocio_id": 1, "puntos": 40}`; ambos obligatorios, puntos de 1 a 100000. El administrador de negocio genera sus QR desde sus productos con POST /api/sales.
- PATCH /api/qr/{qrCode}/cancel (ADMINISTRADOR_NEGOCIO de su negocio o ADMINISTRADOR_GENERAL; solo QR en estado ACTIVO)
- POST /api/qr/redeem (solo CLIENTE)

Los QR que nadie canjeo (expirados o cancelados) se eliminan solos a los 30 dias de generados, junto con la venta que los origino; los canjeados se conservan como historial. Lo hace `php artisan model:prune`, programado a diario (requiere `php artisan schedule:work` o cron). Son 30 dias para que las estadisticas del mes sigan contando todos los QR generados.

Recompensas:

- GET /api/rewards (CLIENTE: solo activas con stock / ADMIN: gestion por negocio). Cada recompensa incluye `negocio_nombre`.
- POST /api/rewards (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- PUT /api/rewards/{reward} (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- PATCH /api/rewards/{reward}/status (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)

Canjes:

- GET /api/redemptions/my (solo CLIENTE)
- POST /api/redemptions (solo CLIENTE)
- GET /api/redemptions/business (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- PATCH /api/redemptions/{redemption}/status (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)

Battle Pass:

- GET /api/battle-pass/progress (solo CLIENTE)
- POST /api/battle-pass/tiers/{tier}/claim (solo CLIENTE)

Isla:

- GET /api/island/catalog (solo CLIENTE)
- GET /api/island/layout (solo CLIENTE)
- POST /api/island/unlock (solo CLIENTE)
- POST /api/island/layout (solo CLIENTE)

## Frontend usuario

Rutas funcionales iniciales:

- /login
- /register
- /forgot-password
- /home
- /island
- /battle-pass
- /points
- /scan-qr
- /rewards
- /rewards/:id
- /redemptions
- /history
- /businesses
- /businesses/:id (perfil del negocio: portada, foto de perfil y enlaces)
- /profile

Incluye proteccion de rutas por sesion y consumo real de API para auth, puntos, historial, battle pass e isla.

El flujo de QR para cliente ya permite escaneo por camara (ademas de ingreso manual de token).

El flujo de recompensas permite canjear con descuento inmediato de puntos y stock.

La ruta /battle-pass ya muestra progreso real, siguiente hito y permite reclamar tiers desbloqueados.

La ruta /island ya permite ver catalogo por nivel, desbloquear elementos y guardar posicion.

## Frontend admin

Rutas funcionales iniciales:

- /login
- /dashboard
- /business ("Mi negocio": portada, foto de perfil, descripcion, direccion, telefono y enlaces; el administrador general elige el negocio)
- /qr
- /points
- /rewards
- /redemptions
- /history
- /users
- /businesses
- /administrators
- /levels
- /island-elements
- /statistics

Incluye proteccion de rutas por sesion y rol administrativo, mas consulta del historial de puntos del negocio.

El modulo QR de admin genera y visualiza imagen QR real (SVG) para cada codigo.

El modulo de recompensas/canjes permite crear recompensas y actualizar estado de canjes por negocio.

## Configuracion y ejecucion

### Requisitos en Windows

- Node.js 24+
- PHP 8.4+
- MySQL 8+

### Variables de entorno

Backend: copiar backend/.env.example a backend/.env y configurar DB_* para MySQL.

Si usas recuperación de contraseña por correo para user-app, agrega también:

- FRONTEND_USER_URL=http://localhost:5173

Los tokens de sesion vencen a los 30 dias (`SANCTUM_EXPIRATION`, en minutos). Los vencidos se borran con la tarea programada `sanctum:prune-expired`, que corre si esta activo `php artisan schedule:work` (o un cron con `schedule:run`).

Frontends: copiar en cada app:

- apps/user-app/.env.example -> apps/user-app/.env
- apps/admin-app/.env.example -> apps/admin-app/.env

Valor esperado:

- VITE_API_URL=http://localhost:8000/api

### Instalar dependencias

Backend:

```
cd backend
php artisan key:generate
php artisan migrate --seed
```

Frontends:

```
cd apps/user-app
npm install

cd ../admin-app
npm install
```

### Ejecutar en desarrollo

Backend API:

```
cd backend
php artisan serve
```

User app:

```
cd apps/user-app
npm run dev
```

Admin app:

```
cd apps/admin-app
npm run dev
```

## Pruebas

Las pruebas del backend usan MySQL/MariaDB (base `pase_de_batalla_test`, definida en `backend/phpunit.xml`). Crearla una vez:

```
CREATE DATABASE pase_de_batalla_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Las pruebas reinician esa base en cada ejecucion; no apuntarla a `pase_de_batalla`.

Backend:

```
cd backend
php artisan test
```

Cobertura actual minima:

- Registro correcto
- Login correcto
- Login incorrecto
- Acceso sin autenticacion
- Cliente intentando acceder a endpoint admin
- Admin de negocio intentando acceder a otro negocio
- Admin general accediendo correctamente
- Admin general creando administrador de negocio
- Admin negocio sin acceso a endpoints de administradores
- Puntos agregados correctamente
- Puntos globales acumulados correctamente
- Nivel actualizado al cruzar umbral de puntos
- Generacion de QR por admin de negocio en su propio negocio
- Bloqueo de generacion QR para negocio ajeno
- Canje QR valido con impacto en saldo global
- Bloqueo de doble canje del mismo token
- Bloqueo de canje en QR cancelado
- Bloqueo de canje en QR expirado y marcado de estado EXPIRADO
- Aislamiento de consulta QR por negocio
- Canje de recompensa con stock y puntos suficientes
- Bloqueo de canje por puntos insuficientes
- Bloqueo de canje por stock agotado
- Reposicion de stock y puntos al cancelar canje
- Competencia por ultimo stock (solo un canje exitoso)
- Aislamiento por negocio en gestion de canjes

- Progreso de battle pass con tiers desbloqueados/bloqueados
- Reclamo de tier desbloqueado y bloqueo de doble reclamo
- Bloqueo de reclamo de tier sin puntos suficientes
- Bloqueo de endpoints battle pass para roles no cliente
- Catalogo de isla con elementos disponibles y bloqueados por nivel
- Desbloqueo de elemento de isla por cliente
- Bloqueo de desbloqueo/posicionado sin requisitos
- Bloqueo de endpoints de isla para roles no cliente

## Pendiente para la siguiente fase

- Mejoras UX en rewards/redemptions y panel admin.
- Evolucion visual avanzada de isla (persistencia de capas/escenas, presets y efectos).

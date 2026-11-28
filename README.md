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
- Motor de puntos globales con historial. El nivel del cliente se calcula con sus puntos ganados (no se guarda). La plataforma solo maneja puntos, no dinero.
- Modulo QR transaccional con token unico, expiracion, uso unico y bloqueo de doble uso.
- Modulo de recompensas y canjes con descuento inmediato de stock/puntos y reposicion por cancelacion.
- Modulo de battle pass con 150 niveles, insignias (Bronce, Plata, Oro, Diamante) y bonos de puntos que el cliente reclama.
- Modulo de isla con catalogo por nivel del pase, desbloqueo de elementos y guardado de posiciones.
- Validaciones con Form Requests.
- Respuestas API consistentes con formato success/message/data.

### Tablas/migraciones incluidas

- roles
- usuarios
- negocios
- movimientos_puntos
- codigos_qr
- recompensas
- canjes
- elementos_isla
- usuario_elementos
- configuracion_isla
- pase_batalla_tiers (los niveles 2 a 150 del pase)
- usuario_pase_batalla (niveles que cada cliente ya reclamo)
- personal_access_tokens (Sanctum)

### Seeders incluidos

- RoleSeeder
- BusinessSeeder
- BattlePassTierSeeder (carga los 149 niveles del pase; sin el todos los clientes quedan en nivel 1)
- IslandElementSeeder
- AdminGeneralSeeder

En una base que ya existe, despues de migrar hay que cargar los niveles:

```bash
php artisan db:seed --class=BattlePassTierSeeder
```

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
- GET /api/media/{carpeta}/{archivo}: entrega la imagen (`negocios` para las de los negocios, `usuarios` para las fotos de perfil, `recompensas` para las fotos de los articulos). Es publica (sin token) para poder usarse en etiquetas `<img>`; el nombre de cada archivo es aleatorio.

Las respuestas de negocios traen `logo_url`, `portada_url` y `enlaces`. Las imagenes se guardan en `storage/app/public/negocios` y se sirven por la ruta de arriba, asi que no hace falta ejecutar `php artisan storage:link`. El limite de 2 MB coincide con el `upload_max_filesize` que trae PHP por defecto; el panel reduce las fotos antes de subirlas.

Administradores (solo ADMINISTRADOR_GENERAL):

- GET /api/admin/administrators
- POST /api/admin/administrators
- GET /api/admin/administrators/{administrator}
- PUT /api/admin/administrators/{administrator}. Si se envia `password` (con `password_confirmation`; debe cumplir la regla de contrasenas del proyecto) se restablece la contrasena de esa cuenta y se cierran sus sesiones abiertas. La propia no se puede cambiar por aqui: va por PUT /api/profile, que exige `password_actual`.
- PATCH /api/admin/administrators/{administrator}/status

Regla de contrasenas (registro, nueva contrasena, perfil, alta y restablecimiento de administradores): minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo. Esta definida una sola vez en `AppServiceProvider` (`Password::defaults()`), sus mensajes en español en `App\Support\PasswordPolicy`, y la app y el panel muestran la misma lista con `packages/shared/src/password.ts`.

Puntos:

- GET /api/points/balance (`saldo_global`, `puntos_acumulados` y `nivel`)
- GET /api/points/history (cada movimiento incluye `negocio_nombre`)
- GET /api/points/business-history

Los puntos se otorgan con el QR de un producto (venta), o bien con un QR por cantidad de puntos o un ajuste manual, que son exclusivos del administrador general. El administrador de negocio decide los puntos de sus productos, pero con tope (ver abajo): no puede generar un QR por la cantidad que quiera.

Productos (catalogo por negocio, con puntos fijos; la plataforma no maneja precios ni dinero):

- GET /api/products (cliente: solo activos; admin de negocio: los suyos; admin general: todos, filtro `negocio_id`). Acepta `activos=1` (solo activos) y `per_page` (1 a 100). Cada producto incluye `negocio_nombre`.
- POST /api/products (solo ADMINISTRADOR_NEGOCIO, se crea en su negocio)
- PUT /api/products/{product} (ADMINISTRADOR_NEGOCIO sobre sus propios productos, o ADMINISTRADOR_GENERAL: edita nombre, descripcion, puntos o estado). Las ventas y los QR ya generados conservan el nombre y los puntos con los que se emitieron.
- PATCH /api/products/{product}/status (ADMINISTRADOR_NEGOCIO sobre sus propios productos, o ADMINISTRADOR_GENERAL)

El administrador de negocio crea, edita y activa o desactiva sus productos; el administrador general puede corregir los de cualquier negocio.

Cuantos puntos dar: la regla para los negocios es **1 punto por cada $10 del precio** (una compra de $150 da 15 puntos). El administrador de negocio no puede poner mas de **150 puntos por producto**, ni al crear ni al editar; el administrador general puede llegar a 100,000. Si el administrador general ya le puso a un producto mas de 150 puntos, el negocio puede seguir editando su nombre o su estado mientras no cambie esos puntos. Los topes estan en `App\Support\PointLimits` y el panel los muestra desde `apps/admin-app/src/lib/limits.ts`.

Un producto inactivo no genera QR y se elimina solo a los 7 dias de haberse desactivado (`desactivado_en`; el campo `se_elimina_en` indica la fecha). Reactivarlo cancela el plazo. Cumplido el plazo deja de listarse y responde 404; el borrado fisico lo hace `php artisan model:prune`, programado a diario (requiere `php artisan schedule:work` o cron). Las ventas conservan su copia del nombre y los puntos.

Ventas (cada venta genera un QR de un solo uso con la suma de puntos de sus productos):

- POST /api/sales (solo ADMINISTRADOR_NEGOCIO). Cuerpo: `{"items": [{"producto_id": 1, "cantidad": 2}]}`. Solo productos activos de su negocio; guarda una copia fija de nombre y puntos. Una venta no puede dar mas de **500 puntos** en total (responde 422 y hay que dividir la compra en varias ventas); la unica excepcion es vender una sola unidad de un producto que por si solo valga mas.
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
- POST /api/qr/redeem (solo CLIENTE). La respuesta trae `nivel_anterior` y `nivel` para avisar al cliente cuando sube de nivel.

Los QR que nadie canjeo (expirados o cancelados) se eliminan solos a los 30 dias de generados, junto con la venta que los origino; los canjeados se conservan como historial. Lo hace `php artisan model:prune`, programado a diario (requiere `php artisan schedule:work` o cron). Son 30 dias para que las estadisticas del mes sigan contando todos los QR generados.

Recompensas:

- GET /api/rewards (CLIENTE: solo activas con stock / ADMIN: gestion por negocio). Cada recompensa incluye `negocio_nombre`.
- POST /api/rewards (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- PUT /api/rewards/{reward} (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL). Con `cantidad_disponible` (entero de 0 a 100000) el negocio repone o corrige las existencias de sus recompensas.
- PATCH /api/rewards/{reward}/status (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- POST /api/rewards/{reward}/photo: sube o cambia la foto del articulo. Se envia como `multipart/form-data` en el campo `imagen` (JPG, PNG o WebP, maximo 2 MB). El negocio solo en sus recompensas; el administrador general en cualquiera.
- DELETE /api/rewards/{reward}/photo: quita la foto del articulo.

Cada recompensa trae `foto_url` (null si no tiene foto). Existencias: cada canje descuenta 1 y un canje cancelado la devuelve. Al llegar a 0 la recompensa queda agotada: deja de aparecer en el listado de los clientes y no se puede canjear hasta que el negocio reponga la cantidad.

Canjes:

- GET /api/redemptions/my (solo CLIENTE)
- POST /api/redemptions (solo CLIENTE)
- GET /api/redemptions/business (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- PATCH /api/redemptions/{redemption}/status (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)

Notificaciones (cada usuario solo ve las suyas):

- GET /api/notifications: las mas recientes primero, con `titulo`, `mensaje`, `leida` y `fecha`.
- GET /api/notifications/summary: `no_leidas` y `ultima` (la mas reciente sin leer). Es la consulta que hace la campana del panel cada 20 segundos.
- PATCH /api/notifications/{id}/read: marca una como leida.
- POST /api/notifications/read-all: marca todas como leidas.

Hoy solo existe un aviso: cuando un cliente canjea una recompensa, se notifica a los ADMINISTRADOR_NEGOCIO activos del negocio dueño de esa recompensa (a nadie mas), con el nombre del cliente y de la recompensa. Se guardan en la tabla `notifications` (notificaciones de Laravel, canal `database`) y las de mas de 60 dias se borran con la tarea programada diaria. No son notificaciones push: el aviso aparece mientras el panel esta abierto.

Battle Pass (solo CLIENTE):

- GET /api/battle-pass/progress: `nivel_actual`, `nivel_maximo`, `puntos_acumulados`, `puntos_nivel_actual`, `puntos_siguiente_nivel`, `faltante`, `insignia_actual`, `siguiente_insignia` (nivel, insignia, puntos que faltan y bono), `niveles_por_reclamar`, `puntos_por_reclamar` y `tiers` (los 149 niveles con `nivel`, `puntos_requeridos`, `puntos_bono`, `insignia` y `estado_usuario`: BLOQUEADO, DESBLOQUEADO o RECLAMADO).
- POST /api/battle-pass/tiers/{tier}/claim: reclama el bono de un nivel ya alcanzado. No hace falta reclamar en orden; un nivel solo se puede reclamar una vez.
- POST /api/battle-pass/claim-all: reclama de una vez todos los niveles alcanzados que sigan pendientes. Devuelve `niveles_reclamados`, `puntos_reclamados` y `saldo_global`; si no hay nada pendiente responde con ceros.

Niveles: son 150. Todos los clientes empiezan en el nivel 1 y suben con sus puntos ganados en total (canjear recompensas no hace retroceder). El nivel no se guarda en el usuario: es 1 + los niveles del pase que ya alcanzo. La curva vive en `App\Support\LevelCurve`: subir al nivel `n` cuesta `round(20 * (1 + n/150)^1.6 + 5)` puntos (25 al inicio, 66 al final), asi que el nivel 10 pide 237 puntos ganados, el 50 pide 1,514, el 100 pide 3,687 y el 150 pide 6,586.

Bonos: cada nivel entrega 2 puntos y los niveles con insignia suman un bono (nivel 10 Bronce +15, nivel 50 Plata +40, nivel 100 Oro +75, nivel 150 Diamante +150; 578 puntos en total). Nada se acredita solo: el cliente los reclama. Se guardan como movimientos `BONO_NIVEL`, sin negocio: suman al saldo para canjear, pero no cuentan como puntos ganados (no hacen subir de nivel) ni aparecen en el historial o las estadisticas de ningun negocio.

Isla:

- GET /api/island/catalog (solo CLIENTE)
- GET /api/island/layout (solo CLIENTE)
- POST /api/island/unlock (solo CLIENTE)
- POST /api/island/layout (solo CLIENTE)

El `nivel_requerido` de cada pieza es un nivel del pase de batalla: la Casa y el Arbol estan disponibles desde el nivel 1 y el Perro desde el nivel 5.

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

La ruta /battle-pass muestra el nivel actual y su insignia, lo que hay por reclamar (con boton por nivel y «Reclamar todo»), la proxima insignia, las 4 insignias, los proximos 10 niveles y, plegados, los niveles ya reclamados. Nunca lista los 150 niveles a la vez.

Al canjear un QR, si el cliente sube de nivel se le avisa y se le lleva al pase. El inicio avisa cuando hay bonos sin reclamar, el perfil muestra la insignia junto al nivel y el historial distingue los «Bonos de nivel».

La ruta /island ya permite ver catalogo por nivel, desbloquear elementos y guardar posicion.

## Frontend admin

Rutas funcionales iniciales:

- /login
- /dashboard
- /business ("Mi negocio": portada, foto de perfil, descripcion, direccion, telefono y enlaces; el administrador general elige el negocio)
- /qr (generar QR de una compra y listado de codigos)
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
- /notifications (avisos del negocio: recompensas canjeadas; la campana esta en el encabezado del dashboard)

Incluye proteccion de rutas por sesion y rol administrativo, mas consulta del historial de puntos del negocio.

El modulo QR de admin genera y visualiza imagen QR real (SVG) para cada codigo.

En /qr el administrador de negocio arma la compra del cliente: cada toque en un producto suma una unidad, el resumen permite ajustar cantidades con + y − y un solo boton genera **un QR por toda la compra** (POST /api/sales). Al generarlo la pantalla se desplaza al codigo, que se puede cancelar mientras siga vigente. Si la compra pasa del tope de 500 puntos, el panel lo avisa y no deja generar el QR. Ya no existe la pantalla /sales: todo se hace desde /qr.

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
- Nivel calculado al cruzar los puntos que pide cada nivel (y nivel maximo al pasarse del ultimo)
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
- Tope de 150 puntos por producto para el negocio (crear y editar), sin tope para el administrador general
- Tope de 500 puntos por venta

- Curva de los 150 niveles (valores de control, costo creciente y bonos) y carga de los 149 niveles
- Progreso del pase: nivel, insignia actual, proxima insignia y niveles por reclamar
- Reclamo de un nivel y bloqueo de doble reclamo; reclamo en cualquier orden
- Reclamar todo en un solo movimiento, sin efecto al repetirlo
- El bono sube el saldo pero no el nivel; canjear no baja el nivel
- Bloqueo de reclamo de un nivel sin puntos suficientes
- Bloqueo de endpoints battle pass para roles no cliente
- Catalogo de isla con elementos disponibles y bloqueados por nivel del pase
- Desbloqueo de elemento de isla por cliente
- Bloqueo de desbloqueo/posicionado sin requisitos
- Bloqueo de endpoints de isla para roles no cliente

## Pendiente para la siguiente fase

- Mejoras UX en rewards/redemptions y panel admin.
- Evolucion visual avanzada de isla (persistencia de capas/escenas, presets y efectos).

# Pase de Batalla

Plataforma de fidelizacion gamificada con puntos globales, niveles, QR, recompensas e isla personalizable.

Estado actual: Fase 1, Fase 2 base, Fase 3, Fase 4 (puntos globales), Fase 5 backend (QR transaccional) y Fase 6 (battle pass base) completadas.

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
- Motor de puntos globales con historial, reglas por negocio y recálculo de nivel.
- Modulo QR transaccional con token unico, expiracion, uso unico y bloqueo de doble uso.
- Modulo de battle pass con tiers, progreso por puntos globales y reclamo por tier.
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
- reglas_puntos
- pase_batalla_tiers
- usuario_pase_batalla
- personal_access_tokens (Sanctum)

### Seeders incluidos

- RoleSeeder
- LevelSeeder
- BusinessSeeder
- PointRuleSeeder
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

Usuarios:

- GET /api/users
- GET /api/users/{user}
- PUT /api/users/{user}
- PATCH /api/users/{user}/status

Negocios:

- GET /api/businesses
- GET /api/businesses/{business}
- POST /api/businesses (solo ADMINISTRADOR_GENERAL)
- PUT /api/businesses/{business}
- PATCH /api/businesses/{business}/status

Administradores (solo ADMINISTRADOR_GENERAL):

- GET /api/admin/administrators
- POST /api/admin/administrators
- GET /api/admin/administrators/{administrator}
- PUT /api/admin/administrators/{administrator}
- PATCH /api/admin/administrators/{administrator}/status

Puntos:

- GET /api/points/balance
- GET /api/points/history
- GET /api/points/business-history
- POST /api/points/award

Reglas de puntos:

- GET /api/point-rules
- POST /api/point-rules (solo ADMINISTRADOR_GENERAL)
- PUT /api/point-rules/{pointRule}
- PATCH /api/point-rules/{pointRule}/status

QR:

- GET /api/qr (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- GET /api/qr/{qrCode} (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- GET /api/qr/{qrCode}/image (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- POST /api/qr/generate (solo ADMINISTRADOR_NEGOCIO y ADMINISTRADOR_GENERAL)
- POST /api/qr/redeem (solo CLIENTE)

Battle Pass:

- GET /api/battle-pass/progress (solo CLIENTE)
- POST /api/battle-pass/tiers/{tier}/claim (solo CLIENTE)

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
- /profile

Incluye proteccion de rutas por sesion y consumo real de API para auth, puntos e historial.

El flujo de QR para cliente ya permite escaneo por camara (ademas de ingreso manual de token).

La ruta /battle-pass ya muestra progreso real, siguiente hito y permite reclamar tiers desbloqueados.

## Frontend admin

Rutas funcionales iniciales:

- /login
- /dashboard
- /business
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
- /point-rules
- /statistics

Incluye proteccion de rutas por sesion y rol administrativo, mas flujo funcional para otorgar puntos y consultar historial del negocio.

El modulo QR de admin genera y visualiza imagen QR real (SVG) para cada codigo.

## Configuracion y ejecucion

### Requisitos en Windows

- Node.js 24+
- PHP 8.4+
- MySQL 8+

### Variables de entorno

Backend: copiar backend/.env.example a backend/.env y configurar DB_* para MySQL.

Si usas recuperación de contraseña por correo para user-app, agrega también:

- FRONTEND_USER_URL=http://localhost:5173

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
- Bloqueo de otorgamiento con regla de otro negocio
- Generacion de QR por admin de negocio en su propio negocio
- Bloqueo de generacion QR para negocio ajeno
- Canje QR valido con impacto en saldo global
- Bloqueo de doble canje del mismo token
- Bloqueo de canje en QR cancelado
- Bloqueo de canje en QR expirado y marcado de estado EXPIRADO
- Aislamiento de consulta QR por negocio
- Progreso de battle pass con tiers desbloqueados/bloqueados
- Reclamo de tier desbloqueado y bloqueo de doble reclamo
- Bloqueo de reclamo de tier sin puntos suficientes
- Bloqueo de endpoints battle pass para roles no cliente

## Pendiente para la siguiente fase

- Recompensas/canjes con control de stock y concurrencia.
- Logica de isla (desbloqueos, configuracion y evolucion visual por nivel).

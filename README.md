# Pase de Batalla

Plataforma de fidelizacion gamificada con puntos globales, niveles, QR, recompensas e isla personalizable.

Estado actual: Fase 1 + base de Fase 2 completada.

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
- personal_access_tokens (Sanctum)

### Seeders incluidos

- RoleSeeder
- LevelSeeder
- BusinessSeeder
- PointRuleSeeder
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
- GET /api/auth/me
- POST /api/auth/logout

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

Incluye proteccion de rutas por sesion y consumo real de API para auth.

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

Incluye proteccion de rutas por sesion y rol administrativo.

## Configuracion y ejecucion

### Requisitos en Windows

- Node.js 24+
- PHP 8.4+
- MySQL 8+

### Variables de entorno

Backend: copiar backend/.env.example a backend/.env y configurar DB_* para MySQL.

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

## Pendiente para la siguiente fase

- CRUD completo de administradores de negocio y asignacion de negocio.
- Motor de puntos (movimientos, saldo global, reglas aplicadas en operaciones reales).
- Flujo QR transaccional con bloqueo de concurrencia y uso unico.
- Niveles dinamicos por puntos globales y progreso de battle pass.
- Recompensas/canjes con control de stock y concurrencia.
- Logica de isla (desbloqueos, configuracion y evolucion visual por nivel).

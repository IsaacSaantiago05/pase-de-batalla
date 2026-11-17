<?php

namespace Tests\Feature\Statistics;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\QrCode;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StatisticsTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;
    private Business $businessB;
    private User $adminA;
    private User $general;
    private int $tokenCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();

        // 17 de noviembre, 9 de la noche en Mexico: en UTC ya es dia 18.
        $this->travelTo(Carbon::parse('2026-11-17 21:00:00', 'America/Mexico_City'));

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
        $this->adminA = $this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id);
        $this->general = $this->makeUser($this->adminGeneralRole, 'general@example.com');
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null): User
    {
        return User::query()->create([
            'nombre' => 'Usuario',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    /** Crea un QR generado en la fecha local indicada (hora de Mexico). */
    private function makeQr(Business $business, string $localDateTime, string $status = 'UTILIZADO', ?string $localExpiration = null): QrCode
    {
        $created = Carbon::parse($localDateTime, 'America/Mexico_City')->utc();

        return QrCode::query()->create([
            'negocio_id' => $business->id,
            'token' => 'TOKEN-ESTADISTICAS-'.(++$this->tokenCounter),
            'puntos' => 10,
            'estado' => $status,
            'fecha_creacion' => $created,
            'fecha_expiracion' => $localExpiration !== null ? Carbon::parse($localExpiration, 'America/Mexico_City')->utc() : null,
        ]);
    }

    private function earnPoints(User $client, Business $business, string $localDateTime): void
    {
        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $business->id,
            'cantidad' => 10,
            'tipo' => 'GANANCIA',
            'fecha' => Carbon::parse($localDateTime, 'America/Mexico_City')->utc(),
        ]);
    }

    private function seedQrCodes(): void
    {
        // Negocio A, hoy (17 nov hora local).
        $this->makeQr($this->businessA, '2026-11-17 00:30:00', 'UTILIZADO');
        $this->makeQr($this->businessA, '2026-11-17 10:00:00', 'CANCELADO');
        $this->makeQr($this->businessA, '2026-11-17 20:59:00', 'ACTIVO', '2026-11-17 21:05:00');
        $this->makeQr($this->businessA, '2026-11-17 20:00:00', 'ACTIVO', '2026-11-17 20:01:00'); // ya vencio
        // Negocio A, ayer a las 11 de la noche hora local: no es de hoy aunque en UTC ya era 17.
        $this->makeQr($this->businessA, '2026-11-16 23:00:00', 'EXPIRADO');
        // Negocio A, hace 6 dias (entra en la semana) y hace 7 (solo en el mes).
        $this->makeQr($this->businessA, '2026-11-11 12:00:00', 'UTILIZADO');
        $this->makeQr($this->businessA, '2026-11-10 12:00:00', 'UTILIZADO');
        // Negocio A, hace 29 dias (entra en el mes) y hace 30 (fuera de todo).
        $this->makeQr($this->businessA, '2026-10-19 08:00:00', 'UTILIZADO');
        $this->makeQr($this->businessA, '2026-10-18 23:00:00', 'UTILIZADO');
        // Negocio B, hoy.
        $this->makeQr($this->businessB, '2026-11-17 12:00:00', 'UTILIZADO');
    }

    public function test_business_admin_sees_qr_of_today_week_and_month_for_own_business(): void
    {
        $this->seedQrCodes();
        Sanctum::actingAs($this->adminA);

        $this->getJson('/api/statistics')
            ->assertOk()
            ->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.qr.hoy', ['generados' => 4, 'utilizados' => 1, 'expirados' => 1, 'cancelados' => 1, 'activos' => 1])
            ->assertJsonPath('data.qr.semana', ['generados' => 6, 'utilizados' => 2, 'expirados' => 2, 'cancelados' => 1, 'activos' => 1])
            ->assertJsonPath('data.qr.mes', ['generados' => 8, 'utilizados' => 4, 'expirados' => 2, 'cancelados' => 1, 'activos' => 1]);
    }

    public function test_business_admin_does_not_get_active_clients_nor_other_business(): void
    {
        $this->seedQrCodes();
        $this->earnPoints($this->makeUser($this->clienteRole, 'c1@example.com'), $this->businessA, '2026-11-17 10:00:00');
        Sanctum::actingAs($this->adminA);

        // Aunque pida otro negocio, recibe el suyo y sin datos de clientes.
        $this->getJson('/api/statistics?negocio_id='.$this->businessB->id)
            ->assertOk()
            ->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.qr.hoy.generados', 4)
            ->assertJsonMissingPath('data.clientes_activos')
            ->assertJsonMissingPath('data.clientes_registrados');
    }

    public function test_general_admin_sees_platform_qr_and_active_clients(): void
    {
        $this->seedQrCodes();
        $clientToday = $this->makeUser($this->clienteRole, 'c1@example.com');
        $clientWeek = $this->makeUser($this->clienteRole, 'c2@example.com');
        $clientMonth = $this->makeUser($this->clienteRole, 'c3@example.com');
        $this->makeUser($this->clienteRole, 'sin.actividad@example.com');

        // El mismo cliente con dos movimientos hoy cuenta una sola vez.
        $this->earnPoints($clientToday, $this->businessA, '2026-11-17 09:00:00');
        $this->earnPoints($clientToday, $this->businessB, '2026-11-17 15:00:00');
        $this->earnPoints($clientWeek, $this->businessB, '2026-11-13 12:00:00');
        $this->earnPoints($clientMonth, $this->businessA, '2026-10-25 12:00:00');

        Sanctum::actingAs($this->general);

        $this->getJson('/api/statistics')
            ->assertOk()
            ->assertJsonPath('data.negocio_id', null)
            ->assertJsonPath('data.qr.hoy.generados', 5)
            ->assertJsonPath('data.qr.semana.generados', 7)
            ->assertJsonPath('data.qr.mes.generados', 9)
            ->assertJsonPath('data.clientes_activos', ['hoy' => 1, 'semana' => 2, 'mes' => 3])
            ->assertJsonPath('data.clientes_registrados', 4);

        // Con filtro de negocio, todo se limita a ese negocio.
        $this->getJson('/api/statistics?negocio_id='.$this->businessB->id)
            ->assertOk()
            ->assertJsonPath('data.negocio_id', $this->businessB->id)
            ->assertJsonPath('data.qr.mes.generados', 1)
            ->assertJsonPath('data.clientes_activos', ['hoy' => 1, 'semana' => 2, 'mes' => 2]);
    }

    public function test_statistics_do_not_expose_sales_or_money(): void
    {
        Sanctum::actingAs($this->general);

        $this->getJson('/api/statistics')
            ->assertOk()
            ->assertJsonPath('data.qr.hoy.generados', 0)
            ->assertJsonMissingPath('data.resumen')
            ->assertJsonMissingPath('data.por_dia')
            ->assertJsonMissingPath('data.top_productos')
            ->assertJsonMissingPath('data.por_negocio');
    }

    public function test_statistics_validate_business_and_require_admin_role(): void
    {
        Sanctum::actingAs($this->general);
        $this->getJson('/api/statistics?negocio_id=9999')->assertStatus(422);

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));
        $this->getJson('/api/statistics')->assertStatus(403);
    }

    public function test_statistics_require_authentication(): void
    {
        $this->getJson('/api/statistics')->assertStatus(401);
    }
}

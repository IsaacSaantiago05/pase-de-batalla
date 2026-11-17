<?php

namespace Tests\Feature\Points;

use App\Models\Business;
use App\Models\Level;
use App\Models\QrCode;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PointsFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);

        Level::query()->create([
            'nombre' => 'Nivel 1',
            'puntos_minimos' => 0,
            'puntos_maximos' => 99,
            'estado' => true,
        ]);

        Level::query()->create([
            'nombre' => 'Nivel 2',
            'puntos_minimos' => 100,
            'puntos_maximos' => 199,
            'estado' => true,
        ]);

        $this->businessA = Business::query()->create([
            'nombre' => 'Negocio A',
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    public function test_points_are_awarded_and_global_balance_is_returned(): void
    {
        $client = $this->makeUser($this->clienteRole, 'clientex@example.com');

        Sanctum::actingAs($client);

        $this->redeemNewQr(50)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.movimiento.cantidad', 50)
            ->assertJsonPath('data.saldo_global', 50);

        $this->getJson('/api/points/balance')
            ->assertOk()
            ->assertJsonPath('data.saldo_global', 50)
            ->assertJsonPath('data.puntos_acumulados', 50);
    }

    public function test_global_points_accumulate_and_level_is_updated(): void
    {
        $client = $this->makeUser($this->clienteRole, 'clientey@example.com');

        Sanctum::actingAs($client);

        $this->redeemNewQr(50)->assertCreated();
        $this->redeemNewQr(50)->assertCreated();

        $client->refresh();

        $this->assertDatabaseCount('movimientos_puntos', 2);
        $this->assertEquals(100, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));

        $nivel2 = Level::query()->where('nombre', 'Nivel 2')->firstOrFail();
        $this->assertEquals($nivel2->id, $client->nivel_id);
    }

    public function test_level_falls_back_to_highest_active_when_balance_exceeds_ranges(): void
    {
        $client = $this->makeUser($this->clienteRole, 'clientealto@example.com');

        Sanctum::actingAs($client);

        for ($i = 0; $i < 5; $i++) {
            $this->redeemNewQr(50)->assertCreated();
        }

        $client->refresh();

        $nivel2 = Level::query()->where('nombre', 'Nivel 2')->firstOrFail();
        $this->assertEquals(250, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));
        $this->assertEquals($nivel2->id, $client->nivel_id);
    }

    public function test_points_can_only_be_earned_by_clients(): void
    {
        $adminNegocio = $this->makeUser($this->adminNegocioRole, 'admin.only.clients@example.com', $this->businessA->id);

        Sanctum::actingAs($adminNegocio);

        $this->redeemNewQr(50)->assertStatus(403);

        $this->assertDatabaseMissing('movimientos_puntos', ['usuario_id' => $adminNegocio->id]);
    }

    public function test_point_rules_and_direct_award_no_longer_exist(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente.sin.reglas@example.com');

        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'general.sin.reglas@example.com'));

        $this->getJson('/api/point-rules')->assertNotFound();
        $this->postJson('/api/point-rules', ['negocio_id' => $this->businessA->id, 'puntos' => 10])->assertNotFound();
        $this->postJson('/api/points/award', ['usuario_id' => $client->id])->assertNotFound();

        $this->assertDatabaseCount('movimientos_puntos', 0);
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null): User
    {
        return User::query()->create([
            'nombre' => 'Usuario '.$role->nombre,
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    /**
     * Crea un QR activo del negocio A y lo canjea con el usuario autenticado.
     */
    private function redeemNewQr(int $points): \Illuminate\Testing\TestResponse
    {
        $qrCode = QrCode::query()->create([
            'negocio_id' => $this->businessA->id,
            'token' => 'TOKEN-PUNTOS-'.uniqid(),
            'puntos' => $points,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now(),
        ]);

        return $this->postJson('/api/qr/redeem', ['token' => $qrCode->token]);
    }
}

<?php

namespace Tests\Feature\Points;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\QrCode;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BattlePassTierSeeder;
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

    public function test_global_points_accumulate_and_level_goes_up(): void
    {
        $this->seed(BattlePassTierSeeder::class);
        $client = $this->makeUser($this->clienteRole, 'clientey@example.com');

        Sanctum::actingAs($client);

        // Recien registrado esta en el nivel 1; el nivel 2 pide 25 puntos y el 4 pide 77.
        $this->getJson('/api/points/balance')->assertOk()->assertJsonPath('data.nivel', 1);

        $this->redeemNewQr(50)->assertCreated()->assertJsonPath('data.nivel_anterior', 1)->assertJsonPath('data.nivel', 2);
        $this->redeemNewQr(50)->assertCreated()->assertJsonPath('data.nivel_anterior', 2)->assertJsonPath('data.nivel', 4);

        $this->assertDatabaseCount('movimientos_puntos', 2);
        $this->assertEquals(100, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));

        $this->getJson('/api/points/balance')
            ->assertOk()
            ->assertJsonPath('data.saldo_global', 100)
            ->assertJsonPath('data.nivel', 4)
            ->assertJsonMissingPath('data.nivel_id');
    }

    public function test_level_stays_at_the_last_one_when_points_exceed_it(): void
    {
        $this->seed(BattlePassTierSeeder::class);
        $client = $this->makeUser($this->clienteRole, 'clientealto@example.com');

        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $this->businessA->id,
            'qr_id' => null,
            'cantidad' => 9000,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);

        Sanctum::actingAs($client);

        $this->getJson('/api/points/balance')
            ->assertOk()
            ->assertJsonPath('data.puntos_acumulados', 9000)
            ->assertJsonPath('data.nivel', 150);
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

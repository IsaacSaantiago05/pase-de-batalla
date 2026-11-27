<?php

namespace Tests\Feature\Rewards;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\Redemption;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use App\Services\BattlePassService;
use Database\Seeders\BattlePassTierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RedemptionFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;
    private Business $businessB;

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

        $this->businessB = Business::query()->create([
            'nombre' => 'Negocio B',
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    public function test_client_can_redeem_reward_and_stock_is_discounted_immediately(): void
    {
        $client = $this->createClient('cliente.reward@example.com');
        $this->grantPoints($client, 150, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 100, 5);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.canje.estado', 'PENDIENTE')
            ->assertJsonPath('data.saldo_global', 50);

        $this->assertEquals(4, Reward::query()->findOrFail($reward->id)->cantidad_disponible);
        $this->assertEquals(50, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));
    }

    public function test_client_cannot_redeem_without_enough_points(): void
    {
        $client = $this->createClient('cliente.low.points@example.com');
        $this->grantPoints($client, 40, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 100, 5);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $response->assertStatus(422)->assertJsonPath('success', false);

        $this->assertEquals(5, Reward::query()->findOrFail($reward->id)->cantidad_disponible);
        $this->assertDatabaseCount('canjes', 0);
    }

    public function test_client_cannot_redeem_when_stock_is_zero(): void
    {
        $client = $this->createClient('cliente.stock.zero@example.com');
        $this->grantPoints($client, 200, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 100, 0);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $response->assertStatus(422)->assertJsonPath('success', false);
        $this->assertDatabaseCount('canjes', 0);
    }

    public function test_admin_cancel_redemption_restores_points_and_stock(): void
    {
        $client = $this->createClient('cliente.cancel.flow@example.com');
        $this->grantPoints($client, 150, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 100, 2);

        Sanctum::actingAs($client);
        $createResponse = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $createResponse->assertCreated();

        $redemptionId = (int) ($createResponse->json('data.canje.id') ?? 0);
        $this->assertTrue($redemptionId > 0);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'admin.cancel@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $cancelResponse = $this->patchJson('/api/redemptions/'.$redemptionId.'/status', [
            'estado' => 'CANCELADO',
        ]);

        $cancelResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'CANCELADO');

        $this->assertEquals(2, Reward::query()->findOrFail($reward->id)->cantidad_disponible);
        $this->assertEquals(150, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));
        $this->assertEquals(1, PointMovement::query()->where('usuario_id', $client->id)->where('tipo', 'AJUSTE')->count());
    }

    public function test_only_one_redemption_succeeds_for_single_stock(): void
    {
        $clientOne = $this->createClient('cliente.one.stock@example.com');
        $clientTwo = $this->createClient('cliente.two.stock@example.com');
        $this->grantPoints($clientOne, 200, $this->businessA->id);
        $this->grantPoints($clientTwo, 200, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 100, 1);

        Sanctum::actingAs($clientOne);
        $first = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);
        $first->assertCreated();

        Sanctum::actingAs($clientTwo);
        $second = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);
        $second->assertStatus(422);

        $this->assertEquals(0, Reward::query()->findOrFail($reward->id)->cantidad_disponible);
        $this->assertDatabaseCount('canjes', 1);
    }

    public function test_business_admin_cannot_manage_other_business_redemption(): void
    {
        $client = $this->createClient('cliente.other.biz@example.com');
        $this->grantPoints($client, 200, $this->businessB->id);

        $reward = $this->createReward($this->businessB->id, 100, 2);

        Sanctum::actingAs($client);
        $createResponse = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $createResponse->assertCreated();
        $redemptionId = (int) ($createResponse->json('data.canje.id') ?? 0);

        $adminBusinessA = User::query()->create([
            'nombre' => 'Admin A',
            'correo' => 'admin.a@biz.example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminBusinessA);
        $response = $this->patchJson('/api/redemptions/'.$redemptionId.'/status', [
            'estado' => 'CANCELADO',
        ]);

        $response->assertStatus(403);
        $this->assertEquals('PENDIENTE', Redemption::query()->findOrFail($redemptionId)->estado);
    }

    public function test_redemption_create_is_rate_limited(): void
    {
        $client = $this->createClient('cliente.throttle.redemption@example.com');
        $this->grantPoints($client, 500, $this->businessA->id);

        $reward = $this->createReward($this->businessA->id, 10, 20);

        Sanctum::actingAs($client);

        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $response = $this->postJson('/api/redemptions', [
                'recompensa_id' => $reward->id,
            ]);

            $response->assertCreated();
        }

        $limited = $this->postJson('/api/redemptions', [
            'recompensa_id' => $reward->id,
        ]);

        $limited->assertStatus(429);
    }

    public function test_redemption_does_not_lower_client_level(): void
    {
        $this->seed(BattlePassTierSeeder::class);
        $client = $this->createClient('cliente.level.keep@example.com');
        // 250 puntos ganados = nivel 10 del pase (pide 237).
        $this->grantPoints($client, 250, $this->businessA->id);
        $this->assertSame(10, app(BattlePassService::class)->currentLevel($client));

        $reward = $this->createReward($this->businessA->id, 200, 5);

        Sanctum::actingAs($client);

        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])
            ->assertCreated()
            ->assertJsonPath('data.saldo_global', 50)
            ->assertJsonPath('data.nivel', 10);

        $this->assertSame(10, app(BattlePassService::class)->currentLevel($client));
    }

    public function test_rewards_and_points_history_include_the_business_name(): void
    {
        $client = $this->createClient('cliente.nombres@example.com');
        $this->grantPoints($client, 150, $this->businessB->id);
        $this->createReward($this->businessA->id, 100, 5);
        $this->createReward($this->businessB->id, 50, 5);

        Sanctum::actingAs($client);

        $rewards = collect($this->getJson('/api/rewards')->assertOk()->json('data'));
        $this->assertSame('Negocio A', $rewards->firstWhere('puntos_requeridos', 100)['negocio_nombre']);
        $this->assertSame('Negocio B', $rewards->firstWhere('puntos_requeridos', 50)['negocio_nombre']);

        // Al canjear, el movimiento tambien dice de que negocio fue.
        $this->postJson('/api/redemptions', ['recompensa_id' => $rewards->firstWhere('puntos_requeridos', 100)['id']])->assertCreated();

        $history = collect($this->getJson('/api/points/history')->assertOk()->json('data'));
        $this->assertSame('Negocio B', $history->firstWhere('tipo', 'GANANCIA')['negocio_nombre']);
        $this->assertSame('Negocio A', $history->firstWhere('tipo', 'CANJE')['negocio_nombre']);
    }

    private function createClient(string $correo): User
    {
        return User::query()->create([
            'nombre' => 'Cliente '.strtoupper(substr($correo, 0, 3)),
            'correo' => $correo,
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    private function createReward(int $businessId, int $requiredPoints, int $stock): Reward
    {
        return Reward::query()->create([
            'negocio_id' => $businessId,
            'nombre' => 'Reward '.$requiredPoints,
            'descripcion' => 'Recompensa de prueba',
            'puntos_requeridos' => $requiredPoints,
            'cantidad_disponible' => $stock,
            'estado' => true,
        ]);
    }

    private function grantPoints(User $user, int $points, int $businessId): void
    {
        PointMovement::query()->create([
            'usuario_id' => $user->id,
            'negocio_id' => $businessId,
            'qr_id' => null,
            'cantidad' => $points,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);
    }
}

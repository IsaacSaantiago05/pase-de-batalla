<?php

namespace Tests\Feature\Points;

use App\Models\BattlePassTier;
use App\Models\Business;
use App\Models\Level;
use App\Models\Product;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * El nivel y el pase de batalla dependen de los puntos ganados (GANANCIA),
 * no del saldo: canjear no baja de nivel y un ajuste manual no sube.
 */
class LevelProgressionTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Business $business;
    private User $businessAdmin;
    private User $client;
    private Level $levelOne;
    private Level $levelTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        $this->levelOne = Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 99, 'estado' => true]);
        $this->levelTwo = Level::query()->create(['nombre' => 'Nivel 2', 'puntos_minimos' => 100, 'puntos_maximos' => 999, 'estado' => true]);
        $this->business = Business::query()->create(['nombre' => 'Negocio', 'estado' => true, 'fecha_registro' => now()]);

        $this->businessAdmin = $this->makeUser($adminNegocioRole, 'admin@example.com', $this->business->id);
        $this->makeUser($adminGeneralRole, 'general@example.com');
        $this->client = $this->makeUser($this->clienteRole, 'cliente@example.com');
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

    private function earnBySale(int $points): void
    {
        $product = Product::query()->create([
            'negocio_id' => $this->business->id,
            'nombre' => 'Producto '.uniqid(),
            'precio' => 10,
            'puntos' => $points,
            'estado' => true,
        ]);

        Sanctum::actingAs($this->businessAdmin);
        $token = $this->postJson('/api/sales', ['items' => [['producto_id' => $product->id, 'cantidad' => 1]]])
            ->assertCreated()
            ->json('data.qr.token');

        Sanctum::actingAs($this->client);
        $this->postJson('/api/qr/redeem', ['token' => $token])->assertCreated();
    }

    public function test_redeeming_a_reward_does_not_lower_the_level(): void
    {
        $this->earnBySale(120);
        $this->assertSame($this->levelTwo->id, $this->client->fresh()->nivel_id);

        $reward = Reward::query()->create([
            'negocio_id' => $this->business->id,
            'nombre' => 'Pastel gratis',
            'puntos_requeridos' => 100,
            'cantidad_disponible' => 5,
            'estado' => true,
        ]);

        Sanctum::actingAs($this->client);
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertCreated();

        $this->getJson('/api/points/balance')->assertOk()->assertJsonPath('data.saldo_global', 20);
        $this->assertSame($this->levelTwo->id, $this->client->fresh()->nivel_id);
    }

    public function test_manual_adjustment_changes_balance_but_not_level(): void
    {
        $this->earnBySale(10);
        Sanctum::actingAs(User::query()->where('correo', 'general@example.com')->firstOrFail());

        $this->postJson('/api/points/adjustments', [
            'correo' => 'cliente@example.com',
            'cantidad' => 500,
            'motivo' => 'Compensacion por falla',
        ])->assertCreated()->assertJsonPath('data.saldo_global', 510);

        $this->assertSame($this->levelOne->id, $this->client->fresh()->nivel_id);
    }

    public function test_battle_pass_progress_uses_earned_points_not_balance(): void
    {
        BattlePassTier::query()->create(['nombre' => 'Rango 1', 'puntos_requeridos' => 100, 'recompensa_nombre' => 'Sticker', 'estado' => true]);
        $this->earnBySale(120);

        $reward = Reward::query()->create([
            'negocio_id' => $this->business->id,
            'nombre' => 'Cafe gratis',
            'puntos_requeridos' => 100,
            'cantidad_disponible' => 5,
            'estado' => true,
        ]);

        Sanctum::actingAs($this->client);
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertCreated();

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.puntos_actuales', 120)
            ->assertJsonPath('data.tiers_desbloqueados', 1);
    }
}

<?php

namespace Tests\Feature\Rewards;

use App\Models\Business;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RewardDetailTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Business $businessA;
    private Business $businessB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
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

    private function makeReward(Business $business, bool $active = true): Reward
    {
        return Reward::query()->create([
            'negocio_id' => $business->id,
            'nombre' => 'Cafe gratis',
            'descripcion' => 'Un cafe americano',
            'puntos_requeridos' => 50,
            'cantidad_disponible' => 3,
            'estado' => $active,
        ]);
    }

    public function test_client_sees_active_reward_with_business_name(): void
    {
        $reward = $this->makeReward($this->businessA);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $this->getJson("/api/rewards/{$reward->id}")
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Cafe gratis')
            ->assertJsonPath('data.negocio_nombre', 'Negocio A')
            ->assertJsonPath('data.puntos_requeridos', 50);
    }

    public function test_client_cannot_see_inactive_reward_or_from_inactive_business(): void
    {
        $inactive = $this->makeReward($this->businessA, false);
        $closedBusiness = Business::query()->create(['nombre' => 'Cerrado', 'estado' => false, 'fecha_registro' => now()]);
        $fromClosed = $this->makeReward($closedBusiness);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $this->getJson("/api/rewards/{$inactive->id}")->assertStatus(404);
        $this->getJson("/api/rewards/{$fromClosed->id}")->assertStatus(404);
        $this->getJson('/api/rewards/999')->assertStatus(404);
    }

    public function test_business_admin_only_sees_own_rewards(): void
    {
        $own = $this->makeReward($this->businessA, false);
        $foreign = $this->makeReward($this->businessB);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->getJson("/api/rewards/{$own->id}")->assertOk();
        $this->getJson("/api/rewards/{$foreign->id}")->assertStatus(404);
    }
}

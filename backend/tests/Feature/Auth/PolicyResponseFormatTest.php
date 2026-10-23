<?php

namespace Tests\Feature\Auth;

use App\Models\Business;
use App\Models\Product;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PolicyResponseFormatTest extends TestCase
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
        Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
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

    public function test_policy_denial_uses_api_envelope_with_specific_message(): void
    {
        $product = Product::query()->create(['negocio_id' => $this->businessB->id, 'nombre' => 'Cafe', 'precio' => 10, 'puntos' => 1, 'estado' => true]);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->patchJson("/api/products/{$product->id}/status", ['estado' => false])
            ->assertStatus(403)
            ->assertExactJson([
                'success' => false,
                'message' => 'No puedes modificar productos de otro negocio.',
                'data' => null,
            ]);

        $this->getJson("/api/businesses/{$this->businessB->id}")
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'No tienes permiso para acceder a este negocio.');
    }

    public function test_missing_model_returns_generic_404_without_class_names(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $response = $this->putJson('/api/products/999', ['nombre' => 'X'])->assertStatus(404);

        $response->assertExactJson(['success' => false, 'message' => 'Recurso no encontrado.', 'data' => null]);
        $this->assertStringNotContainsString('App\\Models', $response->getContent());
    }

    public function test_hidden_reward_is_reported_as_not_found(): void
    {
        $reward = Reward::query()->create([
            'negocio_id' => $this->businessA->id,
            'nombre' => 'Oculta',
            'puntos_requeridos' => 10,
            'cantidad_disponible' => 1,
            'estado' => false,
        ]);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $this->getJson("/api/rewards/{$reward->id}")
            ->assertStatus(404)
            ->assertJsonPath('message', 'La recompensa no existe o no está disponible.');
    }
}

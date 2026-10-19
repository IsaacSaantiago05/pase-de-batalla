<?php

namespace Tests\Feature\Catalog;

use App\Models\Business;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductFlowTest extends TestCase
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

    private function makeProduct(Business $business, string $name = 'Cafe', bool $active = true): Product
    {
        return Product::query()->create([
            'negocio_id' => $business->id,
            'nombre' => $name,
            'precio' => 35.50,
            'puntos' => 10,
            'estado' => $active,
        ]);
    }

    public function test_business_admin_creates_product_in_own_business(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $response = $this->postJson('/api/products', [
            'negocio_id' => $this->businessB->id,
            'nombre' => 'Cafe americano',
            'precio' => 35.5,
            'puntos' => 10,
        ]);

        $response->assertCreated()->assertJsonPath('data.negocio_id', $this->businessA->id);
        $this->assertDatabaseHas('productos', ['nombre' => 'Cafe americano', 'negocio_id' => $this->businessA->id]);
    }

    public function test_product_requires_valid_price_and_points(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->postJson('/api/products', ['nombre' => 'X', 'precio' => -1, 'puntos' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['precio', 'puntos']);
    }

    public function test_business_admin_cannot_edit_product_of_other_business(): void
    {
        $product = $this->makeProduct($this->businessB);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->putJson("/api/products/{$product->id}", ['nombre' => 'Hack'])->assertStatus(403);
        $this->patchJson("/api/products/{$product->id}/status", ['estado' => false])->assertStatus(403);
        $this->assertSame('Cafe', $product->fresh()->nombre);
    }

    public function test_business_admin_only_lists_own_products(): void
    {
        $this->makeProduct($this->businessA, 'Propio');
        $this->makeProduct($this->businessB, 'Ajeno');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $response = $this->getJson('/api/products')->assertOk();

        $this->assertCount(1, $response->json('data.data') ?? $response->json('data'));
    }

    public function test_general_admin_can_deactivate_but_not_create_or_edit(): void
    {
        $product = $this->makeProduct($this->businessA);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $this->postJson('/api/products', ['nombre' => 'X', 'precio' => 1, 'puntos' => 1])->assertStatus(403);
        $this->putJson("/api/products/{$product->id}", ['nombre' => 'X'])->assertStatus(403);
        $this->patchJson("/api/products/{$product->id}/status", ['estado' => false])->assertOk();
        $this->assertFalse($product->fresh()->estado);
    }

    public function test_client_sees_only_active_products_and_cannot_manage(): void
    {
        $this->makeProduct($this->businessA, 'Activo');
        $inactive = $this->makeProduct($this->businessA, 'Inactivo', false);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $response = $this->getJson('/api/products')->assertOk();
        $names = collect($response->json('data.data') ?? $response->json('data'))->pluck('nombre')->all();

        $this->assertSame(['Activo'], $names);
        $this->postJson('/api/products', ['nombre' => 'X', 'precio' => 1, 'puntos' => 1])->assertStatus(403);
        $this->patchJson("/api/products/{$inactive->id}/status", ['estado' => true])->assertStatus(403);
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/products')->assertStatus(401);
    }
}

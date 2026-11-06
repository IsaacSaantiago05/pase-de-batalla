<?php

namespace Tests\Feature\Sales;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointMovement;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SaleFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;
    private Business $businessB;
    private User $adminA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 999, 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
        $this->adminA = $this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id);
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

    private function makeProduct(Business $business, string $name, float $price, int $points, bool $active = true): Product
    {
        return Product::query()->create([
            'negocio_id' => $business->id,
            'nombre' => $name,
            'precio' => $price,
            'puntos' => $points,
            'estado' => $active,
        ]);
    }

    public function test_business_admin_registers_sale_and_gets_qr_with_product_points(): void
    {
        $cupcake = $this->makeProduct($this->businessA, 'Cupcake', 35, 10);
        $cake = $this->makeProduct($this->businessA, 'Pastel', 65.5, 25);
        Sanctum::actingAs($this->adminA);

        $response = $this->postJson('/api/sales', [
            'items' => [
                ['producto_id' => $cupcake->id, 'cantidad' => 2],
                ['producto_id' => $cake->id, 'cantidad' => 1],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.total', '135.50')
            ->assertJsonPath('data.puntos_total', 45)
            ->assertJsonPath('data.qr.puntos', 45)
            ->assertJsonPath('data.qr.estado', 'ACTIVO')
            ->assertJsonCount(2, 'data.items');

        $this->assertDatabaseHas('venta_items', ['nombre' => 'Cupcake', 'cantidad' => 2, 'puntos_subtotal' => 20]);
    }

    public function test_sale_keeps_product_snapshot_after_catalog_changes(): void
    {
        $cupcake = $this->makeProduct($this->businessA, 'Cupcake', 35, 10);
        Sanctum::actingAs($this->adminA);

        $saleId = $this->postJson('/api/sales', ['items' => [['producto_id' => $cupcake->id, 'cantidad' => 1]]])
            ->assertCreated()
            ->json('data.id');

        $cupcake->update(['nombre' => 'Cupcake nuevo', 'precio' => 99, 'puntos' => 50]);

        $this->assertDatabaseHas('venta_items', [
            'venta_id' => $saleId,
            'nombre' => 'Cupcake',
            'puntos_unitarios' => 10,
        ]);
    }

    public function test_sale_rejects_products_from_other_business_or_inactive(): void
    {
        $foreign = $this->makeProduct($this->businessB, 'Ajeno', 10, 5);
        $inactive = $this->makeProduct($this->businessA, 'Inactivo', 10, 5, false);
        Sanctum::actingAs($this->adminA);

        $this->postJson('/api/sales', ['items' => [['producto_id' => $foreign->id, 'cantidad' => 1]]])->assertStatus(422);
        $this->postJson('/api/sales', ['items' => [['producto_id' => $inactive->id, 'cantidad' => 1]]])->assertStatus(422);
        $this->assertDatabaseCount('ventas', 0);
        $this->assertDatabaseCount('codigos_qr', 0);
    }

    public function test_sale_validates_items(): void
    {
        Sanctum::actingAs($this->adminA);

        $this->postJson('/api/sales', ['items' => []])->assertStatus(422);
        $this->postJson('/api/sales', ['items' => [['producto_id' => 999, 'cantidad' => 0]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.producto_id', 'items.0.cantidad']);
    }

    public function test_client_redeems_sale_qr_and_movement_is_audited(): void
    {
        $cupcake = $this->makeProduct($this->businessA, 'Cupcake', 35, 10);
        Sanctum::actingAs($this->adminA);
        $sale = $this->postJson('/api/sales', ['items' => [['producto_id' => $cupcake->id, 'cantidad' => 3]]])->json('data');

        $client = $this->makeUser($this->clienteRole, 'c@example.com');
        Sanctum::actingAs($client);

        $this->postJson('/api/qr/redeem', ['token' => $sale['qr']['token']])->assertCreated();
        $this->postJson('/api/qr/redeem', ['token' => $sale['qr']['token']])->assertStatus(422);

        $movement = PointMovement::query()->where('usuario_id', $client->id)->sole();
        $this->assertSame(30, (int) $movement->cantidad);
        $this->assertSame($sale['id'], (int) $movement->venta_id);
        $this->assertSame($this->adminA->id, (int) $movement->otorgado_por);
        $this->assertSame($this->businessA->id, (int) $movement->negocio_id);
    }

    public function test_business_admin_lists_only_own_sales(): void
    {
        $own = $this->makeProduct($this->businessA, 'Propio', 10, 1);
        $foreign = $this->makeProduct($this->businessB, 'Ajeno', 10, 1);
        $adminB = $this->makeUser($this->adminNegocioRole, 'b@example.com', $this->businessB->id);

        Sanctum::actingAs($this->adminA);
        $this->postJson('/api/sales', ['items' => [['producto_id' => $own->id, 'cantidad' => 1]]])->assertCreated();
        Sanctum::actingAs($adminB);
        $this->postJson('/api/sales', ['items' => [['producto_id' => $foreign->id, 'cantidad' => 1]]])->assertCreated();

        Sanctum::actingAs($this->adminA);
        $sales = $this->getJson('/api/sales')->assertOk()->json('data');

        $this->assertCount(1, $sales);
        $this->assertSame($this->businessA->id, $sales[0]['negocio_id']);
    }

    public function test_only_business_admin_can_register_sales(): void
    {
        $product = $this->makeProduct($this->businessA, 'Cupcake', 35, 10);
        $payload = ['items' => [['producto_id' => $product->id, 'cantidad' => 1]]];

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));
        $this->postJson('/api/sales', $payload)->assertStatus(403);

        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));
        $this->postJson('/api/sales', $payload)->assertStatus(403);
        $this->getJson('/api/sales')->assertOk();
    }
}

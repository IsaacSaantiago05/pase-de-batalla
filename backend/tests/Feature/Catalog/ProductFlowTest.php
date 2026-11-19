<?php

namespace Tests\Feature\Catalog;

use App\Models\Business;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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
            'puntos' => 10,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.puntos', 10)
            ->assertJsonMissingPath('data.precio');
        $this->assertDatabaseHas('productos', ['nombre' => 'Cafe americano', 'negocio_id' => $this->businessA->id]);
    }

    public function test_product_requires_valid_points(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->postJson('/api/products', ['nombre' => 'X', 'puntos' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['puntos']);
    }

    public function test_business_admin_changes_status_of_own_products_but_cannot_edit_them(): void
    {
        $own = $this->makeProduct($this->businessA);
        $foreign = $this->makeProduct($this->businessB, 'Ajeno');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        // Nombre y puntos solo los corrige el administrador general.
        $this->putJson("/api/products/{$own->id}", ['nombre' => 'Cambiado', 'puntos' => 999])->assertStatus(403);

        // El estado de sus propios productos si lo puede cambiar.
        $this->patchJson("/api/products/{$own->id}/status", ['estado' => false])
            ->assertOk()
            ->assertJsonPath('data.estado', false);
        $this->patchJson("/api/products/{$own->id}/status", ['estado' => true])
            ->assertOk()
            ->assertJsonPath('data.estado', true);

        // Los de otro negocio, nada.
        $this->putJson("/api/products/{$foreign->id}", ['nombre' => 'Hack'])->assertStatus(403);
        $this->patchJson("/api/products/{$foreign->id}/status", ['estado' => false])->assertStatus(403);

        $this->assertSame('Cafe', $own->fresh()->nombre);
        $this->assertSame(10, $own->fresh()->puntos);
        $this->assertSame('Ajeno', $foreign->fresh()->nombre);
        $this->assertTrue($foreign->fresh()->estado);
    }

    public function test_deactivating_a_product_starts_the_deletion_countdown_and_reactivating_cancels_it(): void
    {
        $this->travelTo(Carbon::parse('2026-11-19 12:00:00'));
        $product = $this->makeProduct($this->businessA);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $response = $this->patchJson("/api/products/{$product->id}/status", ['estado' => false])->assertOk();
        $this->assertTrue(Carbon::parse($response->json('data.desactivado_en'))->equalTo('2026-11-19 12:00:00'));
        $this->assertTrue(Carbon::parse($response->json('data.se_elimina_en'))->equalTo('2026-11-26 12:00:00'));

        // Tres dias despues sigue en el listado y todavia se puede reactivar.
        $this->travel(3)->days();
        $listed = collect($this->getJson('/api/products')->assertOk()->json('data'))->firstWhere('id', $product->id);
        $this->assertFalse($listed['estado']);
        $this->assertTrue(Carbon::parse($listed['se_elimina_en'])->equalTo('2026-11-26 12:00:00'));

        $this->patchJson("/api/products/{$product->id}/status", ['estado' => true])
            ->assertOk()
            ->assertJsonPath('data.desactivado_en', null)
            ->assertJsonPath('data.se_elimina_en', null);

        // Al volver a desactivarlo el plazo empieza de nuevo.
        $again = $this->patchJson("/api/products/{$product->id}/status", ['estado' => false])->assertOk();
        $this->assertTrue(Carbon::parse($again->json('data.se_elimina_en'))->equalTo('2026-11-29 12:00:00'));
    }

    public function test_product_inactive_for_seven_days_is_removed_and_sales_history_is_kept(): void
    {
        $this->travelTo(Carbon::parse('2026-11-19 12:00:00'));
        $old = $this->makeProduct($this->businessA, 'Viejo');
        $recent = $this->makeProduct($this->businessA, 'Reciente');
        $this->makeProduct($this->businessA, 'Activo');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        // Se vendio antes de desactivarlo: el historial debe sobrevivir.
        $this->postJson('/api/sales', ['items' => [['producto_id' => $old->id, 'cantidad' => 2]]])->assertCreated();

        $this->patchJson("/api/products/{$old->id}/status", ['estado' => false])->assertOk();
        $this->travel(3)->days();
        $this->patchJson("/api/products/{$recent->id}/status", ['estado' => false])->assertOk();
        $this->travel(4)->days();

        // "Viejo" lleva 7 dias inactivo; "Reciente" apenas 4.
        $names = collect($this->getJson('/api/products')->assertOk()->json('data'))->pluck('nombre')->sort()->values()->all();
        $this->assertSame(['Activo', 'Reciente'], $names);

        // Aunque la limpieza no haya corrido, ya no se puede reactivar.
        $this->patchJson("/api/products/{$old->id}/status", ['estado' => true])->assertNotFound();

        $this->artisan('model:prune', ['--model' => [Product::class]])->assertSuccessful();

        $this->assertDatabaseMissing('productos', ['id' => $old->id]);
        $this->assertDatabaseHas('productos', ['id' => $recent->id]);
        $this->assertDatabaseCount('productos', 2);
        $this->assertDatabaseHas('venta_items', ['nombre' => 'Viejo', 'cantidad' => 2, 'puntos_subtotal' => 20, 'producto_id' => null]);
    }

    public function test_business_admin_only_lists_own_products(): void
    {
        $this->makeProduct($this->businessA, 'Propio');
        $this->makeProduct($this->businessB, 'Ajeno');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $response = $this->getJson('/api/products')->assertOk();

        $this->assertCount(1, $response->json('data.data') ?? $response->json('data'));
    }

    public function test_general_admin_can_fix_name_points_and_status_but_not_create(): void
    {
        $product = $this->makeProduct($this->businessA);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $this->postJson('/api/products', ['nombre' => 'X', 'puntos' => 1])->assertStatus(403);

        $this->putJson("/api/products/{$product->id}", ['nombre' => 'Cafe corregido', 'puntos' => 25, 'estado' => false])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Cafe corregido')
            ->assertJsonPath('data.puntos', 25)
            ->assertJsonPath('data.estado', false)
            ->assertJsonPath('data.negocio_id', $this->businessA->id);

        $this->patchJson("/api/products/{$product->id}/status", ['estado' => true])
            ->assertOk()
            ->assertJsonPath('data.estado', true);

        // Solo cambia lo que se envia.
        $this->putJson("/api/products/{$product->id}", ['puntos' => 30])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Cafe corregido')
            ->assertJsonPath('data.puntos', 30);
    }

    public function test_product_correction_is_validated(): void
    {
        $product = $this->makeProduct($this->businessA);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $this->putJson("/api/products/{$product->id}", ['nombre' => '', 'puntos' => 0])
            ->assertStatus(422)
            ->assertJsonPath('errors.nombre.0', 'El nombre del producto es obligatorio.')
            ->assertJsonPath('errors.puntos.0', 'El producto debe otorgar al menos 1 punto.');

        $this->assertSame('Cafe', $product->fresh()->nombre);
        $this->assertSame(10, $product->fresh()->puntos);
    }

    public function test_products_can_be_listed_only_active_and_include_business_name(): void
    {
        $this->makeProduct($this->businessA, 'Activo');
        $this->makeProduct($this->businessA, 'Inactivo', false);
        $this->makeProduct($this->businessB, 'Ajeno');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $all = $this->getJson('/api/products')->assertOk()->json('data');
        $this->assertCount(2, $all);
        $this->assertSame('Negocio A', $all[0]['negocio_nombre']);

        $active = $this->getJson('/api/products?activos=1&per_page=100')->assertOk()->json('data');
        $this->assertSame(['Activo'], collect($active)->pluck('nombre')->all());
    }

    public function test_client_sees_only_active_products_and_cannot_manage(): void
    {
        $this->makeProduct($this->businessA, 'Activo');
        $inactive = $this->makeProduct($this->businessA, 'Inactivo', false);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $response = $this->getJson('/api/products')->assertOk();
        $names = collect($response->json('data.data') ?? $response->json('data'))->pluck('nombre')->all();

        $this->assertSame(['Activo'], $names);
        $this->postJson('/api/products', ['nombre' => 'X', 'puntos' => 1])->assertStatus(403);
        $this->patchJson("/api/products/{$inactive->id}/status", ['estado' => true])->assertStatus(403);
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/products')->assertStatus(401);
    }
}

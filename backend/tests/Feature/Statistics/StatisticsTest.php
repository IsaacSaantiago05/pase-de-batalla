<?php

namespace Tests\Feature\Statistics;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointMovement;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
    private User $adminB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 9999, 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
        $this->adminA = $this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id);
        $this->adminB = $this->makeUser($this->adminNegocioRole, 'b@example.com', $this->businessB->id);
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

    /** Registra una venta por la API y la canjea con un cliente nuevo. */
    private function sellAndRedeem(User $admin, Product $product, int $quantity, string $clientEmail): void
    {
        Sanctum::actingAs($admin);
        $token = $this->postJson('/api/sales', ['items' => [['producto_id' => $product->id, 'cantidad' => $quantity]]])
            ->assertCreated()
            ->json('data.qr.token');

        Sanctum::actingAs($this->makeUser($this->clienteRole, $clientEmail));
        $this->postJson('/api/qr/redeem', ['token' => $token])->assertCreated();
    }

    private function seedActivity(): void
    {
        $cafe = Product::query()->create(['negocio_id' => $this->businessA->id, 'nombre' => 'Cafe', 'precio' => 30, 'puntos' => 5, 'estado' => true]);
        $pan = Product::query()->create(['negocio_id' => $this->businessA->id, 'nombre' => 'Pan', 'precio' => 10, 'puntos' => 1, 'estado' => true]);
        $taco = Product::query()->create(['negocio_id' => $this->businessB->id, 'nombre' => 'Taco', 'precio' => 20, 'puntos' => 2, 'estado' => true]);

        $this->sellAndRedeem($this->adminA, $cafe, 2, 'c1@example.com');
        $this->sellAndRedeem($this->adminA, $pan, 5, 'c2@example.com');
        $this->sellAndRedeem($this->adminB, $taco, 1, 'c3@example.com');

        // Venta cuyo QR nunca se escanea.
        Sanctum::actingAs($this->adminA);
        $this->postJson('/api/sales', ['items' => [['producto_id' => $cafe->id, 'cantidad' => 1]]])->assertCreated();
    }

    public function test_business_admin_sees_only_own_business_totals(): void
    {
        $this->seedActivity();
        Sanctum::actingAs($this->adminA);

        $response = $this->getJson("/api/statistics?negocio_id={$this->businessB->id}")->assertOk();

        $response->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.resumen.ventas', 3)
            ->assertJsonPath('data.resumen.ingresos', 140)
            ->assertJsonPath('data.resumen.puntos_otorgados', 15)
            ->assertJsonPath('data.resumen.clientes_activos', 2)
            ->assertJsonPath('data.resumen.qr.generados', 3)
            ->assertJsonPath('data.resumen.qr.utilizados', 2)
            ->assertJsonPath('data.resumen.qr.activos', 1)
            ->assertJsonPath('data.top_productos.0.nombre', 'Pan')
            ->assertJsonPath('data.top_productos.0.unidades', 5)
            ->assertJsonMissingPath('data.por_negocio');
    }

    public function test_daily_series_covers_every_day_of_period(): void
    {
        $this->seedActivity();
        Sanctum::actingAs($this->adminA);

        $series = $this->getJson('/api/statistics?dias=7')->assertOk()->json('data.por_dia');

        $this->assertCount(7, $series);
        $this->assertSame(now()->toDateString(), $series[6]['dia']);
        $this->assertSame(3, $series[6]['ventas']);
        $this->assertSame(0, $series[0]['ventas']);
    }

    public function test_general_admin_sees_platform_totals_and_per_business(): void
    {
        $this->seedActivity();
        PointMovement::query()->create(['usuario_id' => $this->adminA->id, 'negocio_id' => null, 'cantidad' => 99, 'tipo' => 'AJUSTE', 'fecha' => now()]);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $response = $this->getJson('/api/statistics')->assertOk();

        $response->assertJsonPath('data.negocio_id', null)
            ->assertJsonPath('data.resumen.ventas', 4)
            ->assertJsonPath('data.resumen.puntos_otorgados', 17)
            ->assertJsonPath('data.resumen.clientes_registrados', 3)
            ->assertJsonCount(2, 'data.por_negocio');

        $this->getJson("/api/statistics?negocio_id={$this->businessB->id}")
            ->assertOk()
            ->assertJsonPath('data.resumen.ventas', 1)
            ->assertJsonMissingPath('data.por_negocio');
    }

    public function test_active_qr_past_expiration_counts_as_expired(): void
    {
        $this->seedActivity();
        $this->travel(5)->minutes();
        Sanctum::actingAs($this->adminA);

        $this->getJson('/api/statistics')
            ->assertOk()
            ->assertJsonPath('data.resumen.qr.activos', 0)
            ->assertJsonPath('data.resumen.qr.expirados', 1);
    }

    public function test_statistics_validation_and_access(): void
    {
        Sanctum::actingAs($this->adminA);
        $this->getJson('/api/statistics?dias=3')->assertStatus(422);
        $this->getJson('/api/statistics?dias=500')->assertStatus(422);

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));
        $this->getJson('/api/statistics')->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Clients;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointMovement;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientAndManagementTest extends TestCase
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
        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 99, 'estado' => true]);
        Level::query()->create(['nombre' => 'Nivel 2', 'puntos_minimos' => 100, 'puntos_maximos' => 999, 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'correo' => 'privado@a.com', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null): User
    {
        return User::query()->create([
            'nombre' => 'Usuario '.$email,
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    private function earn(User $client, Business $business, int $points): void
    {
        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $business->id,
            'cantidad' => $points,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);
    }

    public function test_client_sees_only_active_businesses_with_public_data(): void
    {
        Business::query()->create(['nombre' => 'Cerrado', 'estado' => false, 'fecha_registro' => now()]);
        Product::query()->create(['negocio_id' => $this->businessA->id, 'nombre' => 'Cafe', 'precio' => 10, 'puntos' => 1, 'estado' => true]);
        Product::query()->create(['negocio_id' => $this->businessA->id, 'nombre' => 'Viejo', 'precio' => 10, 'puntos' => 1, 'estado' => false]);
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));

        $data = $this->getJson('/api/directory/businesses')->assertOk()->json('data');

        $this->assertSame(['Negocio A', 'Negocio B'], array_column($data, 'nombre'));
        $this->assertSame(1, $data[0]['productos_activos']);
        $this->assertArrayNotHasKey('correo', $data[0]);
    }

    public function test_user_updates_profile_name_and_email(): void
    {
        $client = $this->makeUser($this->clienteRole, 'c@example.com');
        $this->makeUser($this->clienteRole, 'ocupado@example.com');
        Sanctum::actingAs($client);

        $this->putJson('/api/profile', ['correo' => 'ocupado@example.com'])->assertStatus(422);
        $this->putJson('/api/profile', ['nombre' => 'Nuevo', 'correo' => 'nuevo@example.com'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Nuevo')
            ->assertJsonPath('data.correo', 'nuevo@example.com');
    }

    public function test_password_change_requires_current_password(): void
    {
        $client = $this->makeUser($this->clienteRole, 'c@example.com');
        Sanctum::actingAs($client);

        $this->putJson('/api/profile', ['password' => 'NuevaClave123', 'password_confirmation' => 'NuevaClave123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password_actual']);

        $this->putJson('/api/profile', [
            'password' => 'NuevaClave123',
            'password_confirmation' => 'NuevaClave123',
            'password_actual' => 'incorrecta',
        ])->assertStatus(422);

        $this->putJson('/api/profile', [
            'password' => 'NuevaClave123',
            'password_confirmation' => 'NuevaClave123',
            'password_actual' => 'Password123',
        ])->assertOk();

        $this->assertTrue(Hash::check('NuevaClave123', $client->fresh()->password));
    }

    public function test_profile_cannot_change_role_or_level(): void
    {
        $client = $this->makeUser($this->clienteRole, 'c@example.com');
        Sanctum::actingAs($client);

        $this->putJson('/api/profile', ['rol_id' => $this->adminGeneralRole->id, 'nivel_id' => 2, 'negocio_id' => $this->businessA->id])->assertOk();

        $fresh = $client->fresh();
        $this->assertSame($this->clienteRole->id, $fresh->rol_id);
        $this->assertNull($fresh->nivel_id);
        $this->assertNull($fresh->negocio_id);
    }

    public function test_business_admin_lists_only_clients_with_activity_in_own_business(): void
    {
        $ana = $this->makeUser($this->clienteRole, 'ana@example.com');
        $luis = $this->makeUser($this->clienteRole, 'luis@example.com');
        $this->earn($ana, $this->businessA, 10);
        $this->earn($ana, $this->businessA, 15);
        $this->earn($luis, $this->businessB, 50);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $data = $this->getJson('/api/business-clients')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('ana@example.com', $data[0]['correo']);
        $this->assertSame(25, $data[0]['puntos_ganados']);
        $this->assertSame(2, $data[0]['visitas']);
    }

    public function test_general_admin_must_choose_business_and_client_cannot_list(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));
        $this->getJson('/api/business-clients')->assertStatus(422);
        $this->getJson("/api/business-clients?negocio_id={$this->businessA->id}")->assertOk();

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));
        $this->getJson('/api/business-clients')->assertStatus(403);
    }

    public function test_general_admin_adjusts_points_with_reason_and_audit(): void
    {
        $client = $this->makeUser($this->clienteRole, 'c@example.com');
        $admin = $this->makeUser($this->adminGeneralRole, 'g@example.com');
        Sanctum::actingAs($admin);

        $this->postJson('/api/points/adjustments', ['correo' => 'c@example.com', 'cantidad' => 120, 'motivo' => 'Compensacion por falla'])
            ->assertCreated()
            ->assertJsonPath('data.saldo_global', 120)
            ->assertJsonPath('data.movimiento.motivo', 'Compensacion por falla')
            ->assertJsonPath('data.movimiento.otorgado_por', $admin->id);

        $this->assertNotNull($client->fresh()->nivel_id);
        $this->assertCount(1, $this->getJson('/api/points/adjustments')->assertOk()->json('data'));
    }

    public function test_adjustment_rules(): void
    {
        $this->makeUser($this->clienteRole, 'c@example.com');
        $this->makeUser($this->adminNegocioRole, 'otro.admin@example.com', $this->businessA->id);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $this->postJson('/api/points/adjustments', ['correo' => 'c@example.com', 'cantidad' => -5, 'motivo' => 'Correccion'])->assertStatus(422);
        $this->postJson('/api/points/adjustments', ['correo' => 'c@example.com', 'cantidad' => 10, 'motivo' => 'x'])->assertStatus(422);
        $this->postJson('/api/points/adjustments', ['correo' => 'c@example.com', 'cantidad' => 0, 'motivo' => 'Sin cambio'])->assertStatus(422);
        $this->postJson('/api/points/adjustments', ['correo' => 'otro.admin@example.com', 'cantidad' => 10, 'motivo' => 'No es cliente'])->assertStatus(422);
        $this->assertDatabaseCount('movimientos_puntos', 0);

        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));
        $this->postJson('/api/points/adjustments', ['correo' => 'c@example.com', 'cantidad' => 10, 'motivo' => 'Intento'])->assertStatus(403);
    }
}

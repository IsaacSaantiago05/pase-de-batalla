<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
    }

    public function test_general_admin_can_create_business(): void
    {
        Sanctum::actingAs($this->createUser('general@example.com', $this->adminGeneralRole));

        $response = $this->postJson('/api/businesses', [
            'nombre' => 'Cafe Central',
            'descripcion' => 'Cafeteria de especialidad',
            'direccion' => 'Av. Principal 123',
            'telefono' => '8340000000',
            'correo' => 'contacto@cafecentral.example.com',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombre', 'Cafe Central')
            ->assertJsonPath('data.estado', true);

        $business = Business::query()->where('nombre', 'Cafe Central')->firstOrFail();
        $this->assertNotNull($business->fecha_registro);
    }

    public function test_business_admin_cannot_create_business(): void
    {
        $business = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        Sanctum::actingAs($this->createUser('negocio@example.com', $this->adminNegocioRole, $business->id));

        $this->postJson('/api/businesses', ['nombre' => 'Negocio Nuevo'])->assertForbidden();

        $this->assertDatabaseMissing('negocios', ['nombre' => 'Negocio Nuevo']);
    }

    public function test_client_cannot_create_business(): void
    {
        Sanctum::actingAs($this->createUser('cliente@example.com', $this->clienteRole));

        $this->postJson('/api/businesses', ['nombre' => 'Negocio Cliente'])->assertForbidden();

        $this->assertDatabaseMissing('negocios', ['nombre' => 'Negocio Cliente']);
    }

    public function test_business_requires_a_unique_name(): void
    {
        Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        Sanctum::actingAs($this->createUser('general.unique@example.com', $this->adminGeneralRole));

        $this->postJson('/api/businesses', [])->assertUnprocessable()->assertJsonValidationErrors('nombre');
        $this->postJson('/api/businesses', ['nombre' => 'Sweet Art'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.nombre.0', 'Ya existe un negocio con ese nombre.');

        $this->assertSame(1, Business::query()->where('nombre', 'Sweet Art')->count());
    }

    public function test_business_can_keep_its_own_name_when_updated(): void
    {
        $business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        Business::query()->create(['nombre' => 'Otro Negocio', 'estado' => true, 'fecha_registro' => now()]);
        Sanctum::actingAs($this->createUser('general.update@example.com', $this->adminGeneralRole));

        $this->putJson('/api/businesses/'.$business->id, ['nombre' => 'Sweet Art', 'telefono' => '8341111111'])
            ->assertOk()
            ->assertJsonPath('data.telefono', '8341111111');

        $this->putJson('/api/businesses/'.$business->id, ['nombre' => 'Otro Negocio'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('nombre');
    }

    public function test_business_admin_lists_only_their_own_business(): void
    {
        Business::query()->create(['nombre' => 'Aaa Primero', 'estado' => true, 'fecha_registro' => now()]);
        $own = Business::query()->create(['nombre' => 'Negocio Propio', 'estado' => true, 'fecha_registro' => now()]);
        Sanctum::actingAs($this->createUser('negocio.list@example.com', $this->adminNegocioRole, $own->id));

        $ids = collect($this->getJson('/api/businesses')->assertOk()->json('data'))->pluck('id')->all();

        $this->assertSame([$own->id], $ids);
    }

    public function test_general_admin_lists_all_businesses(): void
    {
        Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        Business::query()->create(['nombre' => 'Negocio B', 'estado' => false, 'fecha_registro' => now()]);
        Sanctum::actingAs($this->createUser('general.list@example.com', $this->adminGeneralRole));

        $this->assertCount(2, $this->getJson('/api/businesses')->assertOk()->json('data'));
    }

    public function test_only_general_admin_can_change_business_status(): void
    {
        $business = Business::query()->create(['nombre' => 'Negocio Estado', 'estado' => true, 'fecha_registro' => now()]);
        $businessAdmin = $this->createUser('negocio.status@example.com', $this->adminNegocioRole, $business->id);

        Sanctum::actingAs($businessAdmin);
        $this->patchJson('/api/businesses/'.$business->id.'/status', ['estado' => false])->assertForbidden();
        $this->putJson('/api/businesses/'.$business->id, ['estado' => false])->assertForbidden();
        $this->assertTrue($business->fresh()->estado);

        // Puede seguir editando los datos de su propio negocio.
        $this->putJson('/api/businesses/'.$business->id, ['telefono' => '8342222222'])
            ->assertOk()
            ->assertJsonPath('data.telefono', '8342222222');

        Sanctum::actingAs($this->createUser('general.status@example.com', $this->adminGeneralRole));
        $this->patchJson('/api/businesses/'.$business->id.'/status', ['estado' => false])
            ->assertOk()
            ->assertJsonPath('data.estado', false);
    }

    private function createUser(string $email, Role $role, ?int $businessId = null): User
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
}

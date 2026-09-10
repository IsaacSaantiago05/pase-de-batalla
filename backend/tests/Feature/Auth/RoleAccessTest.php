<?php

namespace Tests\Feature\Auth;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAccessTest extends TestCase
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

    public function test_cliente_cannot_access_admin_users_endpoint(): void
    {
        $cliente = User::query()->create([
            'nombre' => 'Cliente',
            'correo' => 'cliente@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($cliente);

        $response = $this->getJson('/api/users');

        $response->assertStatus(403);
    }

    public function test_admin_negocio_cannot_access_other_business_resource(): void
    {
        $myBusiness = Business::query()->create([
            'nombre' => 'Mi negocio',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $otherBusiness = Business::query()->create([
            'nombre' => 'Otro negocio',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'admin.negocio@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $myBusiness->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->getJson('/api/businesses/'.$otherBusiness->id);

        $response->assertStatus(403);
    }

    public function test_admin_general_can_access_business_resource(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Business x',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'admin.general@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $response = $this->getJson('/api/businesses/'.$business->id);

        $response
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}

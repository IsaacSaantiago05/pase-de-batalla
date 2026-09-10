<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdministratorManagementTest extends TestCase
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

    public function test_admin_general_can_create_business_administrator(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Sweet Art',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'general@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $response = $this->postJson('/api/admin/administrators', [
            'nombre' => 'Admin Sweet',
            'correo' => 'admin.sweet@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'rol' => 'ADMINISTRADOR_NEGOCIO',
            'negocio_id' => $business->id,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.rol', 'ADMINISTRADOR_NEGOCIO')
            ->assertJsonPath('data.negocio_id', $business->id);
    }

    public function test_admin_general_cannot_create_business_admin_without_business(): void
    {
        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'general2@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $response = $this->postJson('/api/admin/administrators', [
            'nombre' => 'Admin Sin Negocio',
            'correo' => 'admin.nonbiz@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'rol' => 'ADMINISTRADOR_NEGOCIO',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_negocio_cannot_access_administrator_endpoints(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Cafe Aurora',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'negocio@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->getJson('/api/admin/administrators');

        $response->assertStatus(403);
    }

    public function test_admin_negocio_cannot_update_role_or_business_for_client(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Mi Negocio',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'adminbiz@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente One',
            'correo' => 'cliente.one@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->putJson('/api/users/'.$client->id, [
            'rol_id' => $this->adminGeneralRole->id,
        ]);

        $response->assertStatus(403);
    }
}

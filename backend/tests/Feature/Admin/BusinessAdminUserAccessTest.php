<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessAdminUserAccessTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Business $businessA;
    private Business $businessB;
    private User $adminA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);

        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);

        $this->adminA = User::query()->create([
            'nombre' => 'Admin A',
            'correo' => 'admin.users.a@example.com',
            'password' => 'Password123',
            'rol_id' => $adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    public function test_business_admin_lists_only_clients_with_movements_in_their_business(): void
    {
        $clientA = $this->createClientWithMovement('cliente.users.a@example.com', $this->businessA->id);
        $clientB = $this->createClientWithMovement('cliente.users.b@example.com', $this->businessB->id);

        Sanctum::actingAs($this->adminA);

        $response = $this->getJson('/api/users')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($clientA->id));
        $this->assertFalse($ids->contains($clientB->id));

        $this->getJson('/api/users/'.$clientA->id)->assertOk();
        $this->getJson('/api/users/'.$clientB->id)->assertStatus(403);
    }

    public function test_business_admin_cannot_change_client_password(): void
    {
        $client = $this->createClientWithMovement('cliente.users.pwd@example.com', $this->businessA->id);

        Sanctum::actingAs($this->adminA);

        $this->putJson('/api/users/'.$client->id, [
            'password' => 'NuevaPassword123',
            'password_confirmation' => 'NuevaPassword123',
        ])->assertStatus(403);

        $this->putJson('/api/users/'.$client->id, [
            'nombre' => 'Nombre Corregido',
        ])->assertOk()->assertJsonPath('data.nombre', 'Nombre Corregido');
    }

    private function createClientWithMovement(string $email, int $businessId): User
    {
        $client = User::query()->create([
            'nombre' => 'Cliente',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $businessId,
            'qr_id' => null,
            'cantidad' => 10,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);

        return $client;
    }
}

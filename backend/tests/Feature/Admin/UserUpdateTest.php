<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\Role;
use App\Models\User;
use App\Services\BattlePassService;
use Database\Seeders\BattlePassTierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserUpdateTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BattlePassTierSeeder::class);

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        $this->business = Business::query()->create(['nombre' => 'Negocio', 'estado' => true]);
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

    // El nivel se calcula con los puntos ganados: ningun administrador puede fijarlo a mano.
    public function test_admin_general_cannot_set_level_manually(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'general@example.com'));

        $response = $this->putJson("/api/users/{$client->id}", [
            'nombre' => 'Nuevo nombre',
            'nivel' => 150,
            'nivel_id' => 2,
        ]);

        $response->assertOk()->assertJsonMissingPath('data.nivel_id');
        $this->assertSame('Nuevo nombre', $client->fresh()->nombre);
        $this->assertSame(1, app(BattlePassService::class)->currentLevel($client->fresh()));
    }

    public function test_business_admin_cannot_set_level_manually(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com', $this->business->id);
        // Con 30 puntos ganados el cliente esta en el nivel 2 (pide 25).
        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $this->business->id,
            'qr_id' => null,
            'cantidad' => 30,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $response = $this->putJson("/api/users/{$client->id}", [
            'nivel' => 150,
            'nivel_id' => 2,
        ]);

        $response->assertOk();
        $this->assertSame(2, app(BattlePassService::class)->currentLevel($client->fresh()));
    }
}

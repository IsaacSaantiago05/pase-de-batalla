<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\Level;
use App\Models\Role;
use App\Models\User;
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
    private Level $levelOne;
    private Level $levelTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
        $this->business = Business::query()->create(['nombre' => 'Negocio', 'estado' => true]);
        $this->levelOne = Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 499, 'estado' => true]);
        $this->levelTwo = Level::query()->create(['nombre' => 'Nivel 2', 'puntos_minimos' => 500, 'puntos_maximos' => 999, 'estado' => true]);
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null, ?int $levelId = null): User
    {
        return User::query()->create([
            'nombre' => 'Usuario',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'nivel_id' => $levelId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    public function test_admin_general_cannot_set_level_manually(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com', null, $this->levelOne->id);
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'general@example.com'));

        $response = $this->putJson("/api/users/{$client->id}", [
            'nombre' => 'Nuevo nombre',
            'nivel_id' => $this->levelTwo->id,
        ]);

        $response->assertOk();
        $this->assertSame('Nuevo nombre', $client->fresh()->nombre);
        $this->assertSame($this->levelOne->id, $client->fresh()->nivel_id);
    }

    public function test_business_admin_cannot_set_level_manually(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com', $this->business->id, $this->levelOne->id);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $response = $this->putJson("/api/users/{$client->id}", [
            'nivel_id' => $this->levelTwo->id,
        ]);

        $response->assertOk();
        $this->assertSame($this->levelOne->id, $client->fresh()->nivel_id);
    }
}

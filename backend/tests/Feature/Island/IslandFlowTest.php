<?php

namespace Tests\Feature\Island;

use App\Models\IslandElement;
use App\Models\Level;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IslandFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminRole;
    private Level $levelOne;
    private Level $levelTwo;
    private IslandElement $elementLevelOne;
    private IslandElement $elementLevelTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);

        $this->levelOne = Level::query()->create([
            'nombre' => 'Nivel 1',
            'puntos_minimos' => 0,
            'puntos_maximos' => 99,
            'estado' => true,
        ]);

        $this->levelTwo = Level::query()->create([
            'nombre' => 'Nivel 2',
            'puntos_minimos' => 100,
            'puntos_maximos' => 199,
            'estado' => true,
        ]);

        $this->elementLevelOne = IslandElement::query()->create([
            'nombre' => 'Casa de Madera',
            'categoria' => 'ESTRUCTURA',
            'descripcion' => 'Elemento inicial',
            'recurso' => null,
            'nivel_requerido' => 1,
            'estado' => true,
        ]);

        $this->elementLevelTwo = IslandElement::query()->create([
            'nombre' => 'Mascota Lince',
            'categoria' => 'MASCOTA',
            'descripcion' => 'Elemento avanzado',
            'recurso' => null,
            'nivel_requerido' => 2,
            'estado' => true,
        ]);
    }

    public function test_client_can_view_catalog_with_available_and_locked_items(): void
    {
        $client = $this->createClient('island.catalog@example.com', $this->levelOne->id);
        Sanctum::actingAs($client);

        $response = $this->getJson('/api/island/catalog');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elementos.0.estado_usuario', 'DISPONIBLE')
            ->assertJsonPath('data.elementos.1.estado_usuario', 'BLOQUEADO');
    }

    public function test_client_can_unlock_available_item_and_place_it(): void
    {
        $client = $this->createClient('island.unlock@example.com', $this->levelTwo->id);
        Sanctum::actingAs($client);

        $unlockResponse = $this->postJson('/api/island/unlock', [
            'elemento_id' => $this->elementLevelTwo->id,
        ]);

        $unlockResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elemento_id', $this->elementLevelTwo->id);

        $placeResponse = $this->postJson('/api/island/layout', [
            'elemento_id' => $this->elementLevelTwo->id,
            'posicion_x' => 120,
            'posicion_y' => 240,
            'posicion_z' => 0,
        ]);

        $placeResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elemento_id', $this->elementLevelTwo->id)
            ->assertJsonPath('data.posicion_x', 120)
            ->assertJsonPath('data.posicion_y', 240);

        $layoutResponse = $this->getJson('/api/island/layout');
        $layoutResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.elemento_id', $this->elementLevelTwo->id);
    }

    public function test_client_cannot_unlock_item_without_required_level(): void
    {
        $client = $this->createClient('island.locked@example.com', $this->levelOne->id);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/island/unlock', [
            'elemento_id' => $this->elementLevelTwo->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_client_cannot_place_item_without_unlocking_first(): void
    {
        $client = $this->createClient('island.place.locked@example.com', $this->levelTwo->id);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/island/layout', [
            'elemento_id' => $this->elementLevelTwo->id,
            'posicion_x' => 10,
            'posicion_y' => 20,
        ]);

        $response->assertStatus(422);
    }

    public function test_non_client_cannot_access_island_endpoints(): void
    {
        $admin = User::query()->create([
            'nombre' => 'Admin Isla',
            'correo' => 'island.admin@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminRole->id,
            'nivel_id' => $this->levelTwo->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/island/catalog');
        $response->assertStatus(403);
    }

    private function createClient(string $email, int $levelId): User
    {
        return User::query()->create([
            'nombre' => 'Cliente Isla',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'nivel_id' => $levelId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }
}

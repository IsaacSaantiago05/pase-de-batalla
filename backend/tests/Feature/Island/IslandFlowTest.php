<?php

namespace Tests\Feature\Island;

use App\Models\IslandElement;
use App\Models\PointMovement;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BattlePassTierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IslandFlowTest extends TestCase
{
    use RefreshDatabase;

    // Puntos ganados con los que se alcanza el nivel 5 del pase (ver App\Support\LevelCurve).
    private const LEVEL_FIVE_POINTS = 103;

    private Role $clienteRole;
    private Role $adminRole;
    private IslandElement $elementLevelOne;
    private IslandElement $elementLevelFive;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BattlePassTierSeeder::class);

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);

        $this->elementLevelOne = IslandElement::query()->create([
            'nombre' => 'Casa de Madera',
            'categoria' => 'ESTRUCTURA',
            'descripcion' => 'Elemento inicial',
            'recurso' => null,
            'nivel_requerido' => 1,
            'estado' => true,
        ]);

        $this->elementLevelFive = IslandElement::query()->create([
            'nombre' => 'Mascota Lince',
            'categoria' => 'MASCOTA',
            'descripcion' => 'Elemento avanzado',
            'recurso' => null,
            'nivel_requerido' => 5,
            'estado' => true,
        ]);
    }

    public function test_client_can_view_catalog_with_available_and_locked_items(): void
    {
        // Recien registrado: nivel 1 sin haber ganado puntos.
        Sanctum::actingAs($this->createClient('island.catalog@example.com'));

        $response = $this->getJson('/api/island/catalog');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elementos.0.estado_usuario', 'DISPONIBLE')
            ->assertJsonPath('data.elementos.1.nivel_requerido', 5)
            ->assertJsonPath('data.elementos.1.estado_usuario', 'BLOQUEADO');
    }

    public function test_client_can_unlock_available_item_and_place_it(): void
    {
        $client = $this->createClient('island.unlock@example.com', self::LEVEL_FIVE_POINTS);
        Sanctum::actingAs($client);

        $unlockResponse = $this->postJson('/api/island/unlock', [
            'elemento_id' => $this->elementLevelFive->id,
        ]);

        $unlockResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elemento_id', $this->elementLevelFive->id);

        $placeResponse = $this->postJson('/api/island/layout', [
            'elemento_id' => $this->elementLevelFive->id,
            'posicion_x' => 120,
            'posicion_y' => 240,
            'posicion_z' => 0,
        ]);

        $placeResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.elemento_id', $this->elementLevelFive->id)
            ->assertJsonPath('data.posicion_x', 120)
            ->assertJsonPath('data.posicion_y', 240);

        $layoutResponse = $this->getJson('/api/island/layout');
        $layoutResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.elemento_id', $this->elementLevelFive->id);
    }

    public function test_client_cannot_unlock_item_without_required_level(): void
    {
        // Un punto menos de lo que pide el nivel 5: sigue en el nivel 4.
        $client = $this->createClient('island.locked@example.com', self::LEVEL_FIVE_POINTS - 1);
        Sanctum::actingAs($client);

        $this->postJson('/api/island/unlock', ['elemento_id' => $this->elementLevelFive->id])
            ->assertStatus(422);

        // Lo del nivel 1 esta disponible desde el registro.
        $this->postJson('/api/island/unlock', ['elemento_id' => $this->elementLevelOne->id])
            ->assertSuccessful();
    }

    public function test_client_cannot_place_item_without_unlocking_first(): void
    {
        $client = $this->createClient('island.place.locked@example.com', self::LEVEL_FIVE_POINTS);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/island/layout', [
            'elemento_id' => $this->elementLevelFive->id,
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
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/island/catalog');
        $response->assertStatus(403);
    }

    public function test_island_level_comes_from_earned_points_not_from_balance(): void
    {
        // Llego al nivel 5 y luego gasto casi todo: el nivel no baja.
        $spender = $this->createClient('island.spender@example.com', self::LEVEL_FIVE_POINTS);
        $this->addMovement($spender, -100, 'CANJE');

        Sanctum::actingAs($spender);
        $this->postJson('/api/island/unlock', ['elemento_id' => $this->elementLevelFive->id])
            ->assertSuccessful();

        // Los bonos del pase suben el saldo, pero no el nivel.
        $bonusOnly = $this->createClient('island.bonus@example.com', 50);
        $this->addMovement($bonusOnly, 500, 'BONO_NIVEL');

        Sanctum::actingAs($bonusOnly);
        $this->postJson('/api/island/unlock', ['elemento_id' => $this->elementLevelFive->id])
            ->assertStatus(422);
    }

    private function createClient(string $email, int $earnedPoints = 0): User
    {
        $client = User::query()->create([
            'nombre' => 'Cliente Isla',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        if ($earnedPoints > 0) {
            $this->addMovement($client, $earnedPoints, 'GANANCIA');
        }

        return $client;
    }

    private function addMovement(User $user, int $points, string $type): void
    {
        PointMovement::query()->create([
            'usuario_id' => $user->id,
            'negocio_id' => null,
            'qr_id' => null,
            'cantidad' => $points,
            'tipo' => $type,
            'fecha' => now(),
        ]);
    }
}

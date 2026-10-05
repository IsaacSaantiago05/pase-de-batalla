<?php

namespace Tests\Feature\BattlePass;

use App\Models\BattlePassTier;
use App\Models\PointMovement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BattlePassFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);

        BattlePassTier::query()->create([
            'nombre' => 'Tier 50',
            'descripcion' => 'Tier de entrada',
            'puntos_requeridos' => 50,
            'recompensa_nombre' => 'Insignia 50',
            'recompensa_descripcion' => 'Recompensa de 50',
            'estado' => true,
        ]);

        BattlePassTier::query()->create([
            'nombre' => 'Tier 100',
            'descripcion' => 'Tier medio',
            'puntos_requeridos' => 100,
            'recompensa_nombre' => 'Insignia 100',
            'recompensa_descripcion' => 'Recompensa de 100',
            'estado' => true,
        ]);

        BattlePassTier::query()->create([
            'nombre' => 'Tier 200',
            'descripcion' => 'Tier alto',
            'puntos_requeridos' => 200,
            'recompensa_nombre' => 'Insignia 200',
            'recompensa_descripcion' => 'Recompensa de 200',
            'estado' => true,
        ]);
    }

    public function test_client_can_view_progress_with_unlocked_and_blocked_tiers(): void
    {
        $client = $this->createClient('battle.progress@example.com');
        $this->grantPoints($client, 120);

        Sanctum::actingAs($client);

        $response = $this->getJson('/api/battle-pass/progress');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.puntos_actuales', 120)
            ->assertJsonPath('data.tiers_totales', 3)
            ->assertJsonPath('data.tiers_desbloqueados', 2)
            ->assertJsonPath('data.siguiente_hito_puntos', 200)
            ->assertJsonPath('data.tiers.0.estado_usuario', 'DESBLOQUEADO')
            ->assertJsonPath('data.tiers.2.estado_usuario', 'BLOQUEADO');
    }

    public function test_client_can_claim_unlocked_tier_once(): void
    {
        $client = $this->createClient('battle.claim@example.com');
        $this->grantPoints($client, 120);
        $tier100 = BattlePassTier::query()->where('puntos_requeridos', 100)->firstOrFail();

        Sanctum::actingAs($client);

        $claimResponse = $this->postJson('/api/battle-pass/tiers/'.$tier100->id.'/claim');

        $claimResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier_id', $tier100->id)
            ->assertJsonPath('data.estado', 'RECLAMADO');

        $secondClaim = $this->postJson('/api/battle-pass/tiers/'.$tier100->id.'/claim');
        $secondClaim->assertStatus(422);

        $this->assertDatabaseHas('usuario_pase_batalla', [
            'usuario_id' => $client->id,
            'tier_id' => $tier100->id,
            'estado' => 'RECLAMADO',
        ]);
    }

    public function test_client_cannot_claim_locked_tier(): void
    {
        $client = $this->createClient('battle.locked@example.com');
        $this->grantPoints($client, 80);
        $tier200 = BattlePassTier::query()->where('puntos_requeridos', 200)->firstOrFail();

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/battle-pass/tiers/'.$tier200->id.'/claim');
        $response->assertStatus(422);
    }

    public function test_non_client_cannot_access_battle_pass_endpoints(): void
    {
        $admin = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'battle.admin@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/battle-pass/progress');
        $response->assertStatus(403);
    }

    private function createClient(string $email): User
    {
        return User::query()->create([
            'nombre' => 'Cliente Battle',
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }

    private function grantPoints(User $user, int $points): void
    {
        PointMovement::query()->create([
            'usuario_id' => $user->id,
            'negocio_id' => null,
            'qr_id' => null,
            'cantidad' => $points,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);
    }
}

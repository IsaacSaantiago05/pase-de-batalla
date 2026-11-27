<?php

namespace Tests\Feature\BattlePass;

use App\Models\BattlePassTier;
use App\Models\PointMovement;
use App\Models\Role;
use App\Models\User;
use App\Models\UserBattlePassTier;
use App\Services\BattlePassService;
use Database\Seeders\BattlePassTierSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BattlePassFlowTest extends TestCase
{
    use RefreshDatabase;

    // Puntos ganados que piden algunos niveles (ver App\Support\LevelCurve).
    private const LEVEL_4 = 77;
    private const LEVEL_5 = 103;
    private const LEVEL_10 = 237;
    private const LEVEL_150 = 6586;

    private Role $clienteRole;
    private Role $adminNegocioRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BattlePassTierSeeder::class);

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
    }

    public function test_seeder_loads_the_149_levels_and_can_run_again(): void
    {
        $this->assertDatabaseCount('pase_batalla_tiers', 149);

        $this->seed(BattlePassTierSeeder::class);

        $this->assertDatabaseCount('pase_batalla_tiers', 149);
        $this->assertSame(2, BattlePassTier::query()->min('nivel'));
        $this->assertSame(150, BattlePassTier::query()->max('nivel'));
        $this->assertDatabaseHas('pase_batalla_tiers', ['nivel' => 2, 'puntos_requeridos' => 25, 'puntos_bono' => 2, 'insignia' => null]);
        $this->assertDatabaseHas('pase_batalla_tiers', ['nivel' => 10, 'puntos_requeridos' => 237, 'puntos_bono' => 17, 'insignia' => 'BRONCE']);
        $this->assertDatabaseHas('pase_batalla_tiers', ['nivel' => 150, 'puntos_requeridos' => 6586, 'puntos_bono' => 152, 'insignia' => 'DIAMANTE']);
    }

    public function test_new_client_starts_at_level_one(): void
    {
        Sanctum::actingAs($this->createClient('battle.new@example.com'));

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.puntos_actuales', 0)
            ->assertJsonPath('data.puntos_acumulados', 0)
            ->assertJsonPath('data.nivel_actual', 1)
            ->assertJsonPath('data.nivel_maximo', 150)
            ->assertJsonPath('data.puntos_nivel_actual', 0)
            ->assertJsonPath('data.puntos_siguiente_nivel', 25)
            ->assertJsonPath('data.faltante', 25)
            ->assertJsonPath('data.insignia_actual', null)
            ->assertJsonPath('data.siguiente_insignia.nivel', 10)
            ->assertJsonPath('data.siguiente_insignia.insignia', 'BRONCE')
            ->assertJsonPath('data.siguiente_insignia.faltante', 237)
            ->assertJsonPath('data.siguiente_insignia.puntos_bono', 17)
            ->assertJsonPath('data.niveles_por_reclamar', 0)
            ->assertJsonPath('data.puntos_por_reclamar', 0)
            ->assertJsonPath('data.tiers_desbloqueados', 0)
            ->assertJsonPath('data.tiers_totales', 149)
            ->assertJsonCount(149, 'data.tiers')
            ->assertJsonPath('data.tiers.0.nivel', 2)
            ->assertJsonPath('data.tiers.0.puntos_bono', 2)
            ->assertJsonPath('data.tiers.0.estado_usuario', 'BLOQUEADO')
            ->assertJsonPath('data.tiers.148.nivel', 150)
            ->assertJsonPath('data.tiers.148.insignia', 'DIAMANTE');
    }

    public function test_level_changes_exactly_at_the_required_points(): void
    {
        $service = app(BattlePassService::class);

        $this->assertSame(1, $service->levelForPoints(0));
        $this->assertSame(1, $service->levelForPoints(24));
        $this->assertSame(2, $service->levelForPoints(25));
        $this->assertSame(4, $service->levelForPoints(self::LEVEL_5 - 1));
        $this->assertSame(5, $service->levelForPoints(self::LEVEL_5));
        $this->assertSame(9, $service->levelForPoints(self::LEVEL_10 - 1));
        $this->assertSame(10, $service->levelForPoints(self::LEVEL_10));
        $this->assertSame(149, $service->levelForPoints(self::LEVEL_150 - 1));
        $this->assertSame(150, $service->levelForPoints(self::LEVEL_150));
        $this->assertSame(150, $service->levelForPoints(1000000));
    }

    public function test_progress_shows_reached_levels_and_the_current_badge(): void
    {
        $client = $this->createClient('battle.progress@example.com');
        $this->grantPoints($client, self::LEVEL_10 + 3);

        Sanctum::actingAs($client);

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.nivel_actual', 10)
            ->assertJsonPath('data.puntos_nivel_actual', 237)
            ->assertJsonPath('data.puntos_siguiente_nivel', 264)
            ->assertJsonPath('data.faltante', 24)
            ->assertJsonPath('data.insignia_actual', 'BRONCE')
            ->assertJsonPath('data.siguiente_insignia.nivel', 50)
            ->assertJsonPath('data.siguiente_insignia.insignia', 'PLATA')
            ->assertJsonPath('data.siguiente_insignia.faltante', 1514 - 240)
            // Clientes con puntos previos: todo lo alcanzado queda listo para reclamar.
            ->assertJsonPath('data.niveles_por_reclamar', 9)
            ->assertJsonPath('data.puntos_por_reclamar', 8 * 2 + 17)
            ->assertJsonPath('data.tiers_desbloqueados', 9)
            ->assertJsonPath('data.siguiente_hito_puntos', 264)
            ->assertJsonPath('data.siguiente_hito_faltante', 24)
            ->assertJsonPath('data.tiers.8.nivel', 10)
            ->assertJsonPath('data.tiers.8.estado_usuario', 'DESBLOQUEADO')
            ->assertJsonPath('data.tiers.9.nivel', 11)
            ->assertJsonPath('data.tiers.9.estado_usuario', 'BLOQUEADO');
    }

    public function test_progress_at_the_last_level(): void
    {
        $client = $this->createClient('battle.max@example.com');
        $this->grantPoints($client, self::LEVEL_150 + 500);

        Sanctum::actingAs($client);

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.nivel_actual', 150)
            ->assertJsonPath('data.puntos_siguiente_nivel', null)
            ->assertJsonPath('data.faltante', 0)
            ->assertJsonPath('data.insignia_actual', 'DIAMANTE')
            ->assertJsonPath('data.siguiente_insignia', null)
            ->assertJsonPath('data.niveles_por_reclamar', 149)
            ->assertJsonPath('data.puntos_por_reclamar', 578)
            ->assertJsonPath('data.progreso_porcentaje', 100);
    }

    public function test_client_claims_a_level_once_and_gets_its_bonus(): void
    {
        $client = $this->createClient('battle.claim@example.com');
        $this->grantPoints($client, self::LEVEL_10);
        $levelTen = $this->tier(10);

        Sanctum::actingAs($client);

        $this->postJson('/api/battle-pass/tiers/'.$levelTen->id.'/claim')
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier_id', $levelTen->id)
            ->assertJsonPath('data.nivel', 10)
            ->assertJsonPath('data.estado', 'RECLAMADO')
            ->assertJsonPath('data.niveles_reclamados', 1)
            ->assertJsonPath('data.puntos_reclamados', 17)
            ->assertJsonPath('data.saldo_global', 254);

        $this->assertDatabaseHas('usuario_pase_batalla', ['usuario_id' => $client->id, 'tier_id' => $levelTen->id, 'puntos_bono' => 17]);
        $this->assertDatabaseHas('movimientos_puntos', [
            'usuario_id' => $client->id,
            'negocio_id' => null,
            'otorgado_por' => null,
            'cantidad' => 17,
            'tipo' => 'BONO_NIVEL',
            'motivo' => 'Nivel 10 · Insignia Bronce',
        ]);

        // Segundo intento: no se acredita otra vez.
        $this->postJson('/api/battle-pass/tiers/'.$levelTen->id.'/claim')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Este nivel ya fue reclamado.');

        $this->assertSame(1, PointMovement::query()->where('tipo', 'BONO_NIVEL')->count());

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.puntos_actuales', 254)
            ->assertJsonPath('data.puntos_acumulados', 237)
            ->assertJsonPath('data.nivel_actual', 10)
            ->assertJsonPath('data.niveles_por_reclamar', 8)
            ->assertJsonPath('data.puntos_por_reclamar', 16)
            ->assertJsonPath('data.tiers.8.estado_usuario', 'RECLAMADO')
            ->assertJsonPath('data.tiers.7.estado_usuario', 'DESBLOQUEADO');
    }

    public function test_client_cannot_claim_a_level_not_reached_yet(): void
    {
        $client = $this->createClient('battle.locked@example.com');
        $this->grantPoints($client, self::LEVEL_10 - 1);

        Sanctum::actingAs($client);

        $this->postJson('/api/battle-pass/tiers/'.$this->tier(10)->id.'/claim')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Aún no alcanzas este nivel.');

        $this->postJson('/api/battle-pass/tiers/999999/claim')->assertNotFound();

        $this->assertDatabaseCount('usuario_pase_batalla', 0);
        $this->assertSame(0, PointMovement::query()->where('tipo', 'BONO_NIVEL')->count());
    }

    public function test_claim_all_grants_every_pending_level_in_one_movement(): void
    {
        $client = $this->createClient('battle.all@example.com');
        $this->grantPoints($client, self::LEVEL_10);

        Sanctum::actingAs($client);

        $this->postJson('/api/battle-pass/claim-all')
            ->assertOk()
            ->assertJsonPath('message', 'Niveles reclamados correctamente.')
            ->assertJsonPath('data.niveles_reclamados', 9)
            ->assertJsonPath('data.puntos_reclamados', 33)
            ->assertJsonPath('data.saldo_global', 270);

        $this->assertDatabaseCount('usuario_pase_batalla', 9);
        $this->assertDatabaseHas('movimientos_puntos', [
            'usuario_id' => $client->id,
            'cantidad' => 33,
            'tipo' => 'BONO_NIVEL',
            'motivo' => '9 niveles (hasta el nivel 10) · Insignia Bronce',
        ]);

        // Doble clic: no hay nada que reclamar y el saldo no cambia.
        $this->postJson('/api/battle-pass/claim-all')
            ->assertOk()
            ->assertJsonPath('message', 'No tienes niveles por reclamar.')
            ->assertJsonPath('data.niveles_reclamados', 0)
            ->assertJsonPath('data.puntos_reclamados', 0)
            ->assertJsonPath('data.saldo_global', 270);

        $this->assertDatabaseCount('usuario_pase_batalla', 9);
        $this->assertSame(1, PointMovement::query()->where('tipo', 'BONO_NIVEL')->count());

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.niveles_por_reclamar', 0)
            ->assertJsonPath('data.puntos_por_reclamar', 0);
    }

    public function test_levels_can_be_claimed_in_any_order_and_claim_all_takes_the_rest(): void
    {
        $client = $this->createClient('battle.order@example.com');
        $this->grantPoints($client, self::LEVEL_10);

        Sanctum::actingAs($client);

        // Primero el 7, sin haber reclamado los anteriores.
        $this->postJson('/api/battle-pass/tiers/'.$this->tier(7)->id.'/claim')
            ->assertCreated()
            ->assertJsonPath('data.puntos_reclamados', 2)
            ->assertJsonPath('data.saldo_global', 239);

        $this->assertDatabaseHas('movimientos_puntos', ['usuario_id' => $client->id, 'tipo' => 'BONO_NIVEL', 'motivo' => 'Nivel 7']);

        $this->postJson('/api/battle-pass/claim-all')
            ->assertOk()
            ->assertJsonPath('data.niveles_reclamados', 8)
            ->assertJsonPath('data.puntos_reclamados', 31)
            ->assertJsonPath('data.saldo_global', 270);
    }

    public function test_level_bonus_raises_the_balance_but_not_the_level(): void
    {
        // Con 100 puntos esta en el nivel 4; el nivel 5 pide 103.
        $client = $this->createClient('battle.bonus@example.com');
        $this->grantPoints($client, 100);

        Sanctum::actingAs($client);

        $this->postJson('/api/battle-pass/claim-all')
            ->assertOk()
            ->assertJsonPath('data.niveles_reclamados', 3)
            ->assertJsonPath('data.puntos_reclamados', 6)
            ->assertJsonPath('data.saldo_global', 106);

        // El saldo ya pasa de 103, pero los bonos no cuentan como puntos ganados.
        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.puntos_actuales', 106)
            ->assertJsonPath('data.puntos_acumulados', 100)
            ->assertJsonPath('data.nivel_actual', 4)
            ->assertJsonPath('data.faltante', 3);

        $this->getJson('/api/points/balance')
            ->assertOk()
            ->assertJsonPath('data.saldo_global', 106)
            ->assertJsonPath('data.puntos_acumulados', 100)
            ->assertJsonPath('data.nivel', 4);

        $this->postJson('/api/battle-pass/tiers/'.$this->tier(5)->id.'/claim')->assertStatus(422);
    }

    public function test_spending_points_does_not_reduce_the_level(): void
    {
        $client = $this->createClient('battle.spend@example.com');
        $this->grantPoints($client, self::LEVEL_5);

        Sanctum::actingAs($client);

        $this->postJson('/api/battle-pass/tiers/'.$this->tier(5)->id.'/claim')->assertCreated();

        // El cliente gasta todo su saldo en un canje.
        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => null,
            'qr_id' => null,
            'cantidad' => -105,
            'tipo' => 'CANJE',
            'fecha' => now(),
        ]);

        $this->getJson('/api/battle-pass/progress')
            ->assertOk()
            ->assertJsonPath('data.puntos_actuales', 0)
            ->assertJsonPath('data.puntos_acumulados', 103)
            ->assertJsonPath('data.nivel_actual', 5)
            ->assertJsonPath('data.tiers_desbloqueados', 4)
            ->assertJsonPath('data.tiers.2.estado_usuario', 'DESBLOQUEADO')
            ->assertJsonPath('data.tiers.3.estado_usuario', 'RECLAMADO');

        // Lo que ya alcanzo se sigue pudiendo reclamar aunque el saldo este en cero.
        $this->postJson('/api/battle-pass/tiers/'.$this->tier(4)->id.'/claim')
            ->assertCreated()
            ->assertJsonPath('data.saldo_global', 2);
    }

    public function test_a_level_cannot_be_recorded_twice_for_the_same_client(): void
    {
        $client = $this->createClient('battle.unique@example.com');
        $levelTwo = $this->tier(2);

        $claim = ['usuario_id' => $client->id, 'tier_id' => $levelTwo->id, 'puntos_bono' => 2, 'fecha_reclamo' => now()];
        UserBattlePassTier::query()->create($claim);

        // Respaldo ante reclamos simultaneos: la base rechaza el duplicado.
        $this->expectException(UniqueConstraintViolationException::class);
        UserBattlePassTier::query()->create($claim);
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

        $this->getJson('/api/battle-pass/progress')->assertStatus(403);
        $this->postJson('/api/battle-pass/claim-all')->assertStatus(403);
        $this->postJson('/api/battle-pass/tiers/'.$this->tier(2)->id.'/claim')->assertStatus(403);
    }

    public function test_battle_pass_requires_session(): void
    {
        $this->getJson('/api/battle-pass/progress')->assertUnauthorized();
        $this->postJson('/api/battle-pass/claim-all')->assertUnauthorized();
    }

    private function tier(int $level): BattlePassTier
    {
        return BattlePassTier::query()->where('nivel', $level)->firstOrFail();
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

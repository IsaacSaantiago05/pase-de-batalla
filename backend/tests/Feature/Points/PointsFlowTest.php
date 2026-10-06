<?php

namespace Tests\Feature\Points;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointRule;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PointsFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;
    private Business $businessB;
    private PointRule $ruleA;
    private PointRule $ruleB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);

        Level::query()->create([
            'nombre' => 'Nivel 1',
            'puntos_minimos' => 0,
            'puntos_maximos' => 99,
            'estado' => true,
        ]);

        Level::query()->create([
            'nombre' => 'Nivel 2',
            'puntos_minimos' => 100,
            'puntos_maximos' => 199,
            'estado' => true,
        ]);

        $this->businessA = Business::query()->create([
            'nombre' => 'Negocio A',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $this->businessB = Business::query()->create([
            'nombre' => 'Negocio B',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $this->ruleA = PointRule::query()->create([
            'negocio_id' => $this->businessA->id,
            'monto_minimo' => 1,
            'monto_maximo' => 100,
            'puntos' => 50,
            'estado' => true,
        ]);

        $this->ruleB = PointRule::query()->create([
            'negocio_id' => $this->businessB->id,
            'monto_minimo' => 1,
            'monto_maximo' => 100,
            'puntos' => 25,
            'estado' => true,
        ]);
    }

    public function test_points_are_awarded_and_global_balance_is_returned(): void
    {
        $adminNegocio = User::query()->create([
            'nombre' => 'Admin A',
            'correo' => 'admina@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente X',
            'correo' => 'clientex@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $awardResponse = $this->postJson('/api/points/award', [
            'usuario_id' => $client->id,
            'regla_puntos_id' => $this->ruleA->id,
        ]);

        $awardResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.movimiento.cantidad', 50)
            ->assertJsonPath('data.saldo_global', 50);

        Sanctum::actingAs($client);

        $balanceResponse = $this->getJson('/api/points/balance');

        $balanceResponse
            ->assertOk()
            ->assertJsonPath('data.saldo_global', 50);
    }

    public function test_global_points_accumulate_and_level_is_updated(): void
    {
        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'adminglobal@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente Y',
            'correo' => 'clientey@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $this->postJson('/api/points/award', [
            'usuario_id' => $client->id,
            'regla_puntos_id' => $this->ruleA->id,
        ])->assertCreated();

        $this->postJson('/api/points/award', [
            'usuario_id' => $client->id,
            'regla_puntos_id' => $this->ruleA->id,
        ])->assertCreated();

        $client->refresh();

        $this->assertDatabaseCount('movimientos_puntos', 2);
        $this->assertEquals(100, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));

        $nivel2 = Level::query()->where('nombre', 'Nivel 2')->firstOrFail();
        $this->assertEquals($nivel2->id, $client->nivel_id);
    }

    public function test_business_admin_cannot_award_points_using_other_business_rule(): void
    {
        $adminNegocio = User::query()->create([
            'nombre' => 'Admin A',
            'correo' => 'admina2@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente Z',
            'correo' => 'clientez@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->postJson('/api/points/award', [
            'usuario_id' => $client->id,
            'regla_puntos_id' => $this->ruleB->id,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_level_falls_back_to_highest_active_when_balance_exceeds_ranges(): void
    {
        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General Alto',
            'correo' => 'adminglobalmax@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente Alto',
            'correo' => 'clientealto@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/points/award', [
                'usuario_id' => $client->id,
                'regla_puntos_id' => $this->ruleA->id,
            ])->assertCreated();
        }

        $client->refresh();

        $nivel2 = Level::query()->where('nombre', 'Nivel 2')->firstOrFail();
        $this->assertEquals(250, (int) DB::table('movimientos_puntos')->where('usuario_id', $client->id)->sum('cantidad'));
        $this->assertEquals($nivel2->id, $client->nivel_id);
    }

    public function test_client_cannot_award_points(): void
    {
        $client = User::query()->create([
            'nombre' => 'Cliente Restriccion',
            'correo' => 'clienter@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/points/award', [
            'usuario_id' => $client->id,
            'regla_puntos_id' => $this->ruleA->id,
        ]);

        $response->assertStatus(403);
    }
}

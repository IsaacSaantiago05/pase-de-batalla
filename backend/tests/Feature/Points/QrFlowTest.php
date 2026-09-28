<?php

namespace Tests\Feature\Points;

use App\Models\Business;
use App\Models\Level;
use App\Models\QrCode;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QrFlowTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $businessA;
    private Business $businessB;

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
    }

    public function test_admin_negocio_generates_qr_for_own_business(): void
    {
        $adminNegocio = User::query()->create([
            'nombre' => 'Admin A',
            'correo' => 'admin.qr.a@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->postJson('/api/qr/generate', [
            'puntos' => 40,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.negocio_id', $this->businessA->id)
            ->assertJsonPath('data.puntos', 40)
            ->assertJsonPath('data.estado', 'ACTIVO');

        $this->assertDatabaseCount('codigos_qr', 1);
    }

    public function test_admin_negocio_cannot_generate_qr_for_other_business(): void
    {
        $adminNegocio = User::query()->create([
            'nombre' => 'Admin A2',
            'correo' => 'admin.qr.a2@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->postJson('/api/qr/generate', [
            'negocio_id' => $this->businessB->id,
            'puntos' => 30,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_client_redeems_qr_once_and_cannot_redeem_twice(): void
    {
        $client = User::query()->create([
            'nombre' => 'Cliente QR',
            'correo' => 'cliente.qr@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $qrCode = QrCode::query()->create([
            'negocio_id' => $this->businessA->id,
            'token' => 'TOKEN-QR-UNICO-123',
            'puntos' => 60,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now(),
        ]);

        Sanctum::actingAs($client);

        $firstRedeem = $this->postJson('/api/qr/redeem', [
            'token' => $qrCode->token,
        ]);

        $firstRedeem
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.movimiento.cantidad', 60)
            ->assertJsonPath('data.movimiento.qr_id', $qrCode->id)
            ->assertJsonPath('data.saldo_global', 60);

        $secondRedeem = $this->postJson('/api/qr/redeem', [
            'token' => $qrCode->token,
        ]);

        $secondRedeem
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertEquals(1, QrCode::query()->where('id', $qrCode->id)->where('estado', 'UTILIZADO')->count());
        $this->assertEquals(1, DB::table('movimientos_puntos')->where('qr_id', $qrCode->id)->count());
    }

    public function test_expired_qr_cannot_be_redeemed_and_is_marked_as_expired(): void
    {
        $client = User::query()->create([
            'nombre' => 'Cliente Exp',
            'correo' => 'cliente.exp@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $qrCode = QrCode::query()->create([
            'negocio_id' => $this->businessA->id,
            'token' => 'TOKEN-QR-EXP-001',
            'puntos' => 30,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now()->subDay(),
            'fecha_expiracion' => now()->subMinute(),
        ]);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/qr/redeem', [
            'token' => $qrCode->token,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertEquals('EXPIRADO', QrCode::query()->findOrFail($qrCode->id)->estado);
    }

    public function test_cancelled_qr_cannot_be_redeemed(): void
    {
        $client = User::query()->create([
            'nombre' => 'Cliente Cancel',
            'correo' => 'cliente.cancel@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $qrCode = QrCode::query()->create([
            'negocio_id' => $this->businessA->id,
            'token' => 'TOKEN-QR-CANCEL-001',
            'puntos' => 30,
            'estado' => 'CANCELADO',
            'fecha_creacion' => now(),
        ]);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/qr/redeem', [
            'token' => $qrCode->token,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_business_admin_isolation_for_qr_queries(): void
    {
        $adminNegocioA = User::query()->create([
            'nombre' => 'Admin Negocio A',
            'correo' => 'admin.nega@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $this->businessA->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        QrCode::query()->create([
            'negocio_id' => $this->businessA->id,
            'token' => 'TOKEN-QR-ISO-A',
            'puntos' => 20,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now(),
        ]);

        $qrFromOtherBusiness = QrCode::query()->create([
            'negocio_id' => $this->businessB->id,
            'token' => 'TOKEN-QR-ISO-B',
            'puntos' => 25,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now(),
        ]);

        Sanctum::actingAs($adminNegocioA);

        $listResponse = $this->getJson('/api/qr');

        $listResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        $showForbiddenResponse = $this->getJson('/api/qr/'.$qrFromOtherBusiness->id);

        $showForbiddenResponse->assertStatus(403);
    }
}

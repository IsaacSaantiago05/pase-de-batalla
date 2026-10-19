<?php

namespace Tests\Feature\Points;

use App\Models\Business;
use App\Models\Level;
use App\Models\QrCode;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QrCancelTest extends TestCase
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
        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 999, 'estado' => true]);
        $this->businessA = Business::query()->create(['nombre' => 'Negocio A', 'estado' => true, 'fecha_registro' => now()]);
        $this->businessB = Business::query()->create(['nombre' => 'Negocio B', 'estado' => true, 'fecha_registro' => now()]);
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

    private function makeQr(Business $business, string $status = 'ACTIVO'): QrCode
    {
        return QrCode::query()->create([
            'negocio_id' => $business->id,
            'token' => 'TOKEN-'.uniqid(),
            'puntos' => 10,
            'estado' => $status,
            'fecha_creacion' => now(),
            'fecha_expiracion' => now()->addMinutes(5),
        ]);
    }

    public function test_business_admin_cancels_own_active_qr_and_it_cannot_be_redeemed(): void
    {
        $qr = $this->makeQr($this->businessA);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->patchJson("/api/qr/{$qr->id}/cancel")->assertOk()->assertJsonPath('data.estado', 'CANCELADO');

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));
        $this->postJson('/api/qr/redeem', ['token' => $qr->token])->assertStatus(422);
        $this->assertDatabaseCount('movimientos_puntos', 0);
    }

    public function test_used_qr_cannot_be_cancelled(): void
    {
        $qr = $this->makeQr($this->businessA, 'UTILIZADO');
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->patchJson("/api/qr/{$qr->id}/cancel")->assertStatus(422);
        $this->assertSame('UTILIZADO', $qr->fresh()->estado);
    }

    public function test_business_admin_cannot_cancel_qr_of_other_business(): void
    {
        $qr = $this->makeQr($this->businessB);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'a@example.com', $this->businessA->id));

        $this->patchJson("/api/qr/{$qr->id}/cancel")->assertStatus(403);
        $this->assertSame('ACTIVO', $qr->fresh()->estado);
    }

    public function test_general_admin_can_cancel_and_client_cannot(): void
    {
        $qr = $this->makeQr($this->businessA);

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'c@example.com'));
        $this->patchJson("/api/qr/{$qr->id}/cancel")->assertStatus(403);

        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));
        $this->patchJson("/api/qr/{$qr->id}/cancel")->assertOk();
    }

    public function test_cancel_missing_qr_returns_404(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'g@example.com'));

        $this->patchJson('/api/qr/999/cancel')->assertStatus(404);
    }
}

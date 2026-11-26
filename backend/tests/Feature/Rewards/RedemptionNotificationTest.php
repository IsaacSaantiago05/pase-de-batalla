<?php

namespace Tests\Feature\Rewards;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointMovement;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use App\Notifications\RewardRedeemed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RedemptionNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $business;
    private Business $otherBusiness;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);

        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 100000, 'estado' => true]);

        $this->business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        $this->otherBusiness = Business::query()->create(['nombre' => 'Cafe Aurora', 'estado' => true, 'fecha_registro' => now()]);
    }

    public function test_redeeming_notifies_only_the_active_admins_of_the_reward_business(): void
    {
        $owner = $this->makeUser($this->adminNegocioRole, 'dueno@example.com', $this->business->id);
        $partner = $this->makeUser($this->adminNegocioRole, 'socio@example.com', $this->business->id);
        $inactive = $this->makeUser($this->adminNegocioRole, 'baja@example.com', $this->business->id, false);
        $otherAdmin = $this->makeUser($this->adminNegocioRole, 'otro@example.com', $this->otherBusiness->id);
        $general = $this->makeUser($this->adminGeneralRole, 'general@example.com');
        $client = $this->makeClient('María López', 'maria@example.com', 1500);
        $reward = $this->makeReward($this->business, 'Café gratis', 1200);

        Sanctum::actingAs($client);
        $redemptionId = $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertCreated()->json('data.canje.id');

        // Solo los administradores activos del negocio dueño de la recompensa.
        $this->assertSame(1, $owner->notifications()->count());
        $this->assertSame(1, $partner->notifications()->count());
        $this->assertSame(0, $inactive->notifications()->count());
        $this->assertSame(0, $otherAdmin->notifications()->count());
        $this->assertSame(0, $general->notifications()->count());
        $this->assertSame(0, $client->notifications()->count());
        $this->assertSame(2, DB::table('notifications')->count());

        // El aviso dice quien canjeo y que recompensa.
        $data = $owner->notifications()->first()->data;
        $this->assertSame(RewardRedeemed::TYPE, $data['tipo']);
        $this->assertSame('Nueva recompensa canjeada', $data['titulo']);
        $this->assertSame('María López canjeó "Café gratis" por 1,200 puntos.', $data['mensaje']);
        $this->assertSame('María López', $data['cliente_nombre']);
        $this->assertSame('Café gratis', $data['recompensa_nombre']);
        $this->assertSame($redemptionId, $data['canje_id']);
        $this->assertSame($this->business->id, $data['negocio_id']);
    }

    public function test_failed_redemption_does_not_notify(): void
    {
        $owner = $this->makeUser($this->adminNegocioRole, 'dueno@example.com', $this->business->id);
        $reward = $this->makeReward($this->business, 'Café gratis', 500);

        // Sin puntos suficientes no hay canje ni aviso.
        Sanctum::actingAs($this->makeClient('Sin Puntos', 'pobre@example.com', 10));
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertStatus(422);

        $this->assertSame(0, $owner->notifications()->count());
        $this->assertSame(0, DB::table('notifications')->count());
    }

    public function test_business_admin_reads_and_marks_own_notifications(): void
    {
        $owner = $this->makeUser($this->adminNegocioRole, 'dueno@example.com', $this->business->id);
        $otherAdmin = $this->makeUser($this->adminNegocioRole, 'otro@example.com', $this->otherBusiness->id);
        $client = $this->makeClient('María López', 'maria@example.com', 5000);
        $first = $this->makeReward($this->business, 'Café gratis', 100);
        $second = $this->makeReward($this->business, 'Postre del día', 250);
        $foreign = $this->makeReward($this->otherBusiness, 'Galleta', 50);

        Sanctum::actingAs($client);
        $this->postJson('/api/redemptions', ['recompensa_id' => $first->id])->assertCreated();
        $this->travel(1)->minutes();
        $this->postJson('/api/redemptions', ['recompensa_id' => $second->id])->assertCreated();
        $this->postJson('/api/redemptions', ['recompensa_id' => $foreign->id])->assertCreated();

        Sanctum::actingAs($owner);

        // Resumen para la campana: cuantas sin leer y la mas reciente.
        $this->getJson('/api/notifications/summary')
            ->assertOk()
            ->assertJsonPath('data.no_leidas', 2)
            ->assertJsonPath('data.ultima.recompensa_nombre', 'Postre del día')
            ->assertJsonPath('data.ultima.cliente_nombre', 'María López')
            ->assertJsonPath('data.ultima.leida', false);

        // Listado: solo las suyas, la mas nueva primero.
        $rows = $this->getJson('/api/notifications')->assertOk()->json('data');
        $this->assertSame(['Postre del día', 'Café gratis'], array_column($rows, 'recompensa_nombre'));
        $this->assertSame('María López canjeó "Postre del día" por 250 puntos.', $rows[0]['mensaje']);

        // Marcar una como leida.
        $this->patchJson('/api/notifications/'.$rows[0]['id'].'/read')->assertOk()->assertJsonPath('data.leida', true);
        $this->getJson('/api/notifications/summary')
            ->assertOk()
            ->assertJsonPath('data.no_leidas', 1)
            ->assertJsonPath('data.ultima.recompensa_nombre', 'Café gratis');

        // No puede tocar la notificacion de otro negocio.
        $foreignId = $otherAdmin->notifications()->first()->id;
        $this->patchJson('/api/notifications/'.$foreignId.'/read')->assertNotFound();
        $this->assertNull($otherAdmin->notifications()->first()->read_at);

        // Marcar todas.
        $this->postJson('/api/notifications/read-all')->assertOk()->assertJsonPath('data.no_leidas', 0);
        $this->getJson('/api/notifications/summary')->assertOk()->assertJsonPath('data.no_leidas', 0)->assertJsonPath('data.ultima', null);
        $this->assertSame(1, $otherAdmin->unreadNotifications()->count());
    }

    public function test_notifications_require_session(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->getJson('/api/notifications/summary')->assertUnauthorized();
    }

    private function makeReward(Business $business, string $name, int $points): Reward
    {
        return Reward::query()->create([
            'negocio_id' => $business->id,
            'nombre' => $name,
            'puntos_requeridos' => $points,
            'cantidad_disponible' => 5,
            'estado' => true,
        ]);
    }

    private function makeClient(string $name, string $email, int $points): User
    {
        $client = $this->makeUser($this->clienteRole, $email, null, true, $name);

        PointMovement::query()->create([
            'usuario_id' => $client->id,
            'negocio_id' => $this->business->id,
            'qr_id' => null,
            'cantidad' => $points,
            'tipo' => 'GANANCIA',
            'fecha' => now(),
        ]);

        return $client;
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null, bool $active = true, string $name = 'Usuario'): User
    {
        return User::query()->create([
            'nombre' => $name,
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => $active,
            'fecha_registro' => now(),
        ]);
    }
}

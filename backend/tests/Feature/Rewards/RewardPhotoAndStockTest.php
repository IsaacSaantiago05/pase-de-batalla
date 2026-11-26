<?php

namespace Tests\Feature\Rewards;

use App\Models\Business;
use App\Models\Level;
use App\Models\PointMovement;
use App\Models\Reward;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RewardPhotoAndStockTest extends TestCase
{
    use RefreshDatabase;

    // PNG real de 1x1 pixel: las pruebas no dependen de la extension GD.
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;
    private Business $business;
    private Business $otherBusiness;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);

        Level::query()->create(['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 1000, 'estado' => true]);

        $this->business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        $this->otherBusiness = Business::query()->create(['nombre' => 'Cafe Aurora', 'estado' => true, 'fecha_registro' => now()]);
    }

    public function test_business_admin_adds_changes_and_removes_reward_photo(): void
    {
        $reward = $this->makeReward($this->business, 5);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/rewards/'.$reward->id.'/photo';

        $response = $this->post($url, ['imagen' => $this->image('pastel.png')], ['Accept' => 'application/json'])->assertOk();
        $first = $reward->fresh()->foto;

        $this->assertStringStartsWith('recompensas/', $first);
        Storage::disk('public')->assertExists($first);
        $response->assertJsonPath('data.foto_url', url('api/media/'.$first));
        $response->assertJsonPath('data.negocio_nombre', 'Sweet Art');

        // Al cambiarla se borra la anterior.
        $this->post($url, ['imagen' => $this->image('otra.png')], ['Accept' => 'application/json'])->assertOk();
        $second = $reward->fresh()->foto;
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->deleteJson($url)->assertOk()->assertJsonPath('data.foto_url', null);
        $this->assertNull($reward->fresh()->foto);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_client_sees_the_photo_and_it_is_served_without_session(): void
    {
        $reward = $this->makeReward($this->business, 5);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $this->post('/api/rewards/'.$reward->id.'/photo', ['imagen' => $this->image('pastel.png')], ['Accept' => 'application/json'])->assertOk();
        $path = $reward->fresh()->foto;

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));
        $rows = $this->getJson('/api/rewards')->assertOk()->json('data');
        $this->assertSame(url('api/media/'.$path), $rows[0]['foto_url']);

        // Una etiqueta <img> no envia el token.
        $this->app['auth']->forgetGuards();
        $served = $this->get('/api/media/'.$path)->assertOk();
        $this->assertSame('image/png', $served->headers->get('Content-Type'));
    }

    public function test_reward_photo_is_validated_and_limited_to_the_owner_business(): void
    {
        $own = $this->makeReward($this->business, 5);
        $foreign = $this->makeReward($this->otherBusiness, 5);

        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $this->postJson('/api/rewards/'.$own->id.'/photo', [])->assertStatus(422)->assertJsonPath('errors.imagen.0', 'Elige una imagen.');
        $this->post('/api/rewards/'.$own->id.'/photo', ['imagen' => UploadedFile::fake()->create('nota.pdf', 20, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.imagen.0', 'La imagen debe ser JPG, PNG o WebP.');

        $this->post('/api/rewards/'.$foreign->id.'/photo', ['imagen' => $this->image('pastel.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->deleteJson('/api/rewards/'.$foreign->id.'/photo')->assertForbidden();

        // La foto no se puede escribir como texto al editar la recompensa.
        $this->putJson('/api/rewards/'.$own->id, ['nombre' => 'Pastel', 'foto' => 'recompensas/ajena.png'])->assertOk();
        $this->assertNull($own->fresh()->foto);

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));
        $this->post('/api/rewards/'.$own->id.'/photo', ['imagen' => $this->image('pastel.png')], ['Accept' => 'application/json'])->assertForbidden();

        // El administrador general si puede, en cualquier negocio.
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'general@example.com'));
        $this->post('/api/rewards/'.$foreign->id.'/photo', ['imagen' => $this->image('pastel.png')], ['Accept' => 'application/json'])->assertOk();
        $this->assertNotNull($foreign->fresh()->foto);
        $this->assertCount(1, Storage::disk('public')->allFiles());
    }

    public function test_business_admin_restocks_a_sold_out_reward(): void
    {
        $reward = $this->makeReward($this->business, 1);
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        PointMovement::query()->create(['usuario_id' => $client->id, 'negocio_id' => $this->business->id, 'qr_id' => null, 'cantidad' => 500, 'tipo' => 'GANANCIA', 'fecha' => now()]);
        $admin = $this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id);

        // El ultimo canje la deja agotada.
        Sanctum::actingAs($client);
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertCreated();
        $this->assertSame(0, (int) $reward->fresh()->cantidad_disponible);

        // Agotada: el cliente ya no la ve ni la puede canjear.
        $this->assertSame([], $this->getJson('/api/rewards')->assertOk()->json('data'));
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'La recompensa no tiene stock disponible.');

        // El negocio la sigue viendo y repone existencias sin tocar lo demas.
        Sanctum::actingAs($admin);
        $this->assertSame(0, $this->getJson('/api/rewards')->assertOk()->json('data.0.cantidad_disponible'));
        $this->putJson('/api/rewards/'.$reward->id, ['cantidad_disponible' => 12])
            ->assertOk()
            ->assertJsonPath('data.cantidad_disponible', 12)
            ->assertJsonPath('data.nombre', 'Pastel de chocolate')
            ->assertJsonPath('data.puntos_requeridos', 100);

        // Vuelve a aparecer y a canjearse.
        Sanctum::actingAs($client);
        $this->assertSame(12, $this->getJson('/api/rewards')->assertOk()->json('data.0.cantidad_disponible'));
        $this->postJson('/api/redemptions', ['recompensa_id' => $reward->id])->assertCreated();
        $this->assertSame(11, (int) $reward->fresh()->cantidad_disponible);
    }

    public function test_available_quantity_is_validated_and_limited_to_the_owner_business(): void
    {
        $own = $this->makeReward($this->business, 5);
        $foreign = $this->makeReward($this->otherBusiness, 5);
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $this->putJson('/api/rewards/'.$own->id, ['cantidad_disponible' => -1])
            ->assertStatus(422)
            ->assertJsonPath('errors.cantidad_disponible.0', 'La cantidad disponible no puede ser negativa.');
        $this->putJson('/api/rewards/'.$own->id, ['cantidad_disponible' => 2.5])
            ->assertStatus(422)
            ->assertJsonPath('errors.cantidad_disponible.0', 'La cantidad disponible debe ser un número entero.');
        $this->putJson('/api/rewards/'.$own->id, ['cantidad_disponible' => 100001])
            ->assertStatus(422)
            ->assertJsonPath('errors.cantidad_disponible.0', 'La cantidad disponible no puede pasar de 100,000.');
        $this->assertSame(5, (int) $own->fresh()->cantidad_disponible);

        // Poner 0 es valido: la deja agotada a proposito.
        $this->putJson('/api/rewards/'.$own->id, ['cantidad_disponible' => 0])->assertOk()->assertJsonPath('data.cantidad_disponible', 0);

        $this->putJson('/api/rewards/'.$foreign->id, ['cantidad_disponible' => 99])->assertForbidden();
        $this->assertSame(5, (int) $foreign->fresh()->cantidad_disponible);

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));
        $this->putJson('/api/rewards/'.$own->id, ['cantidad_disponible' => 99])->assertForbidden();
    }

    private function image(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::PNG));
    }

    private function makeReward(Business $business, int $stock): Reward
    {
        return Reward::query()->create([
            'negocio_id' => $business->id,
            'nombre' => 'Pastel de chocolate',
            'descripcion' => 'Rebanada',
            'puntos_requeridos' => 100,
            'cantidad_disponible' => $stock,
            'estado' => true,
        ]);
    }

    private function makeUser(Role $role, string $email, ?int $businessId = null): User
    {
        return User::query()->create([
            'nombre' => 'Usuario '.$role->nombre,
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }
}

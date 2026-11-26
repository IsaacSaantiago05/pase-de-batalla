<?php

namespace Tests\Feature\Clients;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    // PNG real de 1x1 pixel: las pruebas no dependen de la extension GD.
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
    }

    public function test_client_uploads_and_sees_own_profile_photo(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.foto_url', null);

        $response = $this->post('/api/profile/photo', ['imagen' => $this->image('yo.png')], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('success', true);

        $path = $client->fresh()->foto;
        $this->assertNotNull($path);
        $this->assertStringStartsWith('usuarios/', $path);
        Storage::disk('public')->assertExists($path);

        // La API entrega la direccion completa, tanto al subirla como al consultar el perfil.
        $response->assertJsonPath('data.foto_url', url('api/media/'.$path));
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.foto_url', url('api/media/'.$path));
    }

    public function test_replacing_or_removing_the_photo_deletes_the_previous_file(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);

        $this->post('/api/profile/photo', ['imagen' => $this->image('primera.png')], ['Accept' => 'application/json'])->assertOk();
        $first = $client->fresh()->foto;

        $this->post('/api/profile/photo', ['imagen' => $this->image('segunda.png')], ['Accept' => 'application/json'])->assertOk();
        $second = $client->fresh()->foto;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->deleteJson('/api/profile/photo')->assertOk()->assertJsonPath('data.foto_url', null);

        $this->assertNull($client->fresh()->foto);
        Storage::disk('public')->assertMissing($second);
        $this->assertSame([], Storage::disk('public')->allFiles());

        // Quitarla dos veces no falla.
        $this->deleteJson('/api/profile/photo')->assertOk();
    }

    public function test_photo_upload_is_validated_and_requires_session(): void
    {
        $this->post('/api/profile/photo', ['imagen' => $this->image('yo.png')], ['Accept' => 'application/json'])->assertUnauthorized();

        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);

        $this->postJson('/api/profile/photo', [])->assertStatus(422)->assertJsonPath('errors.imagen.0', 'Elige una imagen.');
        $this->post('/api/profile/photo', ['imagen' => UploadedFile::fake()->create('nota.pdf', 20, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.imagen.0', 'La imagen debe ser JPG, PNG o WebP.');
        $this->post('/api/profile/photo', ['imagen' => UploadedFile::fake()->createWithContent('falsa.png', '<?php echo "hola";')], ['Accept' => 'application/json'])
            ->assertStatus(422);
        $errors = $this->post('/api/profile/photo', ['imagen' => UploadedFile::fake()->create('enorme.jpg', 3000, 'image/jpeg')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->json('errors.imagen');
        $this->assertContains('La imagen no puede pesar más de 2 MB.', $errors);

        $this->assertNull($client->fresh()->foto);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_photo_cannot_be_set_as_text_through_profile_update(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);

        // Apuntar la foto a la imagen de otra cuenta permitiria borrarla al reemplazarla.
        $this->putJson('/api/profile', ['nombre' => 'Nombre Nuevo', 'foto' => 'usuarios/ajena.png'])->assertOk();

        $this->assertSame('Nombre Nuevo', $client->fresh()->nombre);
        $this->assertNull($client->fresh()->foto);
    }

    public function test_photo_is_private_to_its_owner_in_admin_listings(): void
    {
        $business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);
        $this->post('/api/profile/photo', ['imagen' => $this->image('yo.png')], ['Accept' => 'application/json'])->assertOk();

        // Otro cliente no tiene forma de consultar el perfil ajeno.
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'otro@example.com'));
        $this->getJson('/api/users/'.$client->id)->assertForbidden();

        // El administrador general ve al usuario, pero no su foto.
        $general = $this->makeUser($this->adminGeneralRole, 'general@example.com');
        Sanctum::actingAs($general);
        $shown = $this->getJson('/api/users/'.$client->id)->assertOk()->json('data');
        $this->assertSame('cliente@example.com', $shown['correo']);
        $this->assertArrayNotHasKey('foto_url', $shown);
        $this->assertArrayNotHasKey('foto', $shown);

        // En el listado solo su propia fila trae el campo.
        $rows = collect($this->getJson('/api/users')->assertOk()->json('data'));
        $this->assertGreaterThanOrEqual(2, $rows->count());
        foreach ($rows as $row) {
            $this->assertArrayNotHasKey('foto', $row);
            $this->assertSame($row['id'] === $general->id, array_key_exists('foto_url', $row));
        }

        // Un administrador tambien puede tener su propia foto.
        $admin = $this->makeUser($this->adminNegocioRole, 'negocio@example.com', $business->id);
        Sanctum::actingAs($admin);
        $this->post('/api/profile/photo', ['imagen' => $this->image('admin.png')], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.foto_url', url('api/media/'.$admin->fresh()->foto));
    }

    public function test_photo_is_served_from_the_users_folder(): void
    {
        $client = $this->makeUser($this->clienteRole, 'cliente@example.com');
        Sanctum::actingAs($client);
        $this->post('/api/profile/photo', ['imagen' => $this->image('yo.png')], ['Accept' => 'application/json'])->assertOk();
        $path = $client->fresh()->foto;

        // Una etiqueta <img> no envia el token: la imagen se entrega sin sesion.
        $this->app['auth']->forgetGuards();

        $response = $this->get('/api/media/'.$path)->assertOk();
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
        $this->assertSame(base64_decode(self::PNG), $response->streamedContent());

        $this->get('/api/media/usuarios/noexiste.png')->assertNotFound();
        $this->get('/api/media/otros/'.basename($path))->assertNotFound();
    }

    private function image(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::PNG));
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

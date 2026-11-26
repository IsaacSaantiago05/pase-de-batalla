<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessProfileTest extends TestCase
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

        $this->business = Business::query()->create(['nombre' => 'Sweet Art', 'descripcion' => 'Pasteleria', 'correo' => 'sweet@example.com', 'estado' => true, 'fecha_registro' => now()]);
        $this->otherBusiness = Business::query()->create(['nombre' => 'Cafe Aurora', 'estado' => true, 'fecha_registro' => now()]);
    }

    public function test_business_admin_uploads_cover_and_profile_picture(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $this->post('/api/businesses/'.$this->business->id.'/cover', ['imagen' => $this->image('portada.png')], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('success', true);
        $response = $this->post('/api/businesses/'.$this->business->id.'/logo', ['imagen' => $this->image('logo.png')], ['Accept' => 'application/json'])
            ->assertOk();

        $business = $this->business->fresh();
        $this->assertNotNull($business->portada);
        $this->assertNotNull($business->logo);
        $this->assertNotSame($business->portada, $business->logo);
        Storage::disk('public')->assertExists($business->portada);
        Storage::disk('public')->assertExists($business->logo);

        // La API entrega direcciones completas, no la ruta interna.
        $response->assertJsonPath('data.portada_url', url('api/media/'.$business->portada));
        $response->assertJsonPath('data.logo_url', url('api/media/'.$business->logo));
        $response->assertJsonMissingPath('data.logo');
    }

    public function test_replacing_or_removing_an_image_deletes_the_previous_file(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id.'/cover';

        $this->post($url, ['imagen' => $this->image('primera.png')], ['Accept' => 'application/json'])->assertOk();
        $first = $this->business->fresh()->portada;

        $this->post($url, ['imagen' => $this->image('segunda.png')], ['Accept' => 'application/json'])->assertOk();
        $second = $this->business->fresh()->portada;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->deleteJson($url)->assertOk()->assertJsonPath('data.portada_url', null);

        $this->assertNull($this->business->fresh()->portada);
        Storage::disk('public')->assertMissing($second);
    }

    public function test_upload_rejects_files_that_are_not_small_images(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id.'/logo';

        $this->postJson($url, [])->assertStatus(422)->assertJsonPath('errors.imagen.0', 'Elige una imagen.');

        $this->post($url, ['imagen' => UploadedFile::fake()->create('nota.pdf', 20, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.imagen.0', 'La imagen debe ser JPG, PNG o WebP.');

        // Un archivo que solo se llama .png pero no es una imagen.
        $this->post($url, ['imagen' => UploadedFile::fake()->createWithContent('falsa.png', '<?php echo "hola";')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['imagen']);

        $errors = $this->post($url, ['imagen' => UploadedFile::fake()->create('enorme.jpg', 3000, 'image/jpeg')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->json('errors.imagen');
        $this->assertContains('La imagen no puede pesar más de 2 MB.', $errors);

        $this->assertNull($this->business->fresh()->logo);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_business_admin_cannot_modify_another_business_and_client_cannot_modify_any(): void
    {
        $this->otherBusiness->update(['enlaces' => [['nombre' => 'Sitio', 'url' => 'https://aurora.example.com']]]);
        $links = ['enlaces' => [['nombre' => 'Trampa', 'url' => 'https://example.com']]];

        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        $this->post('/api/businesses/'.$this->otherBusiness->id.'/cover', ['imagen' => $this->image('portada.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->post('/api/businesses/'.$this->otherBusiness->id.'/logo', ['imagen' => $this->image('logo.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->deleteJson('/api/businesses/'.$this->otherBusiness->id.'/cover')->assertForbidden();
        $this->deleteJson('/api/businesses/'.$this->otherBusiness->id.'/logo')->assertForbidden();
        $this->putJson('/api/businesses/'.$this->otherBusiness->id.'/links', $links)->assertForbidden();

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));

        $this->post('/api/businesses/'.$this->business->id.'/cover', ['imagen' => $this->image('portada.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->putJson('/api/businesses/'.$this->business->id.'/links', $links)->assertForbidden();

        $other = $this->otherBusiness->fresh();
        $this->assertNull($other->portada);
        $this->assertNull($other->logo);
        $this->assertSame('Sitio', $other->enlaces[0]['nombre']);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_general_admin_can_edit_and_clean_any_business_profile(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminGeneralRole, 'general@example.com'));

        $this->post('/api/businesses/'.$this->business->id.'/logo', ['imagen' => $this->image('logo.png')], ['Accept' => 'application/json'])->assertOk();
        $this->assertNotNull($this->business->fresh()->logo);

        $this->deleteJson('/api/businesses/'.$this->business->id.'/logo')->assertOk()->assertJsonPath('data.logo_url', null);
        $this->putJson('/api/businesses/'.$this->business->id.'/links', ['enlaces' => []])->assertOk()->assertJsonPath('data.enlaces', []);
    }

    public function test_business_admin_saves_named_links(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id.'/links';

        $this->putJson($url, ['enlaces' => [
            ['nombre' => 'Ubicación', 'url' => 'https://maps.app.goo.gl/abc123', 'extra' => 'no se guarda'],
            ['nombre' => 'Instagram', 'url' => 'https://www.instagram.com/sweetart'],
        ]])
            ->assertOk()
            ->assertJsonPath('data.enlaces.0.nombre', 'Ubicación')
            ->assertJsonPath('data.enlaces.1.url', 'https://www.instagram.com/sweetart');

        $this->assertSame([
            ['nombre' => 'Ubicación', 'url' => 'https://maps.app.goo.gl/abc123'],
            ['nombre' => 'Instagram', 'url' => 'https://www.instagram.com/sweetart'],
        ], $this->business->fresh()->enlaces);

        // Una lista vacia quita todos los enlaces.
        $this->putJson($url, ['enlaces' => []])->assertOk();
        $this->assertSame([], $this->business->fresh()->enlaces);
    }

    public function test_links_are_validated(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id.'/links';

        // Solo direcciones web: un enlace "javascript:" ejecutaria codigo en la app del cliente.
        $errors = $this->putJson($url, ['enlaces' => [['nombre' => 'Trampa', 'url' => 'javascript:alert(1)']]])
            ->assertStatus(422)
            ->json('errors');
        $this->assertSame('El enlace debe ser una dirección web que empiece con http:// o https://.', $errors['enlaces.0.url'][0]);
        $this->putJson($url, ['enlaces' => [['nombre' => 'Sin protocolo', 'url' => 'instagram.com/sweetart']]])->assertStatus(422);
        $this->putJson($url, ['enlaces' => [['nombre' => '', 'url' => 'https://example.com']]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['enlaces.0.nombre']);
        $this->putJson($url, ['enlaces' => [['nombre' => str_repeat('a', 41), 'url' => 'https://example.com']]])->assertStatus(422);
        $this->putJson($url, [])->assertStatus(422);

        $tooMany = array_fill(0, 9, ['nombre' => 'Enlace', 'url' => 'https://example.com']);
        $this->putJson($url, ['enlaces' => $tooMany])
            ->assertStatus(422)
            ->assertJsonPath('errors.enlaces.0', 'Puedes agregar hasta 8 enlaces.');

        $this->assertNull($this->business->fresh()->enlaces);
    }

    public function test_business_admin_edits_description_address_and_phone(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id;

        $this->putJson($url, ['descripcion' => 'Pasteles y postres por encargo', 'direccion' => 'Av. Principal 123, Centro', 'telefono' => '+52 (899) 123-4567'])
            ->assertOk()
            ->assertJsonPath('data.descripcion', 'Pasteles y postres por encargo')
            ->assertJsonPath('data.direccion', 'Av. Principal 123, Centro')
            ->assertJsonPath('data.telefono', '+52 (899) 123-4567');

        // El cliente ve los datos nuevos en el perfil.
        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));
        $this->getJson('/api/directory/businesses/'.$this->business->id)
            ->assertOk()
            ->assertJsonPath('data.direccion', 'Av. Principal 123, Centro')
            ->assertJsonPath('data.telefono', '+52 (899) 123-4567');

        // Un campo vacio borra el dato; el nombre y el correo no cambian.
        Sanctum::actingAs($this->business->administrators()->firstOrFail());
        $this->putJson($url, ['descripcion' => '', 'direccion' => null, 'telefono' => ''])->assertOk();

        $business = $this->business->fresh();
        $this->assertNull($business->descripcion);
        $this->assertNull($business->direccion);
        $this->assertNull($business->telefono);
        $this->assertSame('Sweet Art', $business->nombre);
        $this->assertSame('sweet@example.com', $business->correo);
    }

    public function test_business_details_are_validated_and_limited_to_own_business(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $url = '/api/businesses/'.$this->business->id;

        // El telefono se vuelve un enlace para llamar en la app: no admite texto libre.
        $this->putJson($url, ['telefono' => 'llámanos al 899 123 4567'])
            ->assertStatus(422)
            ->assertJsonPath('errors.telefono.0', 'El teléfono solo puede llevar números, espacios y los signos + - ( ), y al menos 7 caracteres.');
        $this->putJson($url, ['telefono' => '12345'])->assertStatus(422);
        $this->putJson($url, ['descripcion' => str_repeat('a', 501)])
            ->assertStatus(422)
            ->assertJsonPath('errors.descripcion.0', 'La descripción no puede tener más de 500 caracteres.');
        $this->putJson($url, ['direccion' => str_repeat('a', 256)])
            ->assertStatus(422)
            ->assertJsonPath('errors.direccion.0', 'La dirección no puede tener más de 255 caracteres.');

        $this->assertSame('Pasteleria', $this->business->fresh()->descripcion);
        $this->assertNull($this->business->fresh()->telefono);

        $this->putJson('/api/businesses/'.$this->otherBusiness->id, ['descripcion' => 'Ajena'])->assertForbidden();
        $this->assertNull($this->otherBusiness->fresh()->descripcion);
    }

    public function test_logo_cannot_be_set_as_free_text_anymore(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));

        // Antes el logo era un texto editable: apuntarlo a la imagen de otro negocio permitiria borrarla al reemplazarlo.
        $this->putJson('/api/businesses/'.$this->business->id, ['descripcion' => 'Nueva', 'logo' => 'negocios/ajena.png', 'portada' => 'negocios/ajena.png'])
            ->assertOk();

        $business = $this->business->fresh();
        $this->assertSame('Nueva', $business->descripcion);
        $this->assertNull($business->logo);
        $this->assertNull($business->portada);
    }

    public function test_client_sees_public_profile_and_inactive_business_is_hidden(): void
    {
        $admin = $this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id);
        Sanctum::actingAs($admin);
        $this->post('/api/businesses/'.$this->business->id.'/cover', ['imagen' => $this->image('portada.png')], ['Accept' => 'application/json'])->assertOk();
        $this->putJson('/api/businesses/'.$this->business->id.'/links', ['enlaces' => [['nombre' => 'Facebook', 'url' => 'https://facebook.com/sweetart']]])->assertOk();

        Sanctum::actingAs($this->makeUser($this->clienteRole, 'cliente@example.com'));

        $portada = $this->business->fresh()->portada;
        $data = $this->getJson('/api/directory/businesses/'.$this->business->id)
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Sweet Art')
            ->assertJsonPath('data.portada_url', url('api/media/'.$portada))
            ->assertJsonPath('data.logo_url', null)
            ->assertJsonPath('data.enlaces.0.nombre', 'Facebook')
            ->assertJsonPath('data.productos_activos', 0)
            ->json('data');
        $this->assertArrayNotHasKey('correo', $data);

        // El listado trae las mismas direcciones para pintar las tarjetas.
        $list = $this->getJson('/api/directory/businesses')->assertOk()->json('data');
        $this->assertSame(url('api/media/'.$portada), collect($list)->firstWhere('nombre', 'Sweet Art')['portada_url']);
        $this->assertSame([], collect($list)->firstWhere('nombre', 'Cafe Aurora')['enlaces']);

        $this->otherBusiness->update(['estado' => false]);
        $this->getJson('/api/directory/businesses/'.$this->otherBusiness->id)->assertNotFound();
    }

    public function test_images_are_served_without_session_and_only_from_the_business_folder(): void
    {
        Sanctum::actingAs($this->makeUser($this->adminNegocioRole, 'negocio@example.com', $this->business->id));
        $this->post('/api/businesses/'.$this->business->id.'/logo', ['imagen' => $this->image('logo.png')], ['Accept' => 'application/json'])->assertOk();
        $logo = $this->business->fresh()->logo;
        Storage::disk('public')->put('secreto.png', 'fuera de la carpeta de negocios');

        // Una etiqueta <img> no envia el token: la imagen se entrega sin sesion.
        $this->app['auth']->forgetGuards();

        $response = $this->get('/api/media/'.$logo)->assertOk();
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('max-age=31536000', (string) $response->headers->get('Cache-Control'));
        $this->assertSame(base64_decode(self::PNG), $response->streamedContent());

        $this->get('/api/media/negocios/noexiste.png')->assertNotFound();
        $this->get('/api/media/secreto.png')->assertNotFound();
        $this->get('/api/media/negocios/..%2Fsecreto.png')->assertNotFound();
        $this->get('/api/media/negocios/archivo.svg')->assertNotFound();
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

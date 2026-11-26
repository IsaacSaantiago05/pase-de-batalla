<?php

namespace Tests\Feature\Admin;

use App\Models\Business;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdministratorManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $clienteRole;
    private Role $adminNegocioRole;
    private Role $adminGeneralRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clienteRole = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        $this->adminNegocioRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_NEGOCIO', 'estado' => true]);
        $this->adminGeneralRole = Role::query()->create(['nombre' => 'ADMINISTRADOR_GENERAL', 'estado' => true]);
    }

    public function test_admin_general_can_create_business_administrator(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Sweet Art',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'general@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $response = $this->postJson('/api/admin/administrators', [
            'nombre' => 'Admin Sweet',
            'correo' => 'admin.sweet@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'rol' => 'ADMINISTRADOR_NEGOCIO',
            'negocio_id' => $business->id,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.rol', 'ADMINISTRADOR_NEGOCIO')
            ->assertJsonPath('data.negocio_id', $business->id);
    }

    public function test_admin_general_cannot_create_business_admin_without_business(): void
    {
        $adminGeneral = User::query()->create([
            'nombre' => 'Admin General',
            'correo' => 'general2@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminGeneralRole->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminGeneral);

        $response = $this->postJson('/api/admin/administrators', [
            'nombre' => 'Admin Sin Negocio',
            'correo' => 'admin.nonbiz@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'rol' => 'ADMINISTRADOR_NEGOCIO',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_negocio_cannot_access_administrator_endpoints(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Cafe Aurora',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'negocio@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->getJson('/api/admin/administrators');

        $response->assertStatus(403);
    }

    public function test_admin_negocio_cannot_update_role_or_business_for_client(): void
    {
        $business = Business::query()->create([
            'nombre' => 'Mi Negocio',
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $adminNegocio = User::query()->create([
            'nombre' => 'Admin Negocio',
            'correo' => 'adminbiz@example.com',
            'password' => 'Password123',
            'rol_id' => $this->adminNegocioRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $client = User::query()->create([
            'nombre' => 'Cliente One',
            'correo' => 'cliente.one@example.com',
            'password' => 'Password123',
            'rol_id' => $this->clienteRole->id,
            'negocio_id' => $business->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        Sanctum::actingAs($adminNegocio);

        $response = $this->putJson('/api/users/'.$client->id, [
            'rol_id' => $this->adminGeneralRole->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_general_resets_business_admin_password_and_closes_its_sessions(): void
    {
        $business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        $general = $this->makeAdmin($this->adminGeneralRole, 'general.reset@example.com');
        $businessAdmin = $this->makeAdmin($this->adminNegocioRole, 'negocio.reset@example.com', $business->id);

        // El negocio tenia una sesion abierta en su dispositivo.
        $this->postJson('/api/auth/login', ['correo' => 'negocio.reset@example.com', 'password' => 'Password123'])->assertOk();
        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $businessAdmin->id]);

        Sanctum::actingAs($general);

        $this->putJson('/api/admin/administrators/'.$businessAdmin->id, [
            'password' => 'ClaveNueva456!',
            'password_confirmation' => 'ClaveNueva456!',
        ])
            ->assertOk()
            ->assertJsonPath('data.correo', 'negocio.reset@example.com')
            ->assertJsonPath('data.negocio_id', $business->id);

        $this->assertTrue(Hash::check('ClaveNueva456!', $businessAdmin->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $businessAdmin->id]);

        // La contrasena anterior deja de servir.
        $this->assertFalse(Hash::check('Password123', $businessAdmin->fresh()->password));
    }

    public function test_password_reset_is_validated_and_does_not_touch_other_data(): void
    {
        $business = Business::query()->create(['nombre' => 'Sweet Art', 'estado' => true, 'fecha_registro' => now()]);
        $general = $this->makeAdmin($this->adminGeneralRole, 'general.valida@example.com');
        $businessAdmin = $this->makeAdmin($this->adminNegocioRole, 'negocio.valida@example.com', $business->id);

        Sanctum::actingAs($general);

        $this->putJson('/api/admin/administrators/'.$businessAdmin->id, ['password' => 'corta', 'password_confirmation' => 'corta'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La contraseña debe tener al menos 8 caracteres.');

        // Misma regla que el resto del proyecto: mayuscula y minuscula, numero y simbolo, con mensajes en español.
        $url = '/api/admin/administrators/'.$businessAdmin->id;
        $this->putJson($url, ['password' => 'clavenueva456!', 'password_confirmation' => 'clavenueva456!'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La contraseña debe tener al menos una letra mayúscula y una minúscula.');
        $this->putJson($url, ['password' => 'ClaveNueva!!', 'password_confirmation' => 'ClaveNueva!!'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La contraseña debe tener al menos un número.');
        $this->putJson($url, ['password' => 'ClaveNueva456', 'password_confirmation' => 'ClaveNueva456'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La contraseña debe tener al menos un símbolo (por ejemplo ! @ # $).');

        // Al crear un administrador aplica igual.
        $this->postJson('/api/admin/administrators', [
            'nombre' => 'Admin Debil',
            'correo' => 'debil@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'rol' => 'ADMINISTRADOR_NEGOCIO',
            'negocio_id' => $business->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->assertDatabaseMissing('usuarios', ['correo' => 'debil@example.com']);

        $this->putJson('/api/admin/administrators/'.$businessAdmin->id, ['password' => 'ClaveNueva456!', 'password_confirmation' => 'Distinta789!'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La confirmación de la contraseña no coincide.');

        $this->assertTrue(Hash::check('Password123', $businessAdmin->fresh()->password));

        // Editar otros datos sin enviar contrasena no la cambia ni cierra sesiones.
        $businessAdmin->createToken('auth_token');
        $this->putJson('/api/admin/administrators/'.$businessAdmin->id, ['nombre' => 'Nombre Corregido'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Nombre Corregido');

        $this->assertTrue(Hash::check('Password123', $businessAdmin->fresh()->password));
        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $businessAdmin->id]);
    }

    public function test_admin_general_cannot_change_own_password_from_administrators_endpoint(): void
    {
        $general = $this->makeAdmin($this->adminGeneralRole, 'general.propia@example.com');

        Sanctum::actingAs($general);

        // Su propia contrasena va por el perfil, que exige la actual.
        $this->putJson('/api/admin/administrators/'.$general->id, [
            'password' => 'ClaveNueva456!',
            'password_confirmation' => 'ClaveNueva456!',
        ])->assertStatus(422)->assertJsonPath('success', false);

        $this->assertTrue(Hash::check('Password123', $general->fresh()->password));

        $this->putJson('/api/profile', [
            'password' => 'ClaveNueva456!',
            'password_confirmation' => 'ClaveNueva456!',
            'password_actual' => 'Password123',
        ])->assertOk();

        $this->assertTrue(Hash::check('ClaveNueva456!', $general->fresh()->password));
    }

    private function makeAdmin(Role $role, string $email, ?int $businessId = null): User
    {
        return User::query()->create([
            'nombre' => 'Admin '.$role->nombre,
            'correo' => $email,
            'password' => 'Password123',
            'rol_id' => $role->id,
            'negocio_id' => $businessId,
            'estado' => true,
            'fecha_registro' => now(),
        ]);
    }
}

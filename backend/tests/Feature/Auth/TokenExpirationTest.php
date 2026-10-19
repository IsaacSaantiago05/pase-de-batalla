<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenExpirationTest extends TestCase
{
    use RefreshDatabase;

    private function loginToken(): string
    {
        $role = Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
        User::query()->create([
            'nombre' => 'Cliente',
            'correo' => 'cliente@example.com',
            'password' => 'Password123',
            'rol_id' => $role->id,
            'estado' => true,
            'fecha_registro' => now(),
        ]);

        $token = $this->postJson('/api/auth/login', [
            'correo' => 'cliente@example.com',
            'password' => 'Password123',
        ])->assertOk()->json('data.token');

        // Auth::attempt deja al usuario en la sesion web de esta misma instancia; en produccion
        // las rutas /api no guardan sesion, asi que se limpia para validar solo el token.
        $this->app['session']->flush();
        $this->app['auth']->forgetGuards();

        return $token;
    }

    public function test_token_works_before_expiration(): void
    {
        $token = $this->loginToken();

        $this->travel(29)->days();

        $this->withToken($token)->getJson('/api/auth/me')->assertOk();
    }

    public function test_token_is_rejected_after_expiration(): void
    {
        $token = $this->loginToken();

        $this->travel(31)->days();

        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }
}

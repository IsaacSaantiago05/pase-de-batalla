<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::query()->create(['nombre' => 'CLIENTE', 'estado' => true]);
    }

    public function test_register_success(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'nombre' => 'Ana Cliente',
            'correo' => 'ana@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.correo', 'ana@example.com');

        $this->assertDatabaseHas('usuarios', ['correo' => 'ana@example.com']);
    }

    public function test_login_success(): void
    {
        $this->postJson('/api/auth/register', [
            'nombre' => 'Luis Cliente',
            'correo' => 'luis@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'correo' => 'luis@example.com',
            'password' => 'Password123!',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_register_rejects_weak_password(): void
    {
        // Varios intentos seguidos: se quita el limite de 3 registros por minuto solo en esta prueba.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        // Cada requisito que falta se explica en español.
        $cases = [
            'corta1!' => 'La contraseña debe tener al menos 8 caracteres.',
            'sinmayuscula1!' => 'La contraseña debe tener al menos una letra mayúscula y una minúscula.',
            'SINMINUSCULA1!' => 'La contraseña debe tener al menos una letra mayúscula y una minúscula.',
            'SinNumero!' => 'La contraseña debe tener al menos un número.',
            'SinSimbolo123' => 'La contraseña debe tener al menos un símbolo (por ejemplo ! @ # $).',
        ];

        foreach ($cases as $password => $message) {
            $errors = $this->postJson('/api/auth/register', [
                'nombre' => 'Debil',
                'correo' => 'debil@example.com',
                'password' => $password,
                'password_confirmation' => $password,
            ])->assertStatus(422)->assertJsonValidationErrors(['password'])->json('errors.password');

            $this->assertContains($message, $errors, "Contraseña probada: $password");
        }

        $this->assertDatabaseMissing('usuarios', ['correo' => 'debil@example.com']);
    }

    public function test_login_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'correo' => 'missing@example.com',
            'password' => 'BadPassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_access_me_without_authentication(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_reset_password_success(): void
    {
        $this->postJson('/api/auth/register', [
            'nombre' => 'Reset User',
            'correo' => 'reset.user@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $user = User::query()->where('correo', 'reset.user@example.com')->firstOrFail();
        $token = Password::broker()->createToken($user);

        $resetResponse = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'correo' => 'reset.user@example.com',
            'password' => 'Password456!',
            'password_confirmation' => 'Password456!',
        ]);

        $resetResponse
            ->assertOk()
            ->assertJsonPath('success', true);

        $loginResponse = $this->postJson('/api/auth/login', [
            'correo' => 'reset.user@example.com',
            'password' => 'Password456!',
        ]);

        $loginResponse->assertOk();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this->postJson('/api/auth/login', [
                'correo' => 'throttle@example.com',
                'password' => 'WrongPassword',
            ]);

            $response->assertStatus(422);
        }

        $limitedResponse = $this->postJson('/api/auth/login', [
            'correo' => 'throttle@example.com',
            'password' => 'WrongPassword',
        ]);

        $limitedResponse->assertStatus(429);
    }
}

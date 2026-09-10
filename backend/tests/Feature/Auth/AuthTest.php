<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
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
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'correo' => 'luis@example.com',
            'password' => 'Password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token']]);
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
}

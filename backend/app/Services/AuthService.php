<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function register(array $payload): array
    {
        $clientRole = Role::query()->where('nombre', 'CLIENTE')->firstOrFail();

        $user = DB::transaction(function () use ($payload, $clientRole) {
            return User::query()->create([
                'nombre' => $payload['nombre'],
                'correo' => $payload['correo'],
                'password' => $payload['password'],
                'rol_id' => $clientRole->id,
                'fecha_registro' => now(),
                'estado' => true,
            ]);
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return [$user->load('role'), $token];
    }

    public function login(array $payload): array
    {
        if (! Auth::attempt(['correo' => $payload['correo'], 'password' => $payload['password']])) {
            throw ValidationException::withMessages([
                'correo' => ['Credenciales inválidas.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->isActive()) {
            throw ValidationException::withMessages([
                'correo' => ['Usuario inactivo.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [$user->load('role'), $token];
    }
}

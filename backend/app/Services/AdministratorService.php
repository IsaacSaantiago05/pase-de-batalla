<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdministratorService
{
    public function createAdministrator(array $payload): User
    {
        $role = Role::query()->where('nombre', $payload['rol'])->firstOrFail();

        if ($payload['rol'] === 'ADMINISTRADOR_NEGOCIO' && empty($payload['negocio_id'])) {
            throw new InvalidArgumentException('Debes asignar un negocio para administrador de negocio.');
        }

        if ($payload['rol'] === 'ADMINISTRADOR_GENERAL') {
            $payload['negocio_id'] = null;
        }

        return DB::transaction(function () use ($payload, $role) {
            return User::query()->create([
                'nombre' => $payload['nombre'],
                'correo' => $payload['correo'],
                'password' => $payload['password'],
                'rol_id' => $role->id,
                'negocio_id' => $payload['negocio_id'] ?? null,
                'nivel_id' => null,
                'estado' => $payload['estado'] ?? true,
                'fecha_registro' => now(),
            ]);
        });
    }
}

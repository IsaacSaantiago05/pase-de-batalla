<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminGeneralSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::query()->where('nombre', 'ADMINISTRADOR_GENERAL')->first();

        if (! $role) {
            return;
        }

        User::query()->updateOrCreate(
            ['correo' => 'admin@pasedebatalla.local'],
            [
                'nombre' => 'Admin General Dev',
                'password' => 'AdminDev1234',
                'rol_id' => $role->id,
                'nivel_id' => null,
                'negocio_id' => null,
                'estado' => true,
                'fecha_registro' => now(),
            ],
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['CLIENTE', 'ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL'] as $roleName) {
            Role::query()->updateOrCreate(
                ['nombre' => $roleName],
                ['estado' => true],
            );
        }
    }
}

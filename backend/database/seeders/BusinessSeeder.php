<?php

namespace Database\Seeders;

use App\Models\Business;
use Illuminate\Database\Seeder;

class BusinessSeeder extends Seeder
{
    public function run(): void
    {
        $businesses = [
            ['nombre' => 'Sweet Art', 'descripcion' => 'Pasteleria artesanal', 'correo' => 'sweetart@example.com'],
            ['nombre' => 'Cafe Aurora', 'descripcion' => 'Cafeteria de especialidad', 'correo' => 'aurora@example.com'],
        ];

        foreach ($businesses as $business) {
            Business::query()->updateOrCreate(
                ['nombre' => $business['nombre']],
                [
                    ...$business,
                    'direccion' => null,
                    'telefono' => null,
                    'logo' => null,
                    'estado' => true,
                    'fecha_registro' => now(),
                ],
            );
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IslandElementSeeder extends Seeder
{
    public function run(): void
    {
        // nivel_requerido es el nivel del pase de batalla que pide cada pieza.
        $elements = [
            ['nombre' => 'Casa', 'categoria' => 'ESTRUCTURA', 'nivel_requerido' => 1],
            ['nombre' => 'Arbol', 'categoria' => 'DECORACION', 'nivel_requerido' => 1],
            ['nombre' => 'Perro', 'categoria' => 'MASCOTA', 'nivel_requerido' => 5],
        ];

        foreach ($elements as $element) {
            DB::table('elementos_isla')->updateOrInsert(
                ['nombre' => $element['nombre']],
                [
                    'categoria' => $element['categoria'],
                    'descripcion' => null,
                    'recurso' => null,
                    'nivel_requerido' => $element['nivel_requerido'],
                    'estado' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\Level;
use Illuminate\Database\Seeder;

class LevelSeeder extends Seeder
{
    public function run(): void
    {
        $levels = [
            ['nombre' => 'Nivel 1', 'puntos_minimos' => 0, 'puntos_maximos' => 499],
            ['nombre' => 'Nivel 2', 'puntos_minimos' => 500, 'puntos_maximos' => 999],
            ['nombre' => 'Nivel 3', 'puntos_minimos' => 1000, 'puntos_maximos' => 1499],
        ];

        foreach ($levels as $level) {
            Level::query()->updateOrCreate(
                ['nombre' => $level['nombre']],
                [...$level, 'estado' => true],
            );
        }
    }
}

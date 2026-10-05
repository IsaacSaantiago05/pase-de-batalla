<?php

namespace Database\Seeders;

use App\Models\BattlePassTier;
use Illuminate\Database\Seeder;

class BattlePassTierSeeder extends Seeder
{
    public function run(): void
    {
        $tiers = [
            [
                'nombre' => 'Explorador Inicial',
                'descripcion' => 'Primer avance del pase de batalla.',
                'puntos_requeridos' => 50,
                'recompensa_nombre' => 'Insignia Bronce',
                'recompensa_descripcion' => 'Insignia de progreso inicial.',
                'estado' => true,
            ],
            [
                'nombre' => 'Aventurero Activo',
                'descripcion' => 'Demuestras constancia en tus compras.',
                'puntos_requeridos' => 150,
                'recompensa_nombre' => 'Insignia Plata',
                'recompensa_descripcion' => 'Insignia de nivel intermedio.',
                'estado' => true,
            ],
            [
                'nombre' => 'Maestro de la Temporada',
                'descripcion' => 'Nivel alto del pase en esta temporada.',
                'puntos_requeridos' => 300,
                'recompensa_nombre' => 'Insignia Oro',
                'recompensa_descripcion' => 'Insignia de logro avanzado.',
                'estado' => true,
            ],
            [
                'nombre' => 'Leyenda del Pase',
                'descripcion' => 'Máximo tier disponible actualmente.',
                'puntos_requeridos' => 500,
                'recompensa_nombre' => 'Insignia Diamante',
                'recompensa_descripcion' => 'Recompensa tope de temporada.',
                'estado' => true,
            ],
        ];

        foreach ($tiers as $tier) {
            BattlePassTier::query()->updateOrCreate(
                ['puntos_requeridos' => $tier['puntos_requeridos']],
                $tier,
            );
        }
    }
}

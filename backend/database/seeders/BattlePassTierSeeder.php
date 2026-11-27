<?php

namespace Database\Seeders;

use App\Models\BattlePassTier;
use App\Support\LevelCurve;
use Illuminate\Database\Seeder;

class BattlePassTierSeeder extends Seeder
{
    /**
     * Carga los niveles 2 a 150 del pase con la curva de App\Support\LevelCurve.
     * Se puede ejecutar las veces que haga falta: actualiza las filas que ya existen.
     */
    public function run(): void
    {
        BattlePassTier::query()->upsert(
            LevelCurve::levels(),
            ['nivel'],
            ['puntos_requeridos', 'puntos_bono', 'insignia'],
        );
    }
}

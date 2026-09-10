<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\PointRule;
use Illuminate\Database\Seeder;

class PointRuleSeeder extends Seeder
{
    public function run(): void
    {
        $business = Business::query()->first();

        if (! $business) {
            return;
        }

        $ranges = [
            [1, 100, 10],
            [101, 250, 25],
            [251, 500, 50],
        ];

        foreach ($ranges as [$min, $max, $points]) {
            PointRule::query()->updateOrCreate(
                [
                    'negocio_id' => $business->id,
                    'monto_minimo' => $min,
                    'monto_maximo' => $max,
                ],
                [
                    'puntos' => $points,
                    'estado' => true,
                ],
            );
        }
    }
}

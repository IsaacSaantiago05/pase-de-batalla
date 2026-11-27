<?php

namespace Tests\Unit;

use App\Support\LevelCurve;
use PHPUnit\Framework\TestCase;

class LevelCurveTest extends TestCase
{
    public function test_curve_has_one_row_per_level_from_2_to_150(): void
    {
        $levels = LevelCurve::levels();

        $this->assertCount(149, $levels);
        $this->assertSame(range(2, 150), array_column($levels, 'nivel'));
    }

    public function test_required_points_match_the_agreed_curve(): void
    {
        $required = array_column(LevelCurve::levels(), 'puntos_requeridos', 'nivel');

        // Valores de control de la curva acordada: si cambian, cambia lo que cuesta cada nivel.
        $this->assertSame(
            [2 => 25, 5 => 103, 10 => 237, 25 => 672, 50 => 1514, 75 => 2515, 100 => 3687, 125 => 5041, 150 => 6586],
            array_intersect_key($required, array_flip([2, 5, 10, 25, 50, 75, 100, 125, 150])),
        );
    }

    public function test_each_level_costs_more_points_than_the_previous_one(): void
    {
        $previousRequired = 0;
        $previousCost = 0;

        foreach (LevelCurve::levels() as $level) {
            $cost = $level['puntos_requeridos'] - $previousRequired;

            $this->assertSame(LevelCurve::cost($level['nivel']), $cost);
            $this->assertGreaterThanOrEqual($previousCost, $cost, "El nivel {$level['nivel']} no puede costar menos que el anterior.");

            $previousRequired = $level['puntos_requeridos'];
            $previousCost = $cost;
        }

        $this->assertSame(25, LevelCurve::cost(2));
        $this->assertSame(66, LevelCurve::cost(150));
    }

    public function test_bonus_is_two_points_per_level_plus_the_badge_bonus(): void
    {
        $levels = array_column(LevelCurve::levels(), null, 'nivel');

        $this->assertSame(2, $levels[2]['puntos_bono']);
        $this->assertNull($levels[2]['insignia']);
        $this->assertSame(2, $levels[149]['puntos_bono']);

        $badges = array_filter(array_map(fn (array $level) => $level['insignia'], $levels));
        $this->assertSame([10 => 'BRONCE', 50 => 'PLATA', 100 => 'ORO', 150 => 'DIAMANTE'], $badges);

        $this->assertSame(17, $levels[10]['puntos_bono']);
        $this->assertSame(42, $levels[50]['puntos_bono']);
        $this->assertSame(77, $levels[100]['puntos_bono']);
        $this->assertSame(152, $levels[150]['puntos_bono']);

        // 149 niveles x 2 puntos + 15 + 40 + 75 + 150 de las insignias.
        $this->assertSame(578, array_sum(array_column($levels, 'puntos_bono')));
    }
}

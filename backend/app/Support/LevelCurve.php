<?php

namespace App\Support;

/**
 * Curva de los 150 niveles del pase de batalla. Es el unico lugar donde se define cuanto cuesta
 * cada nivel y que bono entrega: el seeder llena la tabla pase_batalla_tiers con estos valores.
 *
 * Todos empiezan en el nivel 1 con 0 puntos, por eso solo hay filas para los niveles 2 a 150.
 */
final class LevelCurve
{
    public const FIRST_LEVEL = 2;

    public const MAX_LEVEL = 150;

    /** Puntos que entrega cada nivel al reclamarlo. */
    public const POINTS_PER_LEVEL = 2;

    /**
     * Niveles con insignia y el bono adicional que suman a los puntos del nivel.
     *
     * @var array<int, array{insignia: string, bono: int}>
     */
    public const BADGES = [
        10 => ['insignia' => 'BRONCE', 'bono' => 15],
        50 => ['insignia' => 'PLATA', 'bono' => 40],
        100 => ['insignia' => 'ORO', 'bono' => 75],
        150 => ['insignia' => 'DIAMANTE', 'bono' => 150],
    ];

    /**
     * Puntos ganados que cuesta subir del nivel anterior a este: 25 al inicio y 66 al final.
     */
    public static function cost(int $level): int
    {
        return (int) round(20 * (1 + $level / self::MAX_LEVEL) ** 1.6 + 5);
    }

    public static function bonus(int $level): int
    {
        return self::POINTS_PER_LEVEL + (self::BADGES[$level]['bono'] ?? 0);
    }

    public static function badge(int $level): ?string
    {
        return self::BADGES[$level]['insignia'] ?? null;
    }

    /**
     * Las 149 filas (niveles 2 a 150) con los puntos ganados acumulados que pide cada una.
     *
     * @return list<array{nivel: int, puntos_requeridos: int, puntos_bono: int, insignia: string|null}>
     */
    public static function levels(): array
    {
        $levels = [];
        $required = 0;

        for ($level = self::FIRST_LEVEL; $level <= self::MAX_LEVEL; $level++) {
            $required += self::cost($level);

            $levels[] = [
                'nivel' => $level,
                'puntos_requeridos' => $required,
                'puntos_bono' => self::bonus($level),
                'insignia' => self::badge($level),
            ];
        }

        return $levels;
    }
}

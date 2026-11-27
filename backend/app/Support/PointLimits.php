<?php

namespace App\Support;

use App\Models\User;

/**
 * Topes de puntos, definidos en un solo lugar. El panel muestra los mismos numeros
 * (apps/admin-app/src/lib/limits.ts): si cambias uno aqui, cambialo tambien alla.
 *
 * La regla para los negocios es 1 punto por cada $10 del precio.
 */
final class PointLimits
{
    /** Maximo que un administrador de negocio puede poner a un producto (una compra de $1,500). */
    public const BUSINESS_PRODUCT_MAX = 150;

    /** Maximo absoluto de un producto: el que aplica al administrador general. */
    public const PRODUCT_MAX = 100000;

    /** Maximo de puntos que puede dar una sola venta, es decir, un solo QR (una compra de $5,000). */
    public const SALE_MAX = 500;

    public static function productMaxFor(?User $user): int
    {
        return $user?->hasRole('ADMINISTRADOR_GENERAL') ? self::PRODUCT_MAX : self::BUSINESS_PRODUCT_MAX;
    }

    /** Mensaje de validacion cuando un producto pasa del tope de quien lo guarda. */
    public static function productMaxMessage(?User $user): string
    {
        $max = number_format(self::productMaxFor($user));

        return $user?->hasRole('ADMINISTRADOR_GENERAL')
            ? "El producto no puede otorgar más de {$max} puntos."
            : "Un producto no puede otorgar más de {$max} puntos (1 punto por cada \$10 del precio). Si necesitas más, pídelo al administrador general.";
    }
}

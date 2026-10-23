<?php

namespace App\Policies\Concerns;

use App\Models\User;

trait ChecksBusinessScope
{
    /**
     * El admin general puede operar sobre cualquier negocio; el admin de negocio solo sobre el suyo.
     */
    protected function managesBusiness(User $user, ?int $businessId): bool
    {
        if ($user->hasRole('ADMINISTRADOR_GENERAL')) {
            return true;
        }

        return $user->hasRole('ADMINISTRADOR_NEGOCIO')
            && $user->negocio_id !== null
            && (int) $user->negocio_id === (int) $businessId;
    }

    /**
     * Solo el admin de negocio, y solo en su propio negocio (crear o editar contenido del catalogo).
     */
    protected function ownsBusiness(User $user, ?int $businessId): bool
    {
        return $user->hasRole('ADMINISTRADOR_NEGOCIO')
            && $user->negocio_id !== null
            && (int) $user->negocio_id === (int) $businessId;
    }
}

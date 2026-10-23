<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * El admin general gestiona a cualquiera; el admin de negocio solo a clientes de su negocio.
     */
    private function canManage(User $actor, User $target): bool
    {
        if ($actor->hasRole('ADMINISTRADOR_GENERAL')) {
            return true;
        }

        return $actor->hasRole('ADMINISTRADOR_NEGOCIO')
            && $target->negocio_id === $actor->negocio_id
            && $target->hasRole('CLIENTE');
    }

    public function view(User $actor, User $target): Response
    {
        return $this->canManage($actor, $target)
            ? Response::allow()
            : Response::deny('No tienes permiso para acceder a este usuario.');
    }

    public function update(User $actor, User $target): Response
    {
        return $this->canManage($actor, $target)
            ? Response::allow()
            : Response::deny('No tienes permiso para editar este usuario.');
    }

    public function updateStatus(User $actor, User $target): Response
    {
        return $this->canManage($actor, $target)
            ? Response::allow()
            : Response::deny('No tienes permiso para modificar este usuario.');
    }
}

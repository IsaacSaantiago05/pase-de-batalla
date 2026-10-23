<?php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;
use App\Policies\Concerns\ChecksBusinessScope;
use Illuminate\Auth\Access\Response;

class BusinessPolicy
{
    use ChecksBusinessScope;

    public function view(User $user, Business $business): Response
    {
        return $this->managesBusiness($user, $business->id)
            ? Response::allow()
            : Response::deny('No tienes permiso para acceder a este negocio.');
    }

    public function update(User $user, Business $business): Response
    {
        return $this->managesBusiness($user, $business->id)
            ? Response::allow()
            : Response::deny('No tienes permiso para editar este negocio.');
    }

    public function updateStatus(User $user, Business $business): Response
    {
        return $this->managesBusiness($user, $business->id)
            ? Response::allow()
            : Response::deny('No tienes permiso para modificar este negocio.');
    }
}

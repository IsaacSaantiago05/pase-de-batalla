<?php

namespace App\Policies;

use App\Models\Reward;
use App\Models\User;
use App\Policies\Concerns\ChecksBusinessScope;
use Illuminate\Auth\Access\Response;

class RewardPolicy
{
    use ChecksBusinessScope;

    public function view(User $user, Reward $reward): Response
    {
        // El cliente solo ve recompensas activas de negocios activos; si no, se responde como inexistente.
        $visible = $user->hasRole('CLIENTE')
            ? ($reward->estado && $reward->business?->estado)
            : $this->managesBusiness($user, $reward->negocio_id);

        return $visible
            ? Response::allow()
            : Response::denyAsNotFound('La recompensa no existe o no está disponible.');
    }

    public function update(User $user, Reward $reward): Response
    {
        return $this->managesBusiness($user, $reward->negocio_id)
            ? Response::allow()
            : Response::deny('No puedes editar recompensas de otro negocio.');
    }

    public function updateStatus(User $user, Reward $reward): Response
    {
        return $this->managesBusiness($user, $reward->negocio_id)
            ? Response::allow()
            : Response::deny('No puedes modificar recompensas de otro negocio.');
    }
}

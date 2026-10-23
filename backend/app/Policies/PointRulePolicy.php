<?php

namespace App\Policies;

use App\Models\PointRule;
use App\Models\User;
use App\Policies\Concerns\ChecksBusinessScope;
use Illuminate\Auth\Access\Response;

class PointRulePolicy
{
    use ChecksBusinessScope;

    public function update(User $user, PointRule $pointRule): Response
    {
        return $this->managesBusiness($user, $pointRule->negocio_id)
            ? Response::allow()
            : Response::deny('No puedes modificar reglas de otro negocio.');
    }

    public function updateStatus(User $user, PointRule $pointRule): Response
    {
        return $this->update($user, $pointRule);
    }
}

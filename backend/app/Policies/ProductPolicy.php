<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use App\Policies\Concerns\ChecksBusinessScope;
use Illuminate\Auth\Access\Response;

class ProductPolicy
{
    use ChecksBusinessScope;

    public function update(User $user, Product $product): Response
    {
        return $this->ownsBusiness($user, $product->negocio_id)
            ? Response::allow()
            : Response::deny('No puedes editar productos de otro negocio.');
    }

    public function updateStatus(User $user, Product $product): Response
    {
        return $this->managesBusiness($user, $product->negocio_id)
            ? Response::allow()
            : Response::deny('No puedes modificar productos de otro negocio.');
    }
}

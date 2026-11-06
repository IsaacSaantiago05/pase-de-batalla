<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    use ApiResponse;

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = collect($request->validated())->only(['nombre', 'correo', 'password'])->all();

        $user->update($data);

        if (array_key_exists('password', $data)) {
            // Cierra las demas sesiones abiertas al cambiar la contrasena.
            $current = $user->currentAccessToken();
            $user->tokens()->when($current?->id, fn ($query, $id) => $query->where('id', '!=', $id))->delete();
        }

        return $this->success('Perfil actualizado correctamente.', new UserResource($user->fresh()->load('role')));
    }
}

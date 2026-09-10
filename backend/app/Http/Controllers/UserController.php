<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponse;

    private function canBusinessAdminManageUser(Request $request, User $user): bool
    {
        if (! $request->user()->hasRole('ADMINISTRADOR_NEGOCIO')) {
            return true;
        }

        if ($user->negocio_id !== $request->user()->negocio_id) {
            return false;
        }

        return $user->hasRole('CLIENTE');
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->user()->hasRole('ADMINISTRADOR_GENERAL')) {
            $users = User::query()->with(['role', 'business'])->paginate(20);

            return $this->success('Usuarios listados correctamente.', UserResource::collection($users));
        }

        $users = User::query()
            ->with(['role', 'business'])
            ->where('negocio_id', $request->user()->negocio_id)
            ->paginate(20);

        return $this->success('Usuarios listados correctamente.', UserResource::collection($users));
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if (! $this->canBusinessAdminManageUser($request, $user)) {
            return $this->error('No tienes permiso para acceder a este usuario.', null, 403);
        }

        return $this->success('Usuario obtenido correctamente.', new UserResource($user->load(['role', 'business'])));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        if (! $this->canBusinessAdminManageUser($request, $user)) {
            return $this->error('No tienes permiso para editar este usuario.', null, 403);
        }

        $data = $request->validated();

        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && (array_key_exists('rol_id', $data) || array_key_exists('negocio_id', $data))) {
            return $this->error('No puedes modificar rol o negocio de un usuario.', null, 403);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return $this->success('Usuario actualizado correctamente.', new UserResource($user->fresh()->load(['role', 'business'])));
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        if (! $this->canBusinessAdminManageUser($request, $user)) {
            return $this->error('No tienes permiso para modificar este usuario.', null, 403);
        }

        $user->update(['estado' => $validated['estado']]);

        return $this->success('Estado de usuario actualizado correctamente.', new UserResource($user->fresh()->load(['role', 'business'])));
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
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

        if (! $user->hasRole('CLIENTE')) {
            return false;
        }

        return $this->businessClientsQuery((int) $request->user()->negocio_id)
            ->whereKey($user->id)
            ->exists();
    }

    /**
     * Los clientes no pertenecen a un negocio; se consideran clientes de un negocio
     * quienes tienen movimientos de puntos en él (o el negocio asignado, por compatibilidad).
     */
    private function businessClientsQuery(int $businessId): Builder
    {
        return User::query()
            ->whereHas('role', fn (Builder $query) => $query->where('nombre', 'CLIENTE'))
            ->where(function (Builder $query) use ($businessId): void {
                $query->where('negocio_id', $businessId)
                    ->orWhereExists(function ($movements) use ($businessId): void {
                        $movements->selectRaw('1')
                            ->from('movimientos_puntos')
                            ->whereColumn('movimientos_puntos.usuario_id', 'usuarios.id')
                            ->where('movimientos_puntos.negocio_id', $businessId);
                    });
            });
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->user()->hasRole('ADMINISTRADOR_GENERAL')) {
            $users = User::query()->with(['role', 'business'])->paginate(20);

            return $this->success('Usuarios listados correctamente.', UserResource::collection($users));
        }

        $users = $this->businessClientsQuery((int) $request->user()->negocio_id)
            ->with(['role', 'business'])
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

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $restrictedFields = ['rol_id', 'negocio_id', 'password'];
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && array_intersect($restrictedFields, array_keys($data)) !== []) {
            return $this->error('No puedes modificar rol, negocio ni contraseña de un usuario.', null, 403);
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

<?php

namespace App\Http\Controllers;

use App\Http\Requests\Admin\StoreAdministratorRequest;
use App\Http\Requests\Admin\UpdateAdministratorRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AdministratorService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdministratorController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AdministratorService $administratorService)
    {
    }

    public function index(): JsonResponse
    {
        $roleIds = Role::query()
            ->whereIn('nombre', ['ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL'])
            ->pluck('id');

        $administrators = User::query()
            ->whereIn('rol_id', $roleIds)
            ->with(['role', 'business'])
            ->paginate(20);

        return $this->success('Administradores listados correctamente.', UserResource::collection($administrators));
    }

    public function store(StoreAdministratorRequest $request): JsonResponse
    {
        try {
            $admin = $this->administratorService->createAdministrator($request->validated());
        } catch (InvalidArgumentException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Administrador creado correctamente.', new UserResource($admin->load(['role', 'business'])), 201);
    }

    public function show(User $administrator): JsonResponse
    {
        if (! $administrator->hasRole('ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL')) {
            return $this->error('El usuario solicitado no es administrador.', null, 404);
        }

        return $this->success('Administrador obtenido correctamente.', new UserResource($administrator->load(['role', 'business'])));
    }

    public function update(UpdateAdministratorRequest $request, User $administrator): JsonResponse
    {
        if (! $administrator->hasRole('ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL')) {
            return $this->error('El usuario solicitado no es administrador.', null, 404);
        }

        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($administrator->hasRole('ADMINISTRADOR_GENERAL')) {
            $data['negocio_id'] = null;
        }

        $administrator->update($data);

        return $this->success('Administrador actualizado correctamente.', new UserResource($administrator->fresh()->load(['role', 'business'])));
    }

    public function updateStatus(Request $request, User $administrator): JsonResponse
    {
        if (! $administrator->hasRole('ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL')) {
            return $this->error('El usuario solicitado no es administrador.', null, 404);
        }

        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $administrator->update([
            'estado' => $validated['estado'],
        ]);

        return $this->success('Estado de administrador actualizado correctamente.', new UserResource($administrator->fresh()->load(['role', 'business'])));
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\Rewards\StoreRewardRequest;
use App\Http\Requests\Rewards\UpdateRewardRequest;
use App\Http\Resources\RewardResource;
use App\Models\Reward;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class RewardController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        $query = Reward::query()->with('business')->orderByDesc('id');

        if ($actor->hasRole('CLIENTE')) {
            $query->where('estado', true)->where('cantidad_disponible', '>', 0);
            if ($request->filled('negocio_id')) {
                $query->where('negocio_id', $request->integer('negocio_id'));
            }
        } elseif ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->where('negocio_id', $actor->negocio_id);
        } elseif ($request->filled('negocio_id')) {
            $query->where('negocio_id', $request->integer('negocio_id'));
        }

        return $this->success('Recompensas obtenidas correctamente.', RewardResource::collection($query->paginate(20)));
    }

    public function store(StoreRewardRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $businessId = $this->resolveBusinessId($request, $validated['negocio_id'] ?? null);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        $reward = Reward::query()->create([
            'negocio_id' => $businessId,
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'puntos_requeridos' => (int) $validated['puntos_requeridos'],
            'cantidad_disponible' => (int) $validated['cantidad_disponible'],
            'estado' => array_key_exists('estado', $validated) ? (bool) $validated['estado'] : true,
        ]);

        return $this->success('Recompensa creada correctamente.', new RewardResource($reward->load('business')), 201);
    }

    public function update(UpdateRewardRequest $request, Reward $reward): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $reward->negocio_id) {
            return $this->error('No puedes editar recompensas de otro negocio.', null, 403);
        }

        $validated = $request->validated();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && array_key_exists('negocio_id', $validated)) {
            unset($validated['negocio_id']);
        }

        $reward->update($validated);

        return $this->success('Recompensa actualizada correctamente.', new RewardResource($reward->fresh()->load('business')));
    }

    public function updateStatus(Request $request, Reward $reward): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $reward->negocio_id) {
            return $this->error('No puedes modificar recompensas de otro negocio.', null, 403);
        }

        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $reward->update([
            'estado' => (bool) $validated['estado'],
        ]);

        return $this->success('Estado de recompensa actualizado correctamente.', new RewardResource($reward->fresh()->load('business')));
    }

    private function resolveBusinessId(Request $request, int|string|null $requestedBusinessId): int
    {
        $actor = $request->user();

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            if ($actor->negocio_id === null) {
                throw new RuntimeException('El administrador no tiene negocio asignado.');
            }

            if ($requestedBusinessId !== null && (int) $requestedBusinessId !== (int) $actor->negocio_id) {
                throw new RuntimeException('No puedes crear recompensas para otro negocio.');
            }

            return (int) $actor->negocio_id;
        }

        if ($requestedBusinessId === null || (int) $requestedBusinessId <= 0) {
            throw new RuntimeException('Debes indicar un negocio para crear la recompensa.');
        }

        return (int) $requestedBusinessId;
    }
}

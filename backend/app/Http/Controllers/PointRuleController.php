<?php

namespace App\Http\Controllers;

use App\Http\Requests\Points\StorePointRuleRequest;
use App\Http\Requests\Points\UpdatePointRuleRequest;
use App\Http\Resources\Points\PointRuleResource;
use App\Models\PointRule;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PointRuleController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $rules = PointRule::query()
                ->where('negocio_id', $actor->negocio_id)
                ->orderBy('monto_minimo')
                ->paginate(20);

            return $this->success('Reglas de puntos obtenidas correctamente.', PointRuleResource::collection($rules));
        }

        $query = PointRule::query()->orderBy('negocio_id')->orderBy('monto_minimo');
        if ($request->filled('negocio_id')) {
            $query->where('negocio_id', $request->integer('negocio_id'));
        }

        return $this->success('Reglas de puntos obtenidas correctamente.', PointRuleResource::collection($query->paginate(20)));
    }

    public function store(StorePointRuleRequest $request): JsonResponse
    {
        $rule = PointRule::query()->create([
            ...$request->validated(),
            'estado' => $request->validated()['estado'] ?? true,
        ]);

        return $this->success('Regla de puntos creada correctamente.', new PointRuleResource($rule), 201);
    }

    public function update(UpdatePointRuleRequest $request, PointRule $pointRule): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $pointRule->negocio_id) {
            return $this->error('No puedes modificar reglas de otro negocio.', null, 403);
        }

        $pointRule->update($request->validated());

        return $this->success('Regla de puntos actualizada correctamente.', new PointRuleResource($pointRule->fresh()));
    }

    public function updateStatus(Request $request, PointRule $pointRule): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $pointRule->negocio_id) {
            return $this->error('No puedes modificar reglas de otro negocio.', null, 403);
        }

        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $pointRule->update([
            'estado' => $validated['estado'],
        ]);

        return $this->success('Estado de regla actualizado correctamente.', new PointRuleResource($pointRule->fresh()));
    }
}

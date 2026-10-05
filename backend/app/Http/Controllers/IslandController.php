<?php

namespace App\Http\Controllers;

use App\Http\Requests\Island\UnlockIslandElementRequest;
use App\Http\Requests\Island\UpdateIslandLayoutRequest;
use App\Services\IslandService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class IslandController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly IslandService $islandService)
    {
    }

    public function catalog(Request $request): JsonResponse
    {
        $catalog = $this->islandService->getCatalog($request->user());

        return $this->success('Catalogo de isla obtenido correctamente.', [
            'elementos' => $catalog,
        ]);
    }

    public function layout(Request $request): JsonResponse
    {
        $layout = $this->islandService->getLayout($request->user());

        return $this->success('Configuracion de isla obtenida correctamente.', [
            'items' => $layout,
        ]);
    }

    public function unlock(UnlockIslandElementRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->islandService->unlockElement($request->user(), (int) $validated['elemento_id']);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        return $this->success(
            $result['created'] ? 'Elemento desbloqueado correctamente.' : 'El elemento ya estaba desbloqueado.',
            [
                'usuario_id' => $result['unlock']->usuario_id,
                'elemento_id' => $result['unlock']->elemento_id,
                'fecha_desbloqueo' => $result['unlock']->fecha_desbloqueo,
            ],
            $result['created'] ? 201 : 200,
        );
    }

    public function updateLayout(UpdateIslandLayoutRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $configuration = $this->islandService->updateLayout(
                $request->user(),
                (int) $validated['elemento_id'],
                (float) $validated['posicion_x'],
                (float) $validated['posicion_y'],
                isset($validated['posicion_z']) ? (float) $validated['posicion_z'] : null,
            );
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Posicion del elemento actualizada correctamente.', [
            'id' => $configuration->id,
            'elemento_id' => $configuration->elemento_id,
            'posicion_x' => (float) $configuration->posicion_x,
            'posicion_y' => (float) $configuration->posicion_y,
            'posicion_z' => $configuration->posicion_z !== null ? (float) $configuration->posicion_z : null,
            'estado' => (bool) $configuration->estado,
        ], 201);
    }
}

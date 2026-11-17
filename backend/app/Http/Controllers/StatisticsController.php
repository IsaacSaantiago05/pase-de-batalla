<?php

namespace App\Http\Controllers;

use App\Services\StatisticsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatisticsController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly StatisticsService $statisticsService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'negocio_id' => ['nullable', 'integer', 'exists:negocios,id'],
        ]);

        $actor = $request->user();
        $isGeneral = $actor->hasRole('ADMINISTRADOR_GENERAL');

        // El admin de negocio siempre ve solo su negocio, aunque envie otro negocio_id.
        $businessId = $isGeneral
            ? (isset($validated['negocio_id']) ? (int) $validated['negocio_id'] : null)
            : (int) $actor->negocio_id;

        if (! $isGeneral && $businessId <= 0) {
            return $this->error('El administrador no tiene negocio asignado.', null, 422);
        }

        // Los clientes activos son exclusivos del administrador general.
        $data = $this->statisticsService->summary($businessId, $isGeneral);

        return $this->success('Estadísticas obtenidas correctamente.', $data);
    }
}

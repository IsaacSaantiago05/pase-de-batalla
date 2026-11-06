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
            'dias' => ['nullable', 'integer', 'min:7', 'max:90'],
            'negocio_id' => ['nullable', 'integer', 'exists:negocios,id'],
        ]);

        $actor = $request->user();
        // El admin de negocio siempre ve solo su negocio, aunque envie otro negocio_id.
        $businessId = $actor->hasRole('ADMINISTRADOR_NEGOCIO')
            ? (int) $actor->negocio_id
            : (isset($validated['negocio_id']) ? (int) $validated['negocio_id'] : null);

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $businessId <= 0) {
            return $this->error('El administrador no tiene negocio asignado.', null, 422);
        }

        $data = $this->statisticsService->summary($businessId, (int) ($validated['dias'] ?? 30));

        return $this->success('Estadísticas obtenidas correctamente.', $data);
    }
}

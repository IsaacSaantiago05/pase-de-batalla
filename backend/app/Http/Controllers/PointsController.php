<?php

namespace App\Http\Controllers;

use App\Http\Requests\Points\AwardPointsRequest;
use App\Http\Resources\Points\PointMovementResource;
use App\Models\User;
use App\Services\PointsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class PointsController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly PointsService $pointsService)
    {
    }

    public function balance(Request $request): JsonResponse
    {
        $user = $request->user();
        $balance = $this->pointsService->getUserBalance($user);

        return $this->success('Saldo global obtenido correctamente.', [
            'usuario_id' => $user->id,
            'saldo_global' => $balance,
            'nivel_id' => $user->nivel_id,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $history = $this->pointsService->getUserHistory($request->user());

        return $this->success('Historial de puntos obtenido correctamente.', PointMovementResource::collection($history));
    }

    public function businessHistory(Request $request): JsonResponse
    {
        $actor = $request->user();
        $businessId = $actor->hasRole('ADMINISTRADOR_GENERAL')
            ? (int) ($request->query('negocio_id', 0) ?: 0)
            : (int) ($actor->negocio_id ?? 0);

        if ($businessId === 0) {
            return $this->error('Debes indicar un negocio para consultar historial.', null, 422);
        }

        $history = $this->pointsService->getBusinessHistory($businessId);

        return $this->success('Historial de puntos del negocio obtenido correctamente.', PointMovementResource::collection($history));
    }

    public function award(AwardPointsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $movement = $this->pointsService->awardPointsByRule(
                $request->user(),
                (int) $validated['usuario_id'],
                (int) $validated['regla_puntos_id'],
            );
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        $targetUser = User::query()->findOrFail($validated['usuario_id']);

        return $this->success('Puntos agregados correctamente.', [
            'movimiento' => new PointMovementResource($movement),
            'saldo_global' => $this->pointsService->getUserBalance($targetUser),
            'nivel_id' => $targetUser->nivel_id,
        ], 201);
    }
}

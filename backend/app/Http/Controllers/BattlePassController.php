<?php

namespace App\Http\Controllers;

use App\Models\BattlePassTier;
use App\Services\BattlePassService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class BattlePassController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly BattlePassService $battlePassService)
    {
    }

    public function progress(Request $request): JsonResponse
    {
        $progress = $this->battlePassService->getProgress($request->user());

        return $this->success('Progreso del pase de batalla obtenido correctamente.', $progress);
    }

    public function claim(Request $request, BattlePassTier $tier): JsonResponse
    {
        try {
            $claim = $this->battlePassService->claimTier($request->user(), $tier);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Nivel reclamado correctamente.', [
            'usuario_id' => $request->user()->id,
            'tier_id' => $tier->id,
            'nivel' => $tier->nivel,
            'estado' => 'RECLAMADO',
            ...$claim,
        ], 201);
    }

    public function claimAll(Request $request): JsonResponse
    {
        try {
            $claim = $this->battlePassService->claimAll($request->user());
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        $message = $claim['niveles_reclamados'] > 0
            ? 'Niveles reclamados correctamente.'
            : 'No tienes niveles por reclamar.';

        return $this->success($message, $claim);
    }
}

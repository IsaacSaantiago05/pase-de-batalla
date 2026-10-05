<?php

namespace App\Http\Controllers;

use App\Models\BattlePassTier;
use App\Services\BattlePassService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
            $claim = $this->battlePassService->claimTier($request->user(), $tier->id);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        return $this->success('Tier reclamado correctamente.', [
            'usuario_id' => $claim->usuario_id,
            'tier_id' => $claim->tier_id,
            'estado' => $claim->estado,
            'fecha_reclamo' => $claim->fecha_reclamo,
        ], 201);
    }
}

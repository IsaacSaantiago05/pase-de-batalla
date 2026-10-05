<?php

namespace App\Http\Controllers;

use App\Http\Requests\Rewards\StoreRedemptionRequest;
use App\Http\Requests\Rewards\UpdateRedemptionStatusRequest;
use App\Http\Resources\RedemptionResource;
use App\Models\Redemption;
use App\Services\PointsService;
use App\Services\RedemptionService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class RedemptionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly RedemptionService $redemptionService,
        private readonly PointsService $pointsService,
    ) {
    }

    public function myHistory(Request $request): JsonResponse
    {
        $rows = Redemption::query()
            ->with(['reward'])
            ->where('usuario_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate(20);

        return $this->success('Historial de canjes obtenido correctamente.', RedemptionResource::collection($rows));
    }

    public function businessHistory(Request $request): JsonResponse
    {
        $actor = $request->user();

        $query = Redemption::query()
            ->with(['reward', 'user'])
            ->orderByDesc('id');

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->whereHas('reward', fn ($subQuery) => $subQuery->where('negocio_id', $actor->negocio_id));
        } elseif ($request->filled('negocio_id')) {
            $businessId = $request->integer('negocio_id');
            $query->whereHas('reward', fn ($subQuery) => $subQuery->where('negocio_id', $businessId));
        }

        return $this->success('Canjes del negocio obtenidos correctamente.', RedemptionResource::collection($query->paginate(20)));
    }

    public function store(StoreRedemptionRequest $request): JsonResponse
    {
        try {
            $redemption = $this->redemptionService->create(
                $request->user(),
                (int) $request->validated()['recompensa_id'],
            );
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        $currentUser = $request->user()->fresh();

        return $this->success('Canje creado correctamente.', [
            'canje' => new RedemptionResource($redemption),
            'saldo_global' => $this->pointsService->getUserBalance($currentUser),
            'nivel_id' => $currentUser->nivel_id,
        ], 201);
    }

    public function updateStatus(UpdateRedemptionStatusRequest $request, Redemption $redemption): JsonResponse
    {
        $validated = $request->validated();

        try {
            $updated = $this->redemptionService->updateStatus(
                $request->user(),
                $redemption->id,
                $validated['estado'],
            );
        } catch (AuthorizationException $exception) {
            return $this->error($exception->getMessage(), null, 403);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        return $this->success('Estado de canje actualizado correctamente.', new RedemptionResource($updated));
    }
}

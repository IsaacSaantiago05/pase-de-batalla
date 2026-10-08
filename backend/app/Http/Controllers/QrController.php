<?php

namespace App\Http\Controllers;

use App\Http\Requests\Points\GenerateQrRequest;
use App\Http\Requests\Points\RedeemQrRequest;
use App\Http\Resources\Points\PointMovementResource;
use App\Http\Resources\Points\QrCodeResource;
use App\Services\PointsService;
use App\Services\QrService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class QrController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly QrService $qrService,
        private readonly PointsService $pointsService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $businessId = $request->filled('negocio_id') ? (int) $request->query('negocio_id') : null;

        $codes = $this->qrService->listForActor($actor, $businessId);

        return $this->success('Códigos QR obtenidos correctamente.', QrCodeResource::collection($codes));
    }

    public function show(Request $request, int $qrCode): JsonResponse
    {
        try {
            $code = $this->qrService->getForActor($request->user(), $qrCode);
        } catch (AuthorizationException $exception) {
            return $this->error($exception->getMessage(), null, 403);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        return $this->success('Código QR obtenido correctamente.', new QrCodeResource($code));
    }

    public function image(Request $request, int $qrCode): JsonResponse
    {
        try {
            $payload = $this->qrService->getImagePayloadForActor($request->user(), $qrCode);
        } catch (AuthorizationException $exception) {
            return $this->error($exception->getMessage(), null, 403);
        } catch (ModelNotFoundException $exception) {
            return $this->error($exception->getMessage(), null, 404);
        }

        return $this->success('Imagen QR generada correctamente.', $payload);
    }

    public function generate(GenerateQrRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $qrCode = $this->qrService->generate(
                $request->user(),
                (int) $validated['puntos'],
                isset($validated['negocio_id']) ? (int) $validated['negocio_id'] : null,
            );
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Código QR generado correctamente.', new QrCodeResource($qrCode), 201);
    }

    public function redeem(RedeemQrRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $movement = $this->qrService->redeem($request->user(), $validated['token']);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Código QR canjeado correctamente.', [
            'movimiento' => new PointMovementResource($movement),
            'saldo_global' => $this->pointsService->getUserBalance($request->user()),
            'nivel_id' => $request->user()->fresh()->nivel_id,
        ], 201);
    }
}

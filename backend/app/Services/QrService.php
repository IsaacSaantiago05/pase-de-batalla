<?php

namespace App\Services;

use App\Models\PointMovement;
use App\Models\QrCode;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class QrService
{
    public function __construct(private readonly PointsService $pointsService)
    {
    }

    public function listForActor(User $actor, ?int $businessId, int $perPage = 20): LengthAwarePaginator
    {
        $query = QrCode::query()->orderByDesc('id');

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->where('negocio_id', $actor->negocio_id);
        } elseif ($businessId !== null) {
            $query->where('negocio_id', $businessId);
        }

        return $query->paginate($perPage);
    }

    public function getForActor(User $actor, int $qrCodeId): QrCode
    {
        $qrCode = QrCode::query()->find($qrCodeId);
        if ($qrCode === null) {
            throw new ModelNotFoundException('El código QR no existe.');
        }

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $qrCode->negocio_id) {
            throw new AuthorizationException('No puedes consultar QR de otro negocio.');
        }

        return $qrCode;
    }

    public function generate(User $actor, int $points, ?int $businessId = null, ?Carbon $expiresAt = null): QrCode
    {
        $resolvedBusinessId = $this->resolveBusinessId($actor, $businessId);

        return QrCode::query()->create([
            'negocio_id' => $resolvedBusinessId,
            'token' => $this->generateUniqueToken(),
            'puntos' => $points,
            'estado' => 'ACTIVO',
            'fecha_creacion' => now(),
            'fecha_expiracion' => $expiresAt,
            'fecha_uso' => null,
            'usuario_id' => null,
        ]);
    }

    public function redeem(User $actor, string $token): PointMovement
    {
        $preloadedQrCode = QrCode::query()->where('token', $token)->first();
        if ($preloadedQrCode !== null
            && $preloadedQrCode->estado === 'ACTIVO'
            && $preloadedQrCode->fecha_expiracion !== null
            && $preloadedQrCode->fecha_expiracion->lessThanOrEqualTo(now())) {
            $preloadedQrCode->update([
                'estado' => 'EXPIRADO',
            ]);

            throw new RuntimeException('El código QR está expirado.');
        }

        return DB::transaction(function () use ($actor, $token) {
            $qrCode = QrCode::query()->where('token', $token)->lockForUpdate()->first();

            if ($qrCode === null) {
                throw new RuntimeException('El código QR no existe.');
            }

            if ($qrCode->estado === 'UTILIZADO') {
                throw new RuntimeException('El código QR ya fue utilizado.');
            }

            if ($qrCode->estado === 'CANCELADO') {
                throw new RuntimeException('El código QR está cancelado.');
            }

            if ($qrCode->estado === 'EXPIRADO') {
                throw new RuntimeException('El código QR está expirado.');
            }

            if ($qrCode->fecha_expiracion !== null && $qrCode->fecha_expiracion->isPast()) {
                throw new RuntimeException('El código QR está expirado.');
            }

            $qrCode->update([
                'estado' => 'UTILIZADO',
                'fecha_uso' => now(),
                'usuario_id' => $actor->id,
            ]);

            $movement = PointMovement::query()->create([
                'usuario_id' => $actor->id,
                'negocio_id' => $qrCode->negocio_id,
                'qr_id' => $qrCode->id,
                'cantidad' => $qrCode->puntos,
                'tipo' => 'GANANCIA',
                'fecha' => now(),
            ]);

            $newBalance = $this->pointsService->getUserBalance($actor);
            $this->pointsService->syncUserLevel($actor, $newBalance);

            return $movement;
        });
    }

    private function resolveBusinessId(User $actor, ?int $businessId): int
    {
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            if ($actor->negocio_id === null) {
                throw new RuntimeException('El administrador no tiene negocio asignado.');
            }

            if ($businessId !== null && $businessId !== (int) $actor->negocio_id) {
                throw new RuntimeException('No puedes generar QR para otro negocio.');
            }

            return (int) $actor->negocio_id;
        }

        if ($businessId === null || $businessId <= 0) {
            throw new RuntimeException('Debes indicar un negocio para generar el código QR.');
        }

        return $businessId;
    }

    private function generateUniqueToken(): string
    {
        do {
            $token = Str::upper(Str::random(48));
        } while (QrCode::query()->where('token', $token)->exists());

        return $token;
    }
}

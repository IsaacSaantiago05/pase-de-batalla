<?php

namespace App\Services;

use App\Models\PointMovement;
use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RedemptionService
{
    public function __construct(private readonly PointsService $pointsService)
    {
    }

    public function create(User $client, int $rewardId): Redemption
    {
        return DB::transaction(function () use ($client, $rewardId) {
            $lockedClient = User::query()->lockForUpdate()->findOrFail($client->id);
            $reward = Reward::query()->lockForUpdate()->find($rewardId);

            if ($reward === null) {
                throw new ModelNotFoundException('La recompensa no existe.');
            }

            if (! $reward->estado) {
                throw new RuntimeException('La recompensa no está activa.');
            }

            if ($reward->cantidad_disponible < 1) {
                throw new RuntimeException('La recompensa no tiene stock disponible.');
            }

            $balance = $this->pointsService->getUserBalance($lockedClient);
            if ($balance < $reward->puntos_requeridos) {
                throw new RuntimeException('No tienes puntos suficientes para canjear esta recompensa.');
            }

            $reward->decrement('cantidad_disponible', 1);

            $redemption = Redemption::query()->create([
                'usuario_id' => $lockedClient->id,
                'recompensa_id' => $reward->id,
                'puntos_utilizados' => $reward->puntos_requeridos,
                'estado' => 'PENDIENTE',
                'fecha' => now(),
            ]);

            PointMovement::query()->create([
                'usuario_id' => $lockedClient->id,
                'negocio_id' => $reward->negocio_id,
                'qr_id' => null,
                'cantidad' => -1 * (int) $reward->puntos_requeridos,
                'tipo' => 'CANJE',
                'fecha' => now(),
            ]);

            $newBalance = $balance - (int) $reward->puntos_requeridos;
            $this->pointsService->syncUserLevel($lockedClient, $newBalance);

            return $redemption->load(['reward', 'user']);
        });
    }

    public function updateStatus(User $actor, int $redemptionId, string $newStatus): Redemption
    {
        return DB::transaction(function () use ($actor, $redemptionId, $newStatus) {
            $redemption = Redemption::query()
                ->with('reward')
                ->lockForUpdate()
                ->find($redemptionId);

            if ($redemption === null) {
                throw new ModelNotFoundException('El canje no existe.');
            }

            if ($redemption->reward === null) {
                throw new RuntimeException('El canje no tiene recompensa asociada.');
            }

            if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $redemption->reward->negocio_id) {
                throw new AuthorizationException('No puedes gestionar canjes de otro negocio.');
            }

            if ($redemption->estado === $newStatus) {
                return $redemption->load(['reward', 'user']);
            }

            if (! $this->isValidTransition($redemption->estado, $newStatus)) {
                throw new RuntimeException('Transición de estado no permitida.');
            }

            $redemption->update([
                'estado' => $newStatus,
            ]);

            if ($newStatus === 'CANCELADO') {
                $lockedReward = Reward::query()->lockForUpdate()->findOrFail($redemption->recompensa_id);
                $lockedClient = User::query()->lockForUpdate()->findOrFail($redemption->usuario_id);

                $lockedReward->increment('cantidad_disponible', 1);

                PointMovement::query()->create([
                    'usuario_id' => $lockedClient->id,
                    'negocio_id' => $lockedReward->negocio_id,
                    'qr_id' => null,
                    'cantidad' => (int) $redemption->puntos_utilizados,
                    'tipo' => 'AJUSTE',
                    'fecha' => now(),
                ]);

                $newBalance = $this->pointsService->getUserBalance($lockedClient);
                $this->pointsService->syncUserLevel($lockedClient, $newBalance);
            }

            return $redemption->fresh()->load(['reward', 'user']);
        });
    }

    private function isValidTransition(string $currentStatus, string $nextStatus): bool
    {
        $map = [
            'PENDIENTE' => ['CONFIRMADO', 'COMPLETADO', 'CANCELADO'],
            'CONFIRMADO' => ['COMPLETADO', 'CANCELADO'],
            'COMPLETADO' => [],
            'CANCELADO' => [],
        ];

        return in_array($nextStatus, $map[$currentStatus] ?? [], true);
    }
}

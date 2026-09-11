<?php

namespace App\Services;

use App\Models\Level;
use App\Models\PointMovement;
use App\Models\PointRule;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PointsService
{
    public function getUserBalance(User $user): int
    {
        return (int) PointMovement::query()
            ->where('usuario_id', $user->id)
            ->sum('cantidad');
    }

    public function getUserHistory(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return PointMovement::query()
            ->where('usuario_id', $user->id)
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function getBusinessHistory(int $businessId, int $perPage = 20): LengthAwarePaginator
    {
        return PointMovement::query()
            ->where('negocio_id', $businessId)
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function awardPointsByRule(User $actor, int $targetUserId, int $pointRuleId): PointMovement
    {
        return DB::transaction(function () use ($actor, $targetUserId, $pointRuleId) {
            $targetUser = User::query()->lockForUpdate()->findOrFail($targetUserId);
            $rule = PointRule::query()->lockForUpdate()->findOrFail($pointRuleId);

            if (! $rule->estado) {
                throw new RuntimeException('La regla de puntos no está activa.');
            }

            if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $rule->negocio_id) {
                throw new RuntimeException('No puedes utilizar reglas de otro negocio.');
            }

            $movement = PointMovement::query()->create([
                'usuario_id' => $targetUser->id,
                'negocio_id' => $rule->negocio_id,
                'qr_id' => null,
                'cantidad' => $rule->puntos,
                'tipo' => 'GANANCIA',
                'fecha' => now(),
            ]);

            $newBalance = $this->getUserBalance($targetUser);
            $this->syncUserLevel($targetUser, $newBalance);

            return $movement;
        });
    }

    public function syncUserLevel(User $user, ?int $currentBalance = null): void
    {
        $balance = $currentBalance ?? $this->getUserBalance($user);

        $level = Level::query()
            ->where('estado', true)
            ->where('puntos_minimos', '<=', $balance)
            ->where('puntos_maximos', '>=', $balance)
            ->orderByDesc('puntos_minimos')
            ->first();

        $user->update([
            'nivel_id' => $level?->id,
        ]);
    }
}

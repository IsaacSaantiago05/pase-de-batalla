<?php

namespace App\Services;

use App\Models\BattlePassTier;
use App\Models\User;
use App\Models\UserBattlePassTier;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BattlePassService
{
    public function __construct(private readonly PointsService $pointsService)
    {
    }

    public function getProgress(User $user): array
    {
        // El progreso se mide con puntos ganados históricamente: canjear recompensas no hace retroceder el pase.
        $earnedPoints = $this->pointsService->getUserEarnedPoints($user);
        $balance = $this->pointsService->getUserBalance($user);
        $tiers = BattlePassTier::query()
            ->where('estado', true)
            ->orderBy('puntos_requeridos')
            ->get();

        $claimed = UserBattlePassTier::query()
            ->where('usuario_id', $user->id)
            ->get()
            ->keyBy('tier_id');

        $nextTier = $tiers->first(fn (BattlePassTier $tier) => $tier->puntos_requeridos > $earnedPoints);
        $maxTierPoints = (int) ($tiers->max('puntos_requeridos') ?? 0);

        $mappedTiers = $tiers->map(function (BattlePassTier $tier) use ($earnedPoints, $claimed): array {
            $tierClaim = $claimed->get($tier->id);

            // Un tier reclamado se conserva como reclamado sin importar los puntos actuales.
            $status = 'BLOQUEADO';
            if ($tierClaim?->estado === 'RECLAMADO') {
                $status = 'RECLAMADO';
            } elseif ($earnedPoints >= $tier->puntos_requeridos) {
                $status = 'DESBLOQUEADO';
            }

            return [
                'id' => $tier->id,
                'nombre' => $tier->nombre,
                'descripcion' => $tier->descripcion,
                'puntos_requeridos' => $tier->puntos_requeridos,
                'recompensa_nombre' => $tier->recompensa_nombre,
                'recompensa_descripcion' => $tier->recompensa_descripcion,
                'estado_usuario' => $status,
                'fecha_reclamo' => $tierClaim?->fecha_reclamo,
            ];
        })->values();

        $unlockedCount = $mappedTiers->filter(fn (array $tier) => in_array($tier['estado_usuario'], ['DESBLOQUEADO', 'RECLAMADO'], true))->count();

        $percentage = $maxTierPoints > 0
            ? round(min(100, ($earnedPoints / $maxTierPoints) * 100), 2)
            : 0;

        return [
            'puntos_actuales' => $balance,
            'puntos_acumulados' => $earnedPoints,
            'tiers_desbloqueados' => $unlockedCount,
            'tiers_totales' => $mappedTiers->count(),
            'progreso_porcentaje' => $percentage,
            'siguiente_hito_puntos' => $nextTier?->puntos_requeridos,
            'siguiente_hito_faltante' => $nextTier !== null ? max(0, $nextTier->puntos_requeridos - $earnedPoints) : 0,
            'tiers' => $mappedTiers,
        ];
    }

    public function claimTier(User $user, int $tierId): UserBattlePassTier
    {
        return DB::transaction(function () use ($user, $tierId) {
            $tier = BattlePassTier::query()->lockForUpdate()->find($tierId);
            if ($tier === null || ! $tier->estado) {
                throw new ModelNotFoundException('El tier del pase de batalla no existe o está inactivo.');
            }

            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $earnedPoints = $this->pointsService->getUserEarnedPoints($lockedUser);

            if ($earnedPoints < $tier->puntos_requeridos) {
                throw new RuntimeException('No tienes puntos suficientes para reclamar este tier.');
            }

            $userTier = UserBattlePassTier::query()
                ->lockForUpdate()
                ->firstOrNew([
                    'usuario_id' => $lockedUser->id,
                    'tier_id' => $tier->id,
                ]);

            if ($userTier->exists && $userTier->estado === 'RECLAMADO') {
                throw new RuntimeException('Este tier ya fue reclamado.');
            }

            $userTier->fill([
                'estado' => 'RECLAMADO',
                'fecha_desbloqueo' => $userTier->fecha_desbloqueo ?? now(),
                'fecha_reclamo' => now(),
            ]);
            $userTier->save();

            return $userTier->fresh()->load('tier');
        });
    }
}

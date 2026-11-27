<?php

namespace App\Services;

use App\Models\BattlePassTier;
use App\Models\PointMovement;
use App\Models\User;
use App\Models\UserBattlePassTier;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BattlePassService
{
    /** Tipo de movimiento de los puntos que entrega el pase: suman al saldo, pero no hacen subir de nivel. */
    public const BONUS_MOVEMENT = 'BONO_NIVEL';

    private const BADGE_NAMES = [
        'BRONCE' => 'Bronce',
        'PLATA' => 'Plata',
        'ORO' => 'Oro',
        'DIAMANTE' => 'Diamante',
    ];

    public function __construct(private readonly PointsService $pointsService)
    {
    }

    /**
     * Nivel del usuario. No se guarda: todos empiezan en el 1 y suben uno por cada nivel del pase
     * que alcanzan con sus puntos ganados (canjear no hace retroceder).
     */
    public function currentLevel(User $user): int
    {
        return $this->levelForPoints($this->pointsService->getUserEarnedPoints($user));
    }

    public function levelForPoints(int $earnedPoints): int
    {
        return 1 + BattlePassTier::query()->where('puntos_requeridos', '<=', $earnedPoints)->count();
    }

    public function getProgress(User $user): array
    {
        $earnedPoints = $this->pointsService->getUserEarnedPoints($user);
        $balance = $this->pointsService->getUserBalance($user);
        $tiers = BattlePassTier::query()->orderBy('nivel')->get();

        $claims = UserBattlePassTier::query()
            ->where('usuario_id', $user->id)
            ->get()
            ->keyBy('tier_id');

        $reached = $tiers->filter(fn (BattlePassTier $tier) => $tier->puntos_requeridos <= $earnedPoints);
        $pending = $reached->reject(fn (BattlePassTier $tier) => $claims->has($tier->id));
        $currentTier = $reached->last();
        $nextTier = $tiers->first(fn (BattlePassTier $tier) => $tier->puntos_requeridos > $earnedPoints);
        $currentBadge = $reached->last(fn (BattlePassTier $tier) => $tier->insignia !== null);
        $nextBadge = $tiers->first(fn (BattlePassTier $tier) => $tier->insignia !== null && $tier->puntos_requeridos > $earnedPoints);
        $maxTierPoints = (int) ($tiers->max('puntos_requeridos') ?? 0);
        $remaining = $nextTier !== null ? $nextTier->puntos_requeridos - $earnedPoints : 0;

        return [
            'puntos_actuales' => $balance,
            'puntos_acumulados' => $earnedPoints,
            'nivel_actual' => 1 + $reached->count(),
            'nivel_maximo' => (int) ($tiers->max('nivel') ?? 1),
            // Puntos ganados con los que empieza el nivel actual y con los que se alcanza el siguiente.
            'puntos_nivel_actual' => $currentTier?->puntos_requeridos ?? 0,
            'puntos_siguiente_nivel' => $nextTier?->puntos_requeridos,
            'faltante' => $remaining,
            'insignia_actual' => $currentBadge?->insignia,
            'siguiente_insignia' => $nextBadge === null ? null : [
                'nivel' => $nextBadge->nivel,
                'insignia' => $nextBadge->insignia,
                'puntos_requeridos' => $nextBadge->puntos_requeridos,
                'faltante' => $nextBadge->puntos_requeridos - $earnedPoints,
                'puntos_bono' => $nextBadge->puntos_bono,
            ],
            'niveles_por_reclamar' => $pending->count(),
            'puntos_por_reclamar' => (int) $pending->sum('puntos_bono'),
            'tiers_desbloqueados' => $reached->count(),
            'tiers_totales' => $tiers->count(),
            'progreso_porcentaje' => $maxTierPoints > 0
                ? round(min(100, ($earnedPoints / $maxTierPoints) * 100), 2)
                : 0,
            'siguiente_hito_puntos' => $nextTier?->puntos_requeridos,
            'siguiente_hito_faltante' => $remaining,
            'tiers' => $tiers->map(function (BattlePassTier $tier) use ($earnedPoints, $claims): array {
                $claim = $claims->get($tier->id);

                // Un nivel reclamado se conserva como reclamado sin importar los puntos actuales.
                $status = 'BLOQUEADO';
                if ($claim !== null) {
                    $status = 'RECLAMADO';
                } elseif ($earnedPoints >= $tier->puntos_requeridos) {
                    $status = 'DESBLOQUEADO';
                }

                return [
                    'id' => $tier->id,
                    'nivel' => $tier->nivel,
                    'puntos_requeridos' => $tier->puntos_requeridos,
                    'puntos_bono' => $tier->puntos_bono,
                    'insignia' => $tier->insignia,
                    'estado_usuario' => $status,
                    'fecha_reclamo' => $claim?->fecha_reclamo,
                ];
            })->values(),
        ];
    }

    /**
     * Reclama el bono de un nivel ya alcanzado. No hace falta reclamar en orden.
     *
     * @return array{niveles_reclamados: int, puntos_reclamados: int, saldo_global: int}
     */
    public function claimTier(User $user, BattlePassTier $tier): array
    {
        try {
            return DB::transaction(function () use ($user, $tier) {
                $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

                if ($this->pointsService->getUserEarnedPoints($lockedUser) < $tier->puntos_requeridos) {
                    throw new RuntimeException('Aún no alcanzas este nivel.');
                }

                $alreadyClaimed = UserBattlePassTier::query()
                    ->where('usuario_id', $lockedUser->id)
                    ->where('tier_id', $tier->id)
                    ->exists();

                if ($alreadyClaimed) {
                    throw new RuntimeException('Este nivel ya fue reclamado.');
                }

                return $this->grant($lockedUser, new Collection([$tier]));
            });
        } catch (UniqueConstraintViolationException) {
            // Dos reclamos simultaneos del mismo nivel: el indice unico deja pasar solo uno.
            throw new RuntimeException('Este nivel ya fue reclamado.');
        }
    }

    /**
     * Reclama de una vez todos los niveles alcanzados que siguen pendientes. Si no queda ninguno
     * no hace nada, asi un doble clic no da error ni acredita dos veces.
     *
     * @return array{niveles_reclamados: int, puntos_reclamados: int, saldo_global: int}
     */
    public function claimAll(User $user): array
    {
        try {
            return DB::transaction(function () use ($user) {
                $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
                $earnedPoints = $this->pointsService->getUserEarnedPoints($lockedUser);

                $claimedIds = UserBattlePassTier::query()
                    ->where('usuario_id', $lockedUser->id)
                    ->pluck('tier_id');

                $pending = BattlePassTier::query()
                    ->where('puntos_requeridos', '<=', $earnedPoints)
                    ->whereNotIn('id', $claimedIds)
                    ->orderBy('nivel')
                    ->get();

                return $this->grant($lockedUser, $pending);
            });
        } catch (UniqueConstraintViolationException) {
            throw new RuntimeException('Estos niveles ya fueron reclamados. Actualiza la pantalla.');
        }
    }

    /**
     * Marca los niveles como reclamados y acredita sus bonos en un solo movimiento de puntos.
     *
     * @param  Collection<int, BattlePassTier>  $tiers
     * @return array{niveles_reclamados: int, puntos_reclamados: int, saldo_global: int}
     */
    private function grant(User $user, Collection $tiers): array
    {
        $points = (int) $tiers->sum('puntos_bono');

        if ($tiers->isNotEmpty()) {
            $now = now();

            // Primero los reclamos: si otro proceso ya reclamo alguno, el indice unico cancela todo.
            UserBattlePassTier::query()->insert($tiers->map(fn (BattlePassTier $tier): array => [
                'usuario_id' => $user->id,
                'tier_id' => $tier->id,
                'puntos_bono' => $tier->puntos_bono,
                'fecha_reclamo' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());

            if ($points > 0) {
                PointMovement::query()->create([
                    'usuario_id' => $user->id,
                    'negocio_id' => null,
                    'qr_id' => null,
                    'cantidad' => $points,
                    'tipo' => self::BONUS_MOVEMENT,
                    'motivo' => $this->bonusReason($tiers),
                    'fecha' => $now,
                ]);
            }
        }

        return [
            'niveles_reclamados' => $tiers->count(),
            'puntos_reclamados' => $points,
            'saldo_global' => $this->pointsService->getUserBalance($user),
        ];
    }

    /**
     * Texto del movimiento: "Nivel 10 · Insignia Bronce" o "32 niveles (hasta el nivel 33) · Insignia Bronce".
     *
     * @param  Collection<int, BattlePassTier>  $tiers
     */
    private function bonusReason(Collection $tiers): string
    {
        $reason = $tiers->count() === 1
            ? 'Nivel '.$tiers->first()->nivel
            : $tiers->count().' niveles (hasta el nivel '.$tiers->max('nivel').')';

        $badges = $tiers->pluck('insignia')
            ->filter()
            ->map(fn (string $badge) => self::BADGE_NAMES[$badge] ?? $badge)
            ->values();

        if ($badges->isEmpty()) {
            return $reason;
        }

        return $reason.' · '.($badges->count() === 1 ? 'Insignia ' : 'Insignias ').$badges->join(', ', ' y ');
    }
}

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

    /**
     * Puntos ganados históricamente (sin restar canjes). Se usa para niveles y pase de batalla,
     * de modo que gastar puntos no haga retroceder al usuario.
     */
    public function getUserEarnedPoints(User $user): int
    {
        // Cuentan las ganancias y los ajustes manuales (con otorgado_por). Las devoluciones por
        // cancelación de canje también son AJUSTE, pero sin otorgado_por, y solo reponen el saldo.
        $earned = (int) PointMovement::query()
            ->where('usuario_id', $user->id)
            ->where(function ($query): void {
                $query->where('tipo', 'GANANCIA')
                    ->orWhere(fn ($adjustments) => $adjustments->where('tipo', 'AJUSTE')->whereNotNull('otorgado_por'));
            })
            ->sum('cantidad');

        return max(0, $earned);
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

            if (! $targetUser->hasRole('CLIENTE')) {
                throw new RuntimeException('Solo se pueden asignar puntos a clientes.');
            }

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

            $this->syncUserLevel($targetUser);

            return $movement;
        });
    }

    /**
     * Ajuste manual auditado: queda registrado quien lo hizo y por que. Nunca deja el saldo en negativo.
     */
    public function adjustPoints(User $actor, string $email, int $amount, string $reason, ?int $businessId = null): PointMovement
    {
        return DB::transaction(function () use ($actor, $email, $amount, $reason, $businessId) {
            $targetUser = User::query()->where('correo', $email)->lockForUpdate()->firstOrFail();

            if (! $targetUser->hasRole('CLIENTE')) {
                throw new RuntimeException('Solo se pueden ajustar puntos de clientes.');
            }

            $balance = $this->getUserBalance($targetUser);
            if ($balance + $amount < 0) {
                throw new RuntimeException("El ajuste dejaria el saldo en negativo (saldo actual: {$balance}).");
            }

            $movement = PointMovement::query()->create([
                'usuario_id' => $targetUser->id,
                'negocio_id' => $businessId,
                'otorgado_por' => $actor->id,
                'cantidad' => $amount,
                'tipo' => 'AJUSTE',
                'motivo' => $reason,
                'fecha' => now(),
            ]);

            $this->syncUserLevel($targetUser);

            return $movement;
        });
    }

    public function syncUserLevel(User $user): void
    {
        $earnedPoints = $this->getUserEarnedPoints($user);

        // Se toma el nivel más alto alcanzado; el último nivel queda abierto aunque se supere su máximo.
        $level = Level::query()
            ->where('estado', true)
            ->where('puntos_minimos', '<=', $earnedPoints)
            ->orderByDesc('puntos_minimos')
            ->first();


        $user->update([
            'nivel_id' => $level?->id,
        ]);
    }
}

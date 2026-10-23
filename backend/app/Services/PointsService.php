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

    /**
     * Puntos ganados en total (solo GANANCIA). Define nivel y pase de batalla:
     * canjear no baja de nivel y un ajuste manual no sube.
     */
    public function getEarnedPoints(User $user): int
    {
        return (int) PointMovement::query()
            ->where('usuario_id', $user->id)
            ->where('tipo', 'GANANCIA')
            ->sum('cantidad');
    }

    public function syncUserLevel(User $user): void
    {
        $balance = $this->getEarnedPoints($user);

        $level = Level::query()
            ->where('estado', true)
            ->where('puntos_minimos', '<=', $balance)
            ->where('puntos_maximos', '>=', $balance)
            ->orderByDesc('puntos_minimos')
            ->first();

        if (! $level) {
            // Fallback para saldos por encima del ultimo rango configurado.
            $level = Level::query()
                ->where('estado', true)
                ->where('puntos_minimos', '<=', $balance)
                ->orderByDesc('puntos_minimos')
                ->first();
        }

        $user->update([
            'nivel_id' => $level?->id,
        ]);
    }
}

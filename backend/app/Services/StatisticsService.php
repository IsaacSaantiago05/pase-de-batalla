<?php

namespace App\Services;

use App\Models\PointMovement;
use App\Models\QrCode;
use App\Models\User;
use Illuminate\Support\Carbon;

class StatisticsService
{
    /**
     * QR generados hoy, en los ultimos 7 dias y en los ultimos 30, para un negocio
     * o para toda la plataforma si $businessId es null. Los clientes activos solo
     * se incluyen cuando se piden (administrador general).
     */
    public function summary(?int $businessId, bool $includeClients): array
    {
        $periods = $this->periods();

        $data = [
            'negocio_id' => $businessId,
            'zona_horaria' => config('app.local_timezone'),
            'qr' => [],
        ];

        foreach ($periods as $name => $from) {
            $data['qr'][$name] = $this->qrSummary($businessId, $from);
        }

        if ($includeClients) {
            $data['clientes_activos'] = [];
            foreach ($periods as $name => $from) {
                $data['clientes_activos'][$name] = $this->activeClients($businessId, $from);
            }

            $data['clientes_registrados'] = User::query()
                ->whereHas('role', fn ($role) => $role->where('nombre', 'CLIENTE'))
                ->count();
        }

        return $data;
    }

    /**
     * Inicio de cada periodo. El dia se corta a medianoche en la zona horaria local
     * (no en UTC) y se convierte a la zona de la aplicacion para comparar con la base de datos.
     *
     * @return array<string, Carbon>
     */
    private function periods(): array
    {
        $today = now(config('app.local_timezone'))->startOfDay();
        $appTimezone = config('app.timezone');

        return [
            'hoy' => $today->copy()->setTimezone($appTimezone),
            'semana' => $today->copy()->subDays(6)->setTimezone($appTimezone),
            'mes' => $today->copy()->subDays(29)->setTimezone($appTimezone),
        ];
    }

    private function qrSummary(?int $businessId, Carbon $from): array
    {
        $query = QrCode::query()
            ->where('fecha_creacion', '>=', $from)
            ->when($businessId !== null, fn ($builder) => $builder->where('negocio_id', $businessId));

        $byStatus = (clone $query)->selectRaw('estado, COUNT(*) AS cantidad')->groupBy('estado')->pluck('cantidad', 'estado');
        // Un QR solo pasa a EXPIRADO cuando alguien intenta usarlo; los ACTIVO ya vencidos tambien cuentan como expirados.
        $staleActive = (clone $query)->where('estado', 'ACTIVO')->where('fecha_expiracion', '<=', now())->count();

        return [
            'generados' => (int) $byStatus->sum(),
            'utilizados' => (int) ($byStatus['UTILIZADO'] ?? 0),
            'expirados' => (int) ($byStatus['EXPIRADO'] ?? 0) + $staleActive,
            'cancelados' => (int) ($byStatus['CANCELADO'] ?? 0),
            'activos' => (int) ($byStatus['ACTIVO'] ?? 0) - $staleActive,
        ];
    }

    /**
     * Clientes distintos que ganaron puntos desde $from.
     */
    private function activeClients(?int $businessId, Carbon $from): int
    {
        return PointMovement::query()
            ->where('fecha', '>=', $from)
            ->where('tipo', 'GANANCIA')
            ->when($businessId !== null, fn ($builder) => $builder->where('negocio_id', $businessId))
            ->distinct()
            ->count('usuario_id');
    }
}

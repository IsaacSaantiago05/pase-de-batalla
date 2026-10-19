<?php

namespace App\Services;

use App\Models\Business;
use App\Models\PointMovement;
use App\Models\QrCode;
use App\Models\Redemption;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class StatisticsService
{
    /**
     * Resumen del periodo para un negocio, o de toda la plataforma si $businessId es null.
     */
    public function summary(?int $businessId, int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $scope = fn (Builder $query, string $column = 'negocio_id') => $businessId === null
            ? $query
            : $query->where($column, $businessId);

        $sales = $scope(Sale::query())->where('created_at', '>=', $from);
        $movements = $scope(PointMovement::query())->where('fecha', '>=', $from);
        $qr = $scope(QrCode::query())->where('created_at', '>=', $from);
        $redemptions = Redemption::query()
            ->where('fecha', '>=', $from)
            ->when($businessId !== null, fn ($query) => $query->whereHas('reward', fn ($reward) => $reward->where('negocio_id', $businessId)));

        $qrByStatus = (clone $qr)->selectRaw('estado, COUNT(*) AS total')->groupBy('estado')->pluck('total', 'estado');
        // Un QR solo pasa a EXPIRADO cuando alguien intenta usarlo; los ACTIVO vencidos tambien cuentan como expirados.
        $staleActive = (clone $qr)->where('estado', 'ACTIVO')->where('fecha_expiracion', '<=', now())->count();

        $data = [
            'periodo_dias' => $days,
            'desde' => $from->toDateString(),
            'negocio_id' => $businessId,
            'resumen' => [
                'ventas' => (clone $sales)->count(),
                'ingresos' => round((float) (clone $sales)->sum('total'), 2),
                'puntos_otorgados' => (int) (clone $movements)->where('tipo', 'GANANCIA')->sum('cantidad'),
                'puntos_canjeados' => abs((int) (clone $movements)->where('tipo', 'CANJE')->sum('cantidad')),
                'canjes' => (clone $redemptions)->where('estado', '!=', 'CANCELADO')->count(),
                'clientes_activos' => (clone $movements)->where('tipo', 'GANANCIA')->distinct()->count('usuario_id'),
                'qr' => [
                    'generados' => (int) $qrByStatus->sum(),
                    'utilizados' => (int) ($qrByStatus['UTILIZADO'] ?? 0),
                    'expirados' => (int) ($qrByStatus['EXPIRADO'] ?? 0) + $staleActive,
                    'cancelados' => (int) ($qrByStatus['CANCELADO'] ?? 0),
                    'activos' => (int) ($qrByStatus['ACTIVO'] ?? 0) - $staleActive,
                ],
            ],
            'por_dia' => $this->dailySeries($businessId, $from, $days),
            'top_productos' => $this->topProducts($businessId, $from),
        ];

        if ($businessId === null) {
            $data['resumen']['clientes_registrados'] = User::query()
                ->whereHas('role', fn ($role) => $role->where('nombre', 'CLIENTE'))
                ->count();
            $data['por_negocio'] = $this->perBusiness($from);
        }

        return $data;
    }

    private function dailySeries(?int $businessId, Carbon $from, int $days): array
    {
        $sales = Sale::query()
            ->where('created_at', '>=', $from)
            ->when($businessId !== null, fn ($query) => $query->where('negocio_id', $businessId))
            ->selectRaw('DATE(created_at) AS dia, COUNT(*) AS ventas, SUM(total) AS ingresos')
            ->groupBy('dia')
            ->get()
            ->keyBy(fn ($row) => (string) $row->dia);

        $points = PointMovement::query()
            ->where('fecha', '>=', $from)
            ->where('tipo', 'GANANCIA')
            ->when($businessId !== null, fn ($query) => $query->where('negocio_id', $businessId))
            ->selectRaw('DATE(fecha) AS dia, SUM(cantidad) AS puntos')
            ->groupBy('dia')
            ->pluck('puntos', 'dia');

        // Se rellenan los dias sin actividad con cero para que la serie no tenga huecos.
        $series = [];
        for ($offset = 0; $offset < $days; $offset++) {
            $day = $from->copy()->addDays($offset)->toDateString();
            $series[] = [
                'dia' => $day,
                'ventas' => (int) ($sales[$day]->ventas ?? 0),
                'ingresos' => round((float) ($sales[$day]->ingresos ?? 0), 2),
                'puntos_otorgados' => (int) ($points[$day] ?? 0),
            ];
        }

        return $series;
    }

    private function topProducts(?int $businessId, Carbon $from): array
    {
        return SaleItem::query()
            ->join('ventas', 'ventas.id', '=', 'venta_items.venta_id')
            ->where('ventas.created_at', '>=', $from)
            ->when($businessId !== null, fn ($query) => $query->where('ventas.negocio_id', $businessId))
            ->groupBy('venta_items.nombre')
            ->selectRaw('venta_items.nombre, SUM(venta_items.cantidad) AS unidades, SUM(venta_items.subtotal) AS ingresos, SUM(venta_items.puntos_subtotal) AS puntos')
            ->orderByDesc('unidades')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'nombre' => $row->nombre,
                'unidades' => (int) $row->unidades,
                'ingresos' => round((float) $row->ingresos, 2),
                'puntos' => (int) $row->puntos,
            ])
            ->all();
    }

    private function perBusiness(Carbon $from): array
    {
        $sales = Sale::query()
            ->where('created_at', '>=', $from)
            ->selectRaw('negocio_id, COUNT(*) AS ventas, SUM(total) AS ingresos')
            ->groupBy('negocio_id')
            ->get()
            ->keyBy('negocio_id');

        $points = PointMovement::query()
            ->where('fecha', '>=', $from)
            ->where('tipo', 'GANANCIA')
            ->whereNotNull('negocio_id')
            ->selectRaw('negocio_id, SUM(cantidad) AS puntos')
            ->groupBy('negocio_id')
            ->pluck('puntos', 'negocio_id');

        return Business::query()
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'estado'])
            ->map(fn (Business $business) => [
                'negocio_id' => $business->id,
                'nombre' => $business->nombre,
                'activo' => (bool) $business->estado,
                'ventas' => (int) ($sales[$business->id]->ventas ?? 0),
                'ingresos' => round((float) ($sales[$business->id]->ingresos ?? 0), 2),
                'puntos_otorgados' => (int) ($points[$business->id] ?? 0),
            ])
            ->all();
    }
}

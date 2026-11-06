<?php

namespace App\Http\Controllers;

use App\Models\PointMovement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessClientController extends Controller
{
    use ApiResponse;

    /**
     * Clientes de un negocio = quienes tienen movimientos de puntos en el (no hay tabla de vinculo).
     */
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $businessId = $actor->hasRole('ADMINISTRADOR_GENERAL')
            ? $request->integer('negocio_id')
            : (int) $actor->negocio_id;

        if ($businessId <= 0) {
            return $this->error('Debes indicar un negocio para consultar sus clientes.', null, 422);
        }

        $clients = PointMovement::query()
            ->join('usuarios', 'usuarios.id', '=', 'movimientos_puntos.usuario_id')
            ->where('movimientos_puntos.negocio_id', $businessId)
            ->groupBy('movimientos_puntos.usuario_id', 'usuarios.nombre', 'usuarios.correo')
            ->selectRaw('movimientos_puntos.usuario_id, usuarios.nombre, usuarios.correo')
            ->selectRaw("SUM(CASE WHEN movimientos_puntos.tipo = 'GANANCIA' THEN movimientos_puntos.cantidad ELSE 0 END) AS puntos_ganados")
            ->selectRaw("SUM(CASE WHEN movimientos_puntos.tipo = 'GANANCIA' THEN 1 ELSE 0 END) AS visitas")
            ->selectRaw('MAX(movimientos_puntos.fecha) AS ultima_visita')
            ->orderByDesc('ultima_visita')
            ->paginate(20);

        $rows = collect($clients->items())->map(fn ($row) => [
            'usuario_id' => (int) $row->usuario_id,
            'nombre' => $row->nombre,
            'correo' => $row->correo,
            'puntos_ganados' => (int) $row->puntos_ganados,
            'visitas' => (int) $row->visitas,
            'ultima_visita' => $row->ultima_visita,
        ]);

        return $this->success('Clientes del negocio obtenidos correctamente.', $rows);
    }
}

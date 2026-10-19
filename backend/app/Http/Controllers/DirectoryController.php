<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class DirectoryController extends Controller
{
    use ApiResponse;

    /**
     * Negocios participantes visibles para cualquier usuario autenticado: solo activos y datos publicos.
     */
    public function businesses(): JsonResponse
    {
        $businesses = Business::query()
            ->where('estado', true)
            ->withCount(['products as productos_activos' => fn ($query) => $query->where('estado', true)])
            ->orderBy('nombre')
            ->get()
            ->map(fn (Business $business) => [
                'id' => $business->id,
                'nombre' => $business->nombre,
                'descripcion' => $business->descripcion,
                'direccion' => $business->direccion,
                'telefono' => $business->telefono,
                'logo' => $business->logo,
                'productos_activos' => $business->productos_activos,
            ]);

        return $this->success('Negocios participantes obtenidos correctamente.', $businesses);
    }
}

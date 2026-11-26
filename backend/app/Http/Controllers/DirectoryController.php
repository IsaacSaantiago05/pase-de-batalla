<?php

namespace App\Http\Controllers;

use App\Http\Resources\BusinessProfileResource;
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
            ->get();

        return $this->success('Negocios participantes obtenidos correctamente.', BusinessProfileResource::collection($businesses));
    }

    /**
     * Perfil publico de un negocio: portada, foto de perfil, datos de contacto y enlaces.
     */
    public function business(Business $business): JsonResponse
    {
        // Un negocio desactivado no existe para los clientes.
        if (! $business->estado) {
            return $this->error('Negocio no encontrado.', null, 404);
        }

        $business->loadCount(['products as productos_activos' => fn ($query) => $query->where('estado', true)]);

        return $this->success('Negocio obtenido correctamente.', new BusinessProfileResource($business));
    }
}

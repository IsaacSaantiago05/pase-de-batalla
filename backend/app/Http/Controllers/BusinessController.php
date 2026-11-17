<?php

namespace App\Http\Controllers;

use App\Http\Requests\Business\StoreBusinessRequest;
use App\Http\Requests\Business\UpdateBusinessRequest;
use App\Http\Resources\BusinessResource;
use App\Models\Business;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Business::query()->orderBy('nombre');

        // El administrador de negocio solo ve el suyo.
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->whereKey($request->user()->negocio_id);
        }

        $businesses = $query->paginate(20);

        return $this->success('Negocios listados correctamente.', BusinessResource::collection($businesses));
    }

    public function show(Request $request, Business $business): JsonResponse
    {
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && $request->user()->negocio_id !== $business->id) {
            return $this->error('No tienes permiso para acceder a este negocio.', null, 403);
        }

        return $this->success('Negocio obtenido correctamente.', new BusinessResource($business));
    }

    public function store(StoreBusinessRequest $request): JsonResponse
    {
        $business = Business::query()->create([
            ...$request->validated(),
            'fecha_registro' => now(),
            'estado' => $request->validated()['estado'] ?? true,
        ]);

        return $this->success('Negocio creado correctamente.', new BusinessResource($business), 201);
    }

    public function update(UpdateBusinessRequest $request, Business $business): JsonResponse
    {
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && $request->user()->negocio_id !== $business->id) {
            return $this->error('No tienes permiso para editar este negocio.', null, 403);
        }

        // Activar o desactivar un negocio es exclusivo del administrador general.
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && array_key_exists('estado', $request->validated())) {
            return $this->error('Solo el administrador general puede activar o desactivar negocios.', null, 403);
        }

        $business->update($request->validated());

        return $this->success('Negocio actualizado correctamente.', new BusinessResource($business->fresh()));
    }

    public function updateStatus(Request $request, Business $business): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $business->update(['estado' => $validated['estado']]);

        return $this->success('Estado del negocio actualizado correctamente.', new BusinessResource($business->fresh()));
    }
}

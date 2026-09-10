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

    public function index(): JsonResponse
    {
        $businesses = Business::query()->paginate(20);

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

        $business->update($request->validated());

        return $this->success('Negocio actualizado correctamente.', new BusinessResource($business->fresh()));
    }

    public function updateStatus(Request $request, Business $business): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && $request->user()->negocio_id !== $business->id) {
            return $this->error('No tienes permiso para modificar este negocio.', null, 403);
        }

        $business->update(['estado' => $validated['estado']]);

        return $this->success('Estado del negocio actualizado correctamente.', new BusinessResource($business->fresh()));
    }
}

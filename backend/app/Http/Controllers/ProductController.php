<?php

namespace App\Http\Controllers;

use App\Http\Requests\Catalog\StoreProductRequest;
use App\Http\Requests\Catalog\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        $query = Product::query()->orderByDesc('id');

        if ($actor->hasRole('CLIENTE')) {
            $query->where('estado', true)
                ->whereHas('business', fn ($business) => $business->where('estado', true));
            if ($request->filled('negocio_id')) {
                $query->where('negocio_id', $request->integer('negocio_id'));
            }
        } elseif ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->where('negocio_id', $actor->negocio_id);
        } elseif ($request->filled('negocio_id')) {
            $query->where('negocio_id', $request->integer('negocio_id'));
        }

        return $this->success('Productos obtenidos correctamente.', ProductResource::collection($query->paginate(20)));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $actor = $request->user();

        if ($actor->negocio_id === null) {
            return $this->error('El administrador no tiene negocio asignado.', null, 422);
        }

        $validated = $request->validated();

        $product = Product::query()->create([
            'negocio_id' => $actor->negocio_id,
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'precio' => $validated['precio'],
            'puntos' => (int) $validated['puntos'],
            'estado' => ($validated['estado'] ?? null) !== null ? (bool) $validated['estado'] : true,
        ]);

        return $this->success('Producto creado correctamente.', new ProductResource($product), 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        $product->update($request->validated());

        return $this->success('Producto actualizado correctamente.', new ProductResource($product->fresh()));
    }

    public function updateStatus(Request $request, Product $product): JsonResponse
    {
        Gate::authorize('updateStatus', $product);

        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $product->update(['estado' => (bool) $validated['estado']]);

        return $this->success('Estado del producto actualizado correctamente.', new ProductResource($product->fresh()));
    }
}

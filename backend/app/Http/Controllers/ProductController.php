<?php

namespace App\Http\Controllers;

use App\Http\Requests\Catalog\StoreProductRequest;
use App\Http\Requests\Catalog\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        // Los productos con 7 dias inactivos ya no se listan (ver Product::scopeWithoutExpired).
        $query = Product::query()->withoutExpired()->with('business:id,nombre')->orderByDesc('id');

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

        // ?activos=1 deja solo los productos activos (los botones de generar QR).
        if ($request->boolean('activos')) {
            $query->where('estado', true);
        }

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        return $this->success('Productos obtenidos correctamente.', ProductResource::collection($query->paginate($perPage)));
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
            'puntos' => (int) $validated['puntos'],
            'estado' => ($validated['estado'] ?? null) !== null ? (bool) $validated['estado'] : true,
        ]);

        return $this->success('Producto creado correctamente.', new ProductResource($product), 201);
    }

    /**
     * Editar nombre, descripcion, puntos o estado: el administrador general, o el de negocio sobre sus propios productos.
     * Las ventas y los QR ya generados guardan su propia copia del nombre y los puntos, asi que no cambian.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $product->negocio_id) {
            return $this->error('No puedes modificar productos de otro negocio.', null, 403);
        }

        $product->update($request->validated());

        return $this->success('Producto actualizado correctamente.', new ProductResource($product->fresh()));
    }

    /**
     * Activar o desactivar: el administrador general, o el de negocio sobre sus propios productos.
     * Un producto inactivo no genera QR y se elimina solo a los 7 dias.
     */
    public function updateStatus(Request $request, Product $product): JsonResponse
    {
        $actor = $request->user();
        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO') && $actor->negocio_id !== $product->negocio_id) {
            return $this->error('No puedes modificar productos de otro negocio.', null, 403);
        }

        $validated = $request->validate([
            'estado' => ['required', 'boolean'],
        ]);

        $product->update(['estado' => (bool) $validated['estado']]);

        return $this->success('Estado del producto actualizado correctamente.', new ProductResource($product->fresh()));
    }
}

<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SaleService
{
    public function __construct(private readonly QrService $qrService)
    {
    }

    public function listForActor(User $actor, ?int $businessId, int $perPage = 20): LengthAwarePaginator
    {
        $query = Sale::query()->with(['items', 'qrCode'])->orderByDesc('id');

        if ($actor->hasRole('ADMINISTRADOR_NEGOCIO')) {
            $query->where('negocio_id', $actor->negocio_id);
        } elseif ($businessId !== null) {
            $query->where('negocio_id', $businessId);
        }

        return $query->paginate($perPage);
    }

    /**
     * Registra la venta con una copia fija de cada producto y genera su QR de un solo uso.
     *
     * @param  array<int, array{producto_id: int, cantidad: int}>  $items
     */
    public function create(User $actor, array $items): Sale
    {
        if ($actor->negocio_id === null) {
            throw new RuntimeException('El administrador no tiene negocio asignado.');
        }

        $quantities = [];
        foreach ($items as $item) {
            $productId = (int) $item['producto_id'];
            $quantities[$productId] = ($quantities[$productId] ?? 0) + (int) $item['cantidad'];
        }

        return DB::transaction(function () use ($actor, $quantities) {
            $products = Product::query()
                ->whereIn('id', array_keys($quantities))
                ->where('negocio_id', $actor->negocio_id)
                ->where('estado', true)
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($quantities)) {
                throw new RuntimeException('Hay productos inactivos o que no pertenecen a tu negocio.');
            }

            $total = 0.0;
            $points = 0;
            $rows = [];

            foreach ($quantities as $productId => $quantity) {
                $product = $products[$productId];
                $subtotal = round((float) $product->precio * $quantity, 2);
                $subtotalPoints = $product->puntos * $quantity;
                $total += $subtotal;
                $points += $subtotalPoints;

                $rows[] = [
                    'producto_id' => $product->id,
                    'nombre' => $product->nombre,
                    'precio_unitario' => $product->precio,
                    'puntos_unitarios' => $product->puntos,
                    'cantidad' => $quantity,
                    'subtotal' => $subtotal,
                    'puntos_subtotal' => $subtotalPoints,
                ];
            }

            $sale = Sale::query()->create([
                'negocio_id' => $actor->negocio_id,
                'creado_por' => $actor->id,
                'total' => round($total, 2),
                'puntos_total' => $points,
            ]);

            $sale->items()->createMany($rows);
            $this->qrService->generate($actor, $points, null, $sale->id);

            return $sale->load(['items', 'qrCode']);
        });
    }
}

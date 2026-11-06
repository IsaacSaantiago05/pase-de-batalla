<?php

namespace App\Http\Resources;

use App\Http\Resources\Points\QrCodeResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'creado_por' => $this->creado_por,
            'total' => $this->total,
            'puntos_total' => $this->puntos_total,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'producto_id' => $item->producto_id,
                'nombre' => $item->nombre,
                'precio_unitario' => $item->precio_unitario,
                'puntos_unitarios' => $item->puntos_unitarios,
                'cantidad' => $item->cantidad,
                'subtotal' => $item->subtotal,
                'puntos_subtotal' => $item->puntos_subtotal,
            ])->values()),
            'qr' => $this->whenLoaded('qrCode', fn () => $this->qrCode ? new QrCodeResource($this->qrCode) : null),
            'created_at' => $this->created_at,
        ];
    }
}

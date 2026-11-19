<?php

namespace App\Http\Resources\Points;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QrCodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'negocio_nombre' => $this->whenLoaded('business', fn () => $this->business?->nombre),
            'venta_id' => $this->venta_id,
            // Productos que originaron el QR; lista vacia si se genero por cantidad de puntos.
            'productos' => $this->when(
                $this->resource->relationLoaded('sale'),
                fn () => $this->sale?->items->map(fn ($item) => [
                    'nombre' => $item->nombre,
                    'cantidad' => $item->cantidad,
                ])->values() ?? [],
            ),
            'token' => $this->token,
            'puntos' => $this->puntos,
            'estado' => $this->estado,
            'fecha_creacion' => $this->fecha_creacion,
            'fecha_expiracion' => $this->fecha_expiracion,
            'fecha_uso' => $this->fecha_uso,
            'usuario_id' => $this->usuario_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RewardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'puntos_requeridos' => $this->puntos_requeridos,
            'cantidad_disponible' => $this->cantidad_disponible,
            'estado' => $this->estado,
            'fecha_registro_negocio' => $this->whenLoaded('business', fn () => $this->business?->fecha_registro),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

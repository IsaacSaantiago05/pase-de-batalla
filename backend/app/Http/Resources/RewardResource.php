<?php

namespace App\Http\Resources;

use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RewardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'negocio_nombre' => $this->whenLoaded('business', fn () => $this->business?->nombre),
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'foto_url' => MediaStorage::url($this->foto),
            'puntos_requeridos' => $this->puntos_requeridos,
            'cantidad_disponible' => $this->cantidad_disponible,
            'estado' => $this->estado,
            'fecha_registro_negocio' => $this->whenLoaded('business', fn () => $this->business?->fecha_registro),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

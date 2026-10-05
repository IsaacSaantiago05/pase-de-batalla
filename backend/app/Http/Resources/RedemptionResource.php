<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RedemptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'usuario_id' => $this->usuario_id,
            'usuario_nombre' => $this->whenLoaded('user', fn () => $this->user?->nombre),
            'recompensa_id' => $this->recompensa_id,
            'recompensa_nombre' => $this->whenLoaded('reward', fn () => $this->reward?->nombre),
            'negocio_id' => $this->whenLoaded('reward', fn () => $this->reward?->negocio_id),
            'puntos_utilizados' => $this->puntos_utilizados,
            'estado' => $this->estado,
            'fecha' => $this->fecha,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

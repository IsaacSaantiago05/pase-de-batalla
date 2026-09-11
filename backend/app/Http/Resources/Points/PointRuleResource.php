<?php

namespace App\Http\Resources\Points;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PointRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'monto_minimo' => (float) $this->monto_minimo,
            'monto_maximo' => (float) $this->monto_maximo,
            'puntos' => $this->puntos,
            'estado' => $this->estado,
        ];
    }
}
